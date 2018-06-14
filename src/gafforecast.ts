import * as request from 'request';
import * as turf from '@turf/helpers';
import * as turfintersect from '@turf/intersect';
import * as backend from './data/backend';
import * as gaf from './data/gaf';
import * as lsalt from './data/lsalt';
import * as maparea from './data/maparea';

export let forecasts: { [gafAreaCode: string]: gaf.Periods} = {};
export let mapareas: { [gafAreaCode: string]: maparea.MapArea[] } = {};
export let dayMapAreaLSALT: turf.Feature[] = [];
export let nightMapAreaLSALT: turf.Feature[] = [];

/**
 * Hourly update of current/next Graphical Area Forecasts (GAF)
 */
export function update() {
  dayMapAreaLSALT = [];
  nightMapAreaLSALT = [];

  Object.keys(gaf.Period).forEach((period) => {
    gaf.areaCodes.forEach(gafAreaCode => {
      let url = backend.url(`/api/gafarea/${gafAreaCode}/${period}.json`);

      request(url, (error, response, body) => {
        let forecastData : gaf.AreaForecast = JSON.parse(body);

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

export function lsaltFeatureCollection(nightVFR?: boolean) : turf.FeatureCollection {
  let mapAreaLSALT = nightVFR ? nightMapAreaLSALT : dayMapAreaLSALT;

  return turf.featureCollection(mapAreaLSALT);
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
      var cloudBaseLSALTDelta = areaCloudLayerBase - (lsalt * 100);
      var layerColourIndex = Math.round(cloudBaseLSALTDelta / 1000);

      lsaltIntersection.properties["lsalt_100ft"] = lsalt;
      lsaltIntersection.properties["lsalt_color_level"] = layerColourIndex;
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

