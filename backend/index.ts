const express = require('express')
const fs = require('fs');
const https = require('https')
const path = require('path');
const compression = require('compression');
const app = express();

import { Request, Response } from 'express';
import { getLogger } from './logger';
import * as config from 'config';
import { DeploymentType } from './deployment';
import { exit } from 'process';


let mainLogger = getLogger("index");
var privateKey = fs.readFileSync('ssl/privkey.pem');
var certificate = fs.readFileSync('ssl/gennex_band_bundle.crt');

const httpPort = config.get('generic.HTTP_PORT');
const httpsPort = config.get('generic.HTTPS_PORT');
const domain = config.get('generic.SERVE_DOMAIN');

// Change directory to project root (ts-files)
const projectRoot = path.resolve('./');
process.chdir(projectRoot);
__dirname = projectRoot;


// The file structure slightly differs between deployment and development run.
// We can use this information to determine whether or not we are run in development or deploy environment.
const filePathFrontendDev = '../frontend/dist/gennex-web-fe/browser';
const filePathFrontendDepl = '../frontend/gennex-web-fe/browser';
let deploymentType: DeploymentType = DeploymentType.DEVELOPMENT;

if (fs.existsSync(filePathFrontendDev)) {
    deploymentType = DeploymentType.DEVELOPMENT;
    mainLogger.info("File structure indicates deployment mode", {mode: "DEVELOPMENT"});
    // initializeDevelopmentBuildEnvironment(projectRoot);
} else if (fs.existsSync(filePathFrontendDepl)) {
    deploymentType = DeploymentType.PRODUCTION;
    mainLogger.info("File structure indicates deployment mode", {mode: "PRODUCTION"});
} else {
    mainLogger.error("File structure seems odd. Can't find frontend, won't start!");
    exit(1);
}
const filePathFrontend = deploymentType == DeploymentType.PRODUCTION ? filePathFrontendDepl : filePathFrontendDev;

// add compression middleware to speed up loading times.
app.use(compression({ filter: shouldCompress }));

// serve static files in frontend dist folder.
app.use(express.static(path.join(__dirname, filePathFrontend)));

// /{*splat}
// for default requests (to /) serve index.html
app.get("/", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, path.join(filePathFrontend, 'index.html')));
});

function shouldCompress(req, res) {
    if (req.headers['x-no-compression']) {
        // don't compress responses with this request header
        return false
    }

    // fallback to standard filter function
    return compression.filter(req, res);
}

// run server on port 80 for redirections.
async function runSecureRedirectServer() {
    let redirectionLogger = getLogger('https-redirection-server');

    redirectionLogger.info("Starting up secure redirection server on port " + httpPort + "...");
    const app = express();
    // redirect every single incoming request to https
    app.use((req: Request, res: Response) => {
        redirectionLogger.debug("Redirected request to " + req.url + " from HTTP to HTTPS!");
        res.redirect('https://' + domain + ":" + httpsPort + req.originalUrl);
    });
    app.listen(httpPort);
    redirectionLogger.info("Secure redirect server is running on port " + httpPort + "!");
}

// Startup secure SSL port 443 Server
let serv = https.createServer({
    key: privateKey,
    cert: certificate
}, app);

runSecureRedirectServer()
mainLogger.info("Backend server up and running on Port " + httpsPort + ". Have a nice day!");
serv.listen(httpsPort, '0.0.0.0');
