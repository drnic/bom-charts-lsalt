import * as express from 'express';
import * as URL from 'url';
import * as cfenv from 'cfenv';
// import * as turf from 'turf';

import * as lsalt from './data/lsalt';
import * as gafforecast from './data/gafforecast';

let app = express()


let appEnv = cfenv.getAppEnv();
let appURLPath = URL.parse(appEnv.url).pathname;
console.log(`Requests on path ${appURLPath}`);

lsalt.init();
gafforecast.update();
setInterval(gafforecast.update, 1000*60*60);


app.get(appURLPath, function (req, res) {
  // res.json(gafforecast.forecasts["QLD-S"]);
  res.json(gafforecast.dayMapAreaLSALT);
})

// locally provide $PORT
app.listen(appEnv.port);
