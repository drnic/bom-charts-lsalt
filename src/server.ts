import * as express from 'express';
import * as URL from 'url';
import * as cfenv from 'cfenv';
// import * as turf from 'turf';

import * as lsalt from './data/lsalt';
import * as gafforecast from './gafforecast';

let app = express()


let appEnv = cfenv.getAppEnv();
let appURLPath = URL.parse(appEnv.url).pathname;
console.log(`Requests on path ${appURLPath}`);

lsalt.init();
gafforecast.update();
setInterval(gafforecast.update, 1000*60*60);

function lsaltFeatureCollection(req: express.Request, res: express.Response) {
  let vfr = req.query["vfr"] || "day";
  res.json(gafforecast.lsaltFeatureCollection(vfr == "night"));
}

function gafAreasFeatureCollection(req: express.Request, res: express.Response) {
  let from = req.query["from"];
  res.json(gafforecast.gafAreasFeatureCollection(from));
}

function gafAreasDateRanges(req: express.Request, res: express.Response) {
  res.json(gafforecast.dateRanges);
}

app.get('/lsalt-features', lsaltFeatureCollection)
app.get('/gafareas-features', gafAreasFeatureCollection)
app.get('/gafareas-dates', gafAreasDateRanges)

// Duplicate endpoints to allow backend to proxy requests during local dev/text
// app.get('/lsalt', lsaltFeatureCollection)
// app.get('/lsalt/gafareas', gafAreasFeatureCollection)


// locally provide $PORT
app.listen(appEnv.port);
