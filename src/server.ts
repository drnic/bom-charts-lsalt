import * as express from 'express';
import * as fs from 'fs';
import * as URL from 'url';
import * as _ from 'underscore';
import * as cfenv from 'cfenv';
// import * as turf from 'turf';

import * as request from 'request';

let app = express()
let appEnv = cfenv.getAppEnv();

let mainAppURL: URL.UrlWithStringQuery;
let appURLPath = "/";

if (process.env.BACKEND_URL) {
  mainAppURL = URL.parse(process.env.BACKEND_URL);
} else {
  appURLPath = URL.parse(appEnv.url).pathname;
  mainAppURL = URL.parse(appEnv.url);
}
console.log(`Requests on path ${appURLPath}`);

let gafAreaCodes = ["WA-N", "WA-S", "NT", "QLD-N", "QLD-S", "SA", "NSW-W", "NSW-E", "VIC", "TAS"];

interface LSALTGrid {
  grid: number[][];
  lsalt_100ft: number;
}
let lsaltData: { [gafAreaCode: string]: LSALTGrid[] } = {}

gafAreaCodes.forEach(gafAreaCode => {
  let url = _.clone(mainAppURL);
  url.pathname = `/json/lsalt-${gafAreaCode}.json`;

  request(URL.format(url), (error, response, body) => {
    console.log(gafAreaCode);
    lsaltData[gafAreaCode] = JSON.parse(body);
  });
});

app.get(appURLPath, function (req, res: express.Response) {
  res.json(lsaltData['WA-S']);
})

// locally provide $PORT
app.listen(appEnv.port);
