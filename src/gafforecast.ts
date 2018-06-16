import * as request from 'request';
import * as turf from '@turf/helpers';
import * as turfintersect from '@turf/intersect';
import * as turfenvelope from '@turf/envelope';

import * as backend from './data/backend';
import * as gaf from './data/gaf';
import * as lsalt from './data/lsalt';
import * as maparea from './data/maparea';

export let forecasts: { [gafAreaCode: string]: gaf.Periods} = {};
export let mapareas: { [gafAreaCode: string]: maparea.MapArea[] } = {};
export let dayMapAreaLSALT: turf.Feature[] = [];
export let nightMapAreaLSALT: turf.Feature[] = [];

let gridID = 1;

export interface DateRange {
  from: string | Date;
  until: string | Date;
}
export let dateRanges : DateRange[];


/**
 * Hourly update of current/next Graphical Area Forecasts (GAF)
 */
export function update() {
  dayMapAreaLSALT = [];
  nightMapAreaLSALT = [];
  dateRanges = [];
  let dateRangesSeen : { [d: string] : boolean } = {};
  gridID = 1;

  Object.keys(gaf.Period).forEach((period) => {
    gaf.areaCodes.forEach(gafAreaCode => {
      let url = backend.url(`/api/gafarea/${gafAreaCode}/${period}.json`);

      request(url, (error, response, body) => {
        let forecastData : gaf.AreaForecast = JSON.parse(body);
        if (!dateRangesSeen[forecastData.from]) {
          dateRanges.push({
            from: forecastData.from,
            until: forecastData.till
          });
          dateRangesSeen[forecastData.from] = true;
        }

        forecasts[gafAreaCode] = forecasts[gafAreaCode] || {};
        forecasts[gafAreaCode][forecastData.from.toString()] = forecastData;
        console.log(`${forecastData.gaf_area_id} ${forecastData.from} - ${lsalt.ready}`);

        // create MapAreas
        mapareas[gafAreaCode] = buildMapAreas(forecastData);

        // slice up MapAreas with LSALT grids for day & night
        updateLSALTFeatures(gafAreaCode);
        updateLSALTFeatures(gafAreaCode, true);
      });
    });
  })
}

/**
 * Subset of LSALT grids indicating the gap between lowest cloud layer and LSALT height.
 * @param nightVFR If true, pilots must fly 1000-1360' above highest point in each LSALT grid. If false, pilots can fly lower and clouds can be lower.
 * @param from TODO: Use GAF period that includes this timestamp; if string, then format "2018-06-14T23:00:00Z"
 */
export function lsaltFeatureCollection(nightVFR?: boolean, from?: string | Date) : turf.FeatureCollection {
  let mapAreaLSALT = nightVFR ? nightMapAreaLSALT : dayMapAreaLSALT;

  return turf.featureCollection(mapAreaLSALT);
}

/**
 * Nationwide GAFs for a specific time period
 * @param from TODO: Use GAF period that includes this timestamp; if string, then format "2018-06-14T23:00:00Z"
 */
export function gafAreasFeatureCollection(from?: string | Date) : turf.FeatureCollection {
  let features : turf.Feature[] = [];
  Object.entries(mapareas).forEach(
    ([gafAreaCode, areas]) => {
      areas.forEach((mapArea: maparea.MapArea) => {
        features.push(mapArea.asFeature());
      })
    }
  );

  return turf.featureCollection(features);
}

/**
 * Rectangular envelope of all MajorArea + SubArea polygons
 * @param from TODO: Use GAF period that includes this timestamp; if string, then format "2018-06-14T23:00:00Z"
 */
export function gafAreasEnvelopeFeatureCollection(from?: string | Date) : turf.FeatureCollection {
  let combinedAreas : turf.Feature[] = [];

  Object.entries(mapareas).forEach(
    ([gafAreaCode, areas]) => {
      var areaBoundaryPoints: turf.Feature[] = areas.reduce((points, area) => {
        let featurePoints = area.boundaryPoints().map((point) => {
          return turf.point(point);
        })
        return points.concat(featurePoints);
      }, []);

      let feature = turfenvelope.default(turf.featureCollection(areaBoundaryPoints));
      feature.properties["gafAreaCode"] = gafAreaCode;
      combinedAreas.push(feature);
    }
  );

  return turf.featureCollection(combinedAreas);
}

export function majorAreas() : maparea.MapArea[] {
  let list : maparea.MapArea[] = [];
  Object.entries(mapareas).forEach(
    ([gafAreaCode, areas]) => {
      areas.forEach((mapArea: maparea.MapArea) => {
        if (!mapArea.isSubArea()) {
          list.push(mapArea);
        }
      })
    }
  );
  return list;
}

function updateLSALTFeatures(gafAreaCode: string, nightVFR?: boolean) {
  let mapAreas = mapareas[gafAreaCode];
  let mapAreaLSALT = nightVFR ? nightMapAreaLSALT : dayMapAreaLSALT;

  lsalt.data[gafAreaCode].forEach(lsaltGrid => {
    var grid = lsaltGrid.grid;
    var lsalt = lsaltGrid.lsalt_100ft;
    if (!nightVFR) {
      // assume pilot can see highest object; and that LSALT is 1300' higher than highest object
      lsalt -= 13;
    }

    var lsaltPolygon = turf.polygon([grid]);

    mapAreas.forEach(mapArea => {
      var mapAreaPolygon = mapArea.turfPolygon();

      var lsaltIntersection = turfintersect.default(mapAreaPolygon, lsaltPolygon)
      if (!lsaltIntersection) {
        return;
      }

      var areaCloudLayerBase = mapArea.cloudBase() === undefined ? 10000 : mapArea.cloudBase();
      areaCloudLayerBase = Math.min(10000, areaCloudLayerBase);
      var cloudBaseLSALTDelta = areaCloudLayerBase - (lsalt * 100);
      var layerColourIndex = Math.round(cloudBaseLSALTDelta / 1000);
      var boundedIndex = Math.min(3, Math.max(0, layerColourIndex));

      lsaltIntersection.properties["id"] = gridID;
      gridID += 1;
      lsaltIntersection.properties["lsalt"] = lsalt * 100;
      lsaltIntersection.properties["cloudBase"] = areaCloudLayerBase;
      lsaltIntersection.properties["lsaltColorLevel"] = layerColourIndex;
      lsaltIntersection.properties["lsaltColorLevelSameAsArea"] = mapArea.lsaltColorLevel() == boundedIndex ? 1 : 0;
      mapAreaLSALT.push(lsaltIntersection);
    });
  });
}

function buildMapAreas(areaForecast: gaf.AreaForecast) : maparea.MapArea[] {
  let result: maparea.MapArea[] = [];

  areaForecast.areas.forEach((gafarea: gaf.Area) => {
    let majorArea = new maparea.MajorArea(areaForecast.gaf_area_id, gafarea);
    result.push(majorArea);

    majorArea.gafMajorArea.sub_areas.forEach((subarea: gaf.SubArea) => {
      let mapSubArea = new maparea.SubArea(majorArea, subarea);
      result.push(mapSubArea);
    });
  });

  return result;
}

