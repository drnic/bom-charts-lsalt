import * as express from 'express';
import * as URL from 'url';
import * as _ from 'underscore';
import * as cfenv from 'cfenv';

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


app.get(appURLPath, function (req, res: express.Response) {
  let url = _.clone(mainAppURL);
  url.pathname = "/json/lsalt-TAS.json";
  request(URL.format(url))
    .on('error', (err) => {
      console.log(err);
      res.json({"error": "connecting to backend API"});
    })
    .pipe(res);
})

// locally provide $PORT
app.listen(appEnv.port);
