import * as request from 'request';
import * as turf from '@turf/helpers';
import * as turfintersect from '@turf/intersect';
import * as turfenvelope from '@turf/envelope';

import * as backend from './data/backend';
import * as gaf from './data/gaf';
import * as lsalt from './data/lsalt';
import * as maparea from './data/maparea';
import * as skyvector from './helpers/skyvector';

export type MapAreasByGroup = { [gafAreaCode: string]: maparea.MapArea[] };
export let mapareasByPeriod: { [period: string] : MapAreasByGroup } = {};

export let forecasts: { [gafAreaCode: string]: gaf.Periods} = {};

export let dayMapAreaLSALT: turf.Feature[] = [];
export let nightMapAreaLSALT: turf.Feature[] = [];

let gridID = 1;

export interface DateRange {
  from: string | Date;
  until: string | Date;
}
export let dateRangesByFrom : { [from: string] : DateRange };


/**
 * Hourly update of current/next Graphical Area Forecasts (GAF)
 */
export function update() {
  dayMapAreaLSALT = [];
  nightMapAreaLSALT = [];
  dateRangesByFrom = {};
  gridID = 1;

  Object.keys(gaf.Period).forEach((periodStr) => {
    let period = gaf.toPeriod(periodStr);
    mapareasByPeriod[periodStr] = {};

    gaf.areaCodes.forEach(gafAreaCode => {
      let url = backend.url(`/api/gafarea/${gafAreaCode}/${period}.json`);

      request(url, (error, response, body) => {
        let forecastData : gaf.AreaForecast = JSON.parse(body);
        dateRangesByFrom[forecastData.from] = {
          from: forecastData.from,
          until: forecastData.till
        }

        forecasts[gafAreaCode] = forecasts[gafAreaCode] || {};
        forecasts[gafAreaCode][forecastData.from.toString()] = forecastData;
        console.log(`${forecastData.gaf_area_id} ${forecastData.from} - ${lsalt.ready}`);

        // create MapAreas
        mapareasByPeriod[period][gafAreaCode] = buildMapAreas(forecastData);

        // slice up MapAreas with LSALT grids for day & night
        updateLSALTFeatures(gafAreaCode, false, period);
        updateLSALTFeatures(gafAreaCode, true, period);
      });
    });
  })
}

/**
 * Date ranges of available GAF periods, sorted from earliest to latest
 */
export function dateRanges() : DateRange[] {
  return Object.values(dateRangesByFrom).sort((d1, d2) => {
    if (d1.from < d2.from) {
      return -1;
    } else if (d1.from == d2.from) {
      return 0;
    }
    return 1;
  });
}

/**
 * GAF Major/Sub Areas, their geometries and WX for a given time period
 * @param period Use GAF period
 */
export function mapAreasForPeriod(period: gaf.Period) : MapAreasByGroup {
  return mapareasByPeriod[period];
}
/**
 * Subset of LSALT grids indicating the gap between lowest cloud layer and LSALT height.
 * @param nightVFR If true, pilots must fly 1000-1360' above highest point in each LSALT grid. If false, pilots can fly lower and clouds can be lower.
 */
export function lsaltFeatureCollection(nightVFR: boolean) : turf.FeatureCollection {
  let mapAreaLSALT = nightVFR ? nightMapAreaLSALT : dayMapAreaLSALT;

  return turf.featureCollection(mapAreaLSALT);
}

/**
 * Nationwide GAFs for a specific time period
 * @param from TODO: Use GAF period that includes this timestamp; if string, then format "2018-06-14T23:00:00Z"
 */
export function gafAreasFeatureCollection(period: gaf.Period) : turf.FeatureCollection {
  let features : turf.Feature[] = [];
  Object.entries(mapAreasForPeriod(period)).forEach(
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
export function gafAreasEnvelopeFeatureCollection(period: gaf.Period) : turf.FeatureCollection {
  let combinedAreas : turf.Feature[] = [];

  Object.entries(combinedMapAreas(period)).forEach(
    ([groupLabel, areas]) => {
      var areaBoundaryPoints: turf.Feature[] = areas.reduce((points, area) => {
        let featurePoints = area.boundaryPoints().map((point: number[]) => {
          return turf.point(point);
        })
        return points.concat(featurePoints);
      }, []);

      let feature = turfenvelope.default(turf.featureCollection(areaBoundaryPoints));
      feature.properties["groupLabel"] = groupLabel;
      combinedAreas.push(feature);
    }
  );

  return turf.featureCollection(combinedAreas);
}

export function majorAreas(period?: gaf.Period) : maparea.MapArea[] {
  let list : maparea.MapArea[] = [];
  Object.entries(mapAreasForPeriod(period)).forEach(
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

function updateLSALTFeatures(gafAreaCode: string, nightVFR: boolean, period: gaf.Period) {
  // Disabling VIC today due to https://github.com/w8r/martinez/issues/74#issuecomment-397911190
  if (gafAreaCode === "VIC") {
    return;
  }
  let mapAreas = mapAreasForPeriod(period)[gafAreaCode];
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


// TODO: This doesn't seem as good as https://github.com/drnic/bom-charts/blob/master/public/gaf2/js/gaftable.js#L46-L48
function combinedMapAreas(period: gaf.Period) : MapAreasByGroup {
  let combined : MapAreasByGroup = {};
  Object.entries(mapAreasForPeriod(period)).forEach(
    ([gafAreaCode, areas]) => {
      areas.forEach((mapArea: maparea.MapArea) => {
        let groupLabel = mapArea.groupLabel();
        combined[groupLabel] = combined[groupLabel] || [];
        combined[groupLabel].push(mapArea);
      })
    }
  );
  return combined;
}