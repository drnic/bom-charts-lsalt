import * as _ from 'underscore';
import * as request from 'request';
import * as URL from 'url';

export let gafAreaCodes = ["WA-N", "WA-S", "NT", "QLD-N", "QLD-S", "SA", "NSW-W", "NSW-E", "VIC", "TAS"];

export interface LSALTGrid {
  grid: number[][];
  lsalt_100ft: number;
}
export let data: { [gafAreaCode: string]: LSALTGrid[] } = {}

export function init(mainAppURL: URL.UrlWithStringQuery) {
  gafAreaCodes.forEach(gafAreaCode => {
    let url = _.clone(mainAppURL);
    url.pathname = `/json/lsalt-${gafAreaCode}.json`;

    request(URL.format(url), (error, response, body) => {
      console.log(gafAreaCode);
      data[gafAreaCode] = JSON.parse(body);
    });
  });
}