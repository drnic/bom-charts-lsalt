import * as request from 'request';
import * as backend from './backend';
import * as gaf from './gaf';
import * as lsalt from './lsalt';

export let data: { [gafAreaCode: string]: GAFPeriods} = {};

export function update() {
  Object.keys(gaf.Period).forEach((period) => {
    gaf.areaCodes.forEach(gafAreaCode => {
      let url = backend.url(`/api/gafarea/${gafAreaCode}/${period}.json`);

      request(url, (error, response, body) => {
        let forecastData : GAFAreaForecast = JSON.parse(body);

        data[gafAreaCode] = data[gafAreaCode] || {};
        data[gafAreaCode][forecastData.from.toString()] = forecastData;
        console.log(`${forecastData.gaf_area_id} ${forecastData.from} - ${lsalt.ready}`);
      });
    });
  })
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