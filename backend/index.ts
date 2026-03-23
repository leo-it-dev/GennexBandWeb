import * as express from 'express';
const https = require('https')
const path = require('path');
const compression = require('compression');
const app = express();

import * as fs from 'fs';
import * as config from 'config';
import { Request, Response } from 'express';
import { exit } from 'process';
import { ApiModule } from './api_module';
import { DeploymentType } from './deployment';
import * as ssl from './framework/ssl';
import * as jwt from './framework/jwt';
import * as immich from './framework/immich_api'
import { getLogger } from './logger';
import { ApiModuleConfig } from './modules/config/api_config';
import { ApiModuleContact } from './modules/contact/api_contact';
import { ApiModuleGallery } from './modules/gallery/api_gallery';
import { ApiModuleVideos } from './modules/videos/api_videos';
import { RepeatedTaskScheduler } from './framework/scheduled_events';
import { ApiModuleCalendar } from './modules/calendar/api_calendar';
import { ApiModuleSubscribe } from './modules/subscribe/api_subscribe';
import { ApiModuleAgentHandler } from './modules/agent/api_agent';
import { AgentTrigger } from './modules/agent/agent_trigger';
import { ApiModuleRenderedPDFs } from './modules/renderedpdf/api_renderedpdf';

let mainLogger = getLogger("index");

let repeatedTaskScheduler = new RepeatedTaskScheduler();

const httpPort = config.get('generic.HTTP_PORT') as number;
const httpsPort = config.get('generic.HTTPS_PORT') as number;
const baseUrl = config.get("generic.APPLICATION_URL");
const domain = config.get('generic.SERVE_DOMAIN');

// Change directory to project root (ts-files)
const projectRoot = path.resolve('./');
process.chdir(projectRoot);
console.log(process.cwd())
__dirname = projectRoot;


// The file structure slightly differs between deployment and development run.
// We can use this information to determine whether or not we are run in development or deploy environment.
const filePathFrontendDev = '../frontend/dist/gennex-web-fe/browser';
const filePathFrontendDepl = '../frontend/gennex-web-fe/browser';

let deploymentType: DeploymentType = DeploymentType.DEVELOPMENT;

if (fs.existsSync(filePathFrontendDev)) {
    deploymentType = DeploymentType.DEVELOPMENT;
    mainLogger.info("File structure indicates deployment mode", { mode: "DEVELOPMENT" });
    initializeDevelopmentBuildEnvironment(projectRoot);
} else if (fs.existsSync(filePathFrontendDepl)) {
    deploymentType = DeploymentType.PRODUCTION;
    mainLogger.info("File structure indicates deployment mode", { mode: "PRODUCTION" });
} else {
    mainLogger.error("File structure seems odd. Can't find frontend, won't start!");
    exit(1);
}

const filePathFrontend = deploymentType == DeploymentType.PRODUCTION ? filePathFrontendDepl : filePathFrontendDev;
let apiModulesInstances = [];

ssl.initSSL();
jwt.initJwtBackend();
immich.initImmich();
repeatedTaskScheduler.schedulerInit();

// add compression middleware to speed up loading times.
app.use(compression({ filter: shouldCompress }));

app.use(express.json())

// serve static files in frontend dist folder.
app.use(express.static(path.join(__dirname, filePathFrontend)));

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
if (httpsPort && httpsPort != -1) {
    let serv = https.createServer(ssl.SSL_OPTIONS, app);
    runSecureRedirectServer();
    mainLogger.info("Backend server up and running on Port " + httpsPort + ". Have a nice day!");
    serv.listen(httpsPort, '0.0.0.0');
} else {
    app.listen(httpPort, "0.0.0.0", () => {
        mainLogger.info("Backend server up and running on Port " + httpsPort + ". Have a nice day!");
    });
}

function initializeDevelopmentBuildEnvironment(projectRoot: string) {
    const logger = getLogger("dev-init");
    logger.info("--- Preparing development environment ---");
    let runtimeRoot = path.join(projectRoot, 'js', 'backend');

    let copyPaths = [
        {
            src: path.join(projectRoot, 'ssl'),
            dest: path.join(runtimeRoot, 'ssl'),
            forceOverwrite: true
        },
        {
            src: path.join(projectRoot, 'framework', 'databases'),
            dest: path.join(runtimeRoot, 'framework', 'databases'),
            forceOverwrite: false
        },
        {
            src: path.join(projectRoot, 'email', 'templates'),
            dest: path.join(runtimeRoot, 'email', 'templates'),
            forceOverwrite: true
        }
    ]

    for (let copyPath of copyPaths) {
        if (!fs.existsSync(copyPath.dest) || copyPath.forceOverwrite) {
            logger.info("    - Copying path ", { src: copyPath.src, dst: copyPath.dest });
            fs.cpSync(copyPath.src, copyPath.dest, { recursive: true });
        }
    }

    logger.info("--- Preparing development environment finished ---");
}


async function initializeModules() {
    const apiModules = [
        ApiModuleVideos,
        ApiModuleGallery,
        ApiModuleConfig,
        ApiModuleContact,
        ApiModuleCalendar,
        ApiModuleSubscribe,
        ApiModuleAgentHandler,
        ApiModuleRenderedPDFs
    ]

    let moduleLoaderLogger = getLogger('module-loader');
    moduleLoaderLogger.info("Starting module loader ---");

    for (let apiModuleClass of apiModules) {
        let apiModule = new apiModuleClass(app);
        moduleLoaderLogger.info("Loading Api Backend Module on basepath: ", { module: apiModuleClass.name, basepath: apiModule.basepath() });
        await apiModule.initializeModuleInternal();
        await apiModule.initialize();
        apiModule.registerEndpoints();
        apiModulesInstances.push(apiModule);
    }
    moduleLoaderLogger.info("Finished module loader ---");
}


initializeModules();

// /{*splat}
// for default requests (to /) serve index.html
app.get(/^(?!\/module).*/, (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, path.join(filePathFrontend, 'index.html')));
});

export function getApiModule<T = ApiModule>(apiModuleClass: { new(...args: any[]): T }): T | undefined {
    for (let apiModule of apiModulesInstances) {
        if (apiModule instanceof apiModuleClass) {
            return apiModule;
        }
    }
    return undefined;
}

export function getFilePathFrontend() {
    return filePathFrontend;
}

export function getRepeatedScheduler(): RepeatedTaskScheduler {
    return repeatedTaskScheduler;
}

export function runAgentTrigger(trigger: AgentTrigger) {
    getApiModule(ApiModuleAgentHandler).runTrigger(trigger);
}

export function getBaseURL() {
    return baseUrl;
}
