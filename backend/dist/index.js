"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require('express');
var fs = require('fs');
var https = require('https');
var path = require('path');
var app = express();
var port = 443;
var privateKey = fs.readFileSync('tls/privkey.pem');
var certificate = fs.readFileSync('tls/gennex_band_bundle.crt');
// Change directory to project root (ts-files)
var projectRoot = path.resolve('./');
process.chdir(projectRoot);
__dirname = projectRoot;
app.use(express.static(path.join(__dirname, '../gennex-web-fe/dist/gennex-web-fe/browser')));
// /{*splat}
app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, '../gennex-web-fe/dist/gennex-web-fe/browser/index.html'));
});
https.createServer({
    key: privateKey,
    cert: certificate
}, app).listen(port, '0.0.0.0');
