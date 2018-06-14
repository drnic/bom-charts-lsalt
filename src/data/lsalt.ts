import * as _ from 'underscore';
import * as request from 'request';
import * as URL from 'url';

export let gafAreaCodes = ["WA-N", "WA-S", "NT", "QLD-N", "QLD-S", "SA", "NSW-W", "NSW-E", "VIC", "TAS"];

/**
 * Describes a 0.5 deg x 0.5 deg polyon, with a lower-safe altitude.
 */
export interface LSALTGrid {
  /**
   * 0.5 deg x 0.5 deg polyon. First and last number should be equivalent.
   */
  grid: number[][];
  /**
   * lsalt_100ft needs to be muliplied by 100 to get height in feet
   */
  lsalt_100ft: number;
}

/**
 * Known Lower Safe Altitude (LSALT) grids (0.5 deg x 0.5 deg). lsalt_100ft needs to be muliplied by 100 to get height in feet.
 */
export let data: { [gafAreaCode: string]: LSALTGrid[] } = {}
/**
 * True if .data has finished loading
 */
export let ready = false;

/**
 * Fetch LSALT data and set .ready = true when done.
 * @param backendURL backend bom-charts API to fetch LSALT data
 */
export function init(backendURL: URL.UrlWithStringQuery) {
  gafAreaCodes.forEach(gafAreaCode => {
    let url = _.clone(backendURL);
    url.pathname = `/json/lsalt-${gafAreaCode}.json`;

    request(URL.format(url), (error, response, body) => {
      data[gafAreaCode] = JSON.parse(body);
      checkIsReady();
    });
  });
}

function checkIsReady() {
  let unfinished = gafAreaCodes.reduce((result: string[], gafAreaCode: string) => {
    if (data[gafAreaCode] === undefined) {
      result.push(gafAreaCode);
    }
    return result;
  }, []);
  if (unfinished.length === 0) {
    console.log("LSALT data has been fetched");
    ready = true;
  }
}