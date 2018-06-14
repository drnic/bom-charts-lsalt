import * as express from 'express';
import * as URL from 'url';
import * as cfenv from 'cfenv';
// import * as turf from 'turf';

import * as lsalt from './data/lsalt';

let app = express()
let appEnv = cfenv.getAppEnv();

let backendURL: URL.UrlWithStringQuery;
let appURLPath = "/";

if (process.env.BACKEND_URL) {
  backendURL = URL.parse(process.env.BACKEND_URL);
} else {
  appURLPath = URL.parse(appEnv.url).pathname;
  backendURL = URL.parse(appEnv.url);
}

lsalt.init(backendURL);

console.log(`Requests on path ${appURLPath}`);

app.get(appURLPath, function (req, res: express.Response) {
  res.json(lsalt.ready);
})

// locally provide $PORT
app.listen(appEnv.port);
