import * as express from 'express';
import * as URL from 'url';
import * as cfenv from 'cfenv';

let app = express()
let appEnv = cfenv.getAppEnv();

let appURLPath: string = URL.parse(appEnv.url).pathname;
console.log(`Requests on path ${appURLPath}`);

let mainAppURL: URL.UrlWithStringQuery = URL.parse(appEnv.url);
mainAppURL.pathname = "";

app.get(appURLPath, function (_, res: express.Response) {
  res.json(URL.format(mainAppURL));
})

// locally provide $PORT
app.listen(appEnv.port);
