import * as request from 'request';
import * as backend from './backend';
import * as gaf from './gaf';

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
export function init() {
  gaf.areaCodes.forEach(gafAreaCode => {
    let url = backend.url(`/json/lsalt-${gafAreaCode}.json`);

    request(url, (error, response, body) => {
      data[gafAreaCode] = JSON.parse(body);
      checkIsReady();
    });
  });
}

function checkIsReady() {
  let unfinished = gaf.areaCodes.reduce((result: string[], gafAreaCode: string) => {
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