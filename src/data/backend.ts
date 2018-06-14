import * as cfenv from 'cfenv';
import * as _ from 'underscore';
import * as request from 'request';
import * as URL from 'url';

export let backendURL: URL.UrlWithStringQuery;

export function url(pathname: string) : string {
  let url = _.clone(backendURL);
  url.pathname = pathname;
  return URL.format(url);
}

let appEnv = cfenv.getAppEnv();
if (process.env.BACKEND_URL) {
  backendURL = URL.parse(process.env.BACKEND_URL);
} else {
  backendURL = URL.parse(appEnv.url);
}
