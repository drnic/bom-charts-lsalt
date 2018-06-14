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
app.get('/', lsaltFeatureCollection)

// Duplicate endpoints to allow backend to proxy requests during local dev/text
app.get('/lsalt', lsaltFeatureCollection)

// app.get('*', function(req, res) {
//   res.json(req.originalUrl);
// });


// locally provide $PORT
app.listen(appEnv.port);
