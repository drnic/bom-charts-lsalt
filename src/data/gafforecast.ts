import * as request from 'request';
import * as backend from './backend';
import * as gaf from './gaf';

export let data: { [gafAreaCode: string]: GAFPeriods} = {};

export function update() {
  let period = "current";
  gaf.areaCodes.forEach(gafAreaCode => {
    let url = backend.url(`/api/gafarea/${gafAreaCode}/${period}.json`);

    request(url, (error, response, body) => {
      let forecastData = JSON.parse(body);
      data[gafAreaCode] = data[gafAreaCode] || {};
      if (period == gaf.Period.current) {
        data[gafAreaCode].current = forecastData;
      } else {
        data[gafAreaCode].next = forecastData;
      }
    });
  });

}



export interface GAFPeriods {
  current?: GAFAreaForecast;
  next?: GAFAreaForecast;
}

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