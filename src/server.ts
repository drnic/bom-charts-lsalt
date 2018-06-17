import * as express from 'express';
import * as URL from 'url';
import * as cfenv from 'cfenv';

import * as gaf from './data/gaf';
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
  let period = req.query["period"];
  res.json(gafforecast.gafAreasFeatureCollection(gaf.toPeriod(period)));
}

function gafAreasEnvelopeFeatureCollection(req: express.Request, res: express.Response) {
  let period = req.query["period"];
  res.json(gafforecast.gafAreasEnvelopeFeatureCollection(gaf.toPeriod(period)));
}

function mapAreas(req: express.Request, res: express.Response) {
  let period = req.query["period"];
  res.json(gafforecast.mapAreasForPeriod(gaf.toPeriod(period)));
}

function mapMajorAreas(req: express.Request, res: express.Response) {
  let period = req.query["period"];
  res.json(gafforecast.majorAreas(gaf.toPeriod(period)));
}

function gafAreasDateRanges(req: express.Request, res: express.Response) {
  res.json(gafforecast.dateRanges());
}

app.get('/api2/lsalt-features', lsaltFeatureCollection)
app.get('/api2/gafareas-features', gafAreasFeatureCollection)
app.get('/api2/gafareas-envelopes', gafAreasEnvelopeFeatureCollection)
app.get('/api2/gafareas-dates', gafAreasDateRanges)
app.get('/api2/mapareas', mapAreas)
app.get('/api2/mapareas/major', mapMajorAreas)

// locally provide $PORT
app.listen(appEnv.port);
