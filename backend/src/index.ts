const express = require('express')
const fs = require('fs');
const https = require('https')
const path = require('path');
const app = express()
import { Request, Response } from 'express';
const port = 443

var privateKey = fs.readFileSync('tls/privkey.pem');
var certificate = fs.readFileSync('tls/gennex_band_bundle.crt');

// Change directory to project root (ts-files)
const projectRoot = path.resolve('./');
process.chdir(projectRoot);
__dirname = projectRoot;

app.use(express.static(path.join(__dirname, '../gennex-web-fe/dist/gennex-web-fe/browser')));

// /{*splat}
app.get("/", (req: Request, res: Response) => {
	res.sendFile(path.join(__dirname, '../gennex-web-fe/dist/gennex-web-fe/browser/index.html'));
});

https.createServer({
	key: privateKey,
	cert: certificate
}, app).listen(port, '0.0.0.0');
