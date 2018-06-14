const URL = require("url");

var url = URL.parse("https://bom-charts-staging.cfapps.io/");
console.log(url);
console.log(URL.format(url));
url.pathname = null;
console.log(URL.format(url));