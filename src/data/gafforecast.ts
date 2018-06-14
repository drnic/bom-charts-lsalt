import * as request from 'request';
import * as turf from '@turf/helpers';
import * as turfintersect from '@turf/intersect';
import * as backend from './backend';
import * as gaf from './gaf';
import * as lsalt from './lsalt';
import * as maparea from './maparea';

export let forecasts: { [gafAreaCode: string]: GAFPeriods} = {};
export let mapareas: { [gafAreaCode: string]: maparea.MapArea[] } = {};

/**
 * Hourly update of current/next Graphical Area Forecasts (GAF)
 */
export function update() {
  Object.keys(gaf.Period).forEach((period) => {
    gaf.areaCodes.forEach(gafAreaCode => {
      let url = backend.url(`/api/gafarea/${gafAreaCode}/${period}.json`);

      request(url, (error, response, body) => {
        let forecastData : GAFAreaForecast = JSON.parse(body);

        forecasts[gafAreaCode] = forecasts[gafAreaCode] || {};
        forecasts[gafAreaCode][forecastData.from.toString()] = forecastData;
        console.log(`${forecastData.gaf_area_id} ${forecastData.from} - ${lsalt.ready}`);

        // create MapAreas
        mapareas[gafAreaCode] = buildMapAreas(forecastData);

        // slice up MapAreas with LSALT grids
        updateLSALT(gafAreaCode, mapareas[gafAreaCode]);
      });
    });
  })
}

function updateLSALT(gafAreaCode: string, mapAreas: maparea.MapArea[], nightVFR?: boolean) {
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

      console.log(lsaltIntersection.geometry.coordinates);
    });
  });
}

function buildMapAreas(areaForecast: GAFAreaForecast) : maparea.MapArea[] {
  let result: maparea.MapArea[] = [];

  areaForecast.areas.forEach((gafarea: Area) => {
    let majorArea = new maparea.MajorArea(areaForecast.gaf_area_id, gafarea);
    result.push(majorArea);

    majorArea.gafMajorArea.sub_areas.forEach((subarea: SubArea) => {
      let mapSubArea = new maparea.SubArea(majorArea, subarea);
      result.push(mapSubArea);
    });
  });

  return result;
}

export type GAFPeriods = { [fromUTC: string]: GAFAreaForecast };

export interface GAFAreaForecast {
  page_code: string;
  gaf_area_id: string;
  from: Date;
  till: Date;
  issued_at: Date;
  standard_inclusion: string;
  areas: Area[];
  boundary: Boundary;
}

export interface Boundary {
  points: number[][];
}

export interface CloudLayer {
    amount: string;
    type: string;
    base: number;
    top: number;
    night_only_base: number;
    night_only_top: number;
    cumulus: boolean;
}

export interface SurfaceVisWx {
    text: string;
    surface_vis: number;
    sub_areas_mentioned: string[];
}

export interface CloudIceTurb {
    text: string;
    parsed: ParsedCloudLayer;
    sub_areas_mentioned: string[];
}

export interface ParsedCloudLayer {
  cloud: CloudLayer;
}

export interface WxCond {
    surface_vis_wx: SurfaceVisWx;
    cloud_ice_turb: CloudIceTurb[];
}

export interface Area {
    area_id: string;
    wx_cond: WxCond[];
    freezing_level: string;
    boundary: Boundary;
    day_cloud_base: number;
    day_cloud_top: number;
    night_cloud_base: number;
    night_cloud_top: number;
    sub_areas: SubArea[];
}

export interface SubArea {
  area_id: string;
  sub_area_id: string;
  boundary: Boundary;
  day_cloud_base: number;
  day_cloud_top: number;
  night_cloud_base: number;
  night_cloud_top: number;
}

export interface CommonArea {
  area_id: string;
  boundary: Boundary;
  day_cloud_base: number;
  day_cloud_top: number;
  night_cloud_base: number;
  night_cloud_top: number;
}