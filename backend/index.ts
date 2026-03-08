const express = require('express')
const https = require('https')
const path = require('path');
const compression = require('compression');
const fs = require('fs');
const app = express();

import { Request, Response } from 'express';
import { getLogger } from './logger';
import * as config from 'config';
import { DeploymentType } from './deployment';
import { exit } from 'process';
import * as mailer from './mailer';
import { generateContactEmailVerifyCode, validateContactEmailVerifyCode } from './contact_verification_token';
import { ContactFormularRequest, contactFormularRequestVerification, ContactFormularStatusCodes } from '../api_common/verification';
import { ApiModuleVideos } from './modules/videos/api_videos';
import { ApiModule } from './api_module';
import * as ssl from './framework/ssl';
import { ApiModuleGallery } from './modules/gallery/api_gallery';

let mainLogger = getLogger("index");

const httpPort = config.get('generic.HTTP_PORT');
const httpsPort = config.get('generic.HTTPS_PORT');
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

ssl.initSSL();

const filePathFrontend = deploymentType == DeploymentType.PRODUCTION ? filePathFrontendDepl : filePathFrontendDev;

let apiModulesInstances = [];


// add compression middleware to speed up loading times.
app.use(compression({ filter: shouldCompress }));

app.use(express.json())

// serve static files in frontend dist folder.
app.use(express.static(path.join(__dirname, filePathFrontend)));

// /{*splat}
// for default requests (to /) serve index.html
app.get("/", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, path.join(filePathFrontend, 'index.html')));
});

app.get("/config", (req: Request, res: Response) => {
    res.status(200);
    res.json({
        hcaptcha_key: config.get("generic.HCAPTCHA_SITEKEY")
    });
});

enum CaptchaVerificationResult {
    SUCCESS,
    CAPTCHA_INVALID,
    CAPTCHA_COMMUNICATION_ERROR
}

async function verifyCaptcha(captchaToken: string): Promise<CaptchaVerificationResult> {
    return new Promise<CaptchaVerificationResult>((res, _) => {
        const params = new URLSearchParams();
        params.append('secret', config.get("generic.HCAPTCHA_SECRET"));
        params.append('response', captchaToken);

        fetch("https://hcaptcha.com/siteverify", {
            method: "POST",
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then(async dat => {
            let json = await dat.json();

            if (!dat.ok) {
                console.error("Error communicating with hcaptcha page!: " + dat.status + ":" + json);
                res(CaptchaVerificationResult.CAPTCHA_COMMUNICATION_ERROR);
                return;
            }

            if (json.success) { // HCaptcha verify successfull
                res(CaptchaVerificationResult.SUCCESS);
                return;
            } else {
                res(CaptchaVerificationResult.CAPTCHA_INVALID);
                return;
            }
        }).catch(err => {
            console.log(err);
            res(CaptchaVerificationResult.CAPTCHA_COMMUNICATION_ERROR);
            return;
        })
    });
}

app.post("/contact", async (req: Request, res: Response) => {
    console.log("Received contact request:", req.body);

    if (!contactFormularRequestVerification.verify(req.body)) {
        res.status(ContactFormularStatusCodes.MALFORMED_REQUEST);
        res.json({ ok: false, error: "Your request is malformed or your request data is too big!" });
        return;
    }

    let request = req.body as ContactFormularRequest;

    /* verification flow:
        - User is not yet registered:
        -   /contact with captcha data without mailVerificationCode
        -   We check the captcha, if it is correct, we send the user an email with a random verification code. We cache the code for 15 minutes.
        -   User calls /contact again without valid captcha but with correct emailVerificationCode. We accept the request without checking captcha again, register user email and send message to gennex.
        - User's mail is already registered:
        -   /contact with captcha data without mailVerificationCode
        -   We verify captcha, if it is correct we send message to gennex.
    */

    // Possible return codes:
    // - 200: Success, message sent
    // - 401 Email Authentication Required. We sent a mail to the user's email address with a verification code.
    // - 403 Captcha invalid. User did not provide a email verification token. Given captcha was not solved correctly.
    // - 404 Email Verification Code is invalid. User provided a mail verification code but it was wrong.
    // - 500 Internal server error. Some internal server error, user should try later again or use other communication channel.

    enum ContinuationAction {
        FINAL_SEND_MESSAGE,
        SEND_EMAIL_VERIFICATION_MESSAGE,
        NONE
    }

    let finalAction: ContinuationAction = ContinuationAction.NONE;

    if (request.mailVerificationCode != '') {
        // TODO: Check if user mail is already verified. Then simply ignore this part.

        // User tries to send message and validate it's email address.
        if (validateContactEmailVerifyCode(request.email, request.mailVerificationCode)) {
            finalAction = ContinuationAction.FINAL_SEND_MESSAGE;
        } else {
            res.status(ContactFormularStatusCodes.EMAIL_VERIFICATION_CODE_INVALID);
            res.json({ ok: false, error: "Your provided verification code is incorrect!" });
            return;
        }
    } else {
        let result = await verifyCaptcha(request.captcha);
        switch (result) {
            case CaptchaVerificationResult.CAPTCHA_COMMUNICATION_ERROR:
                res.status(ContactFormularStatusCodes.INTERNAL_SERVER_ERROR);
                res.json({ ok: false, error: "Error verifying captcha!" });
                return;
            case CaptchaVerificationResult.CAPTCHA_INVALID:
                res.status(ContactFormularStatusCodes.CAPTCHA_INVALID);
                res.json({ ok: false, error: "HCaptcha reponse invalid!" });
                return;
            case CaptchaVerificationResult.SUCCESS:
                // TODO: Check if user mail is already verified.
                let alreadyVerified = false;

                finalAction = alreadyVerified ? ContinuationAction.FINAL_SEND_MESSAGE : ContinuationAction.SEND_EMAIL_VERIFICATION_MESSAGE;
                break;
        }
    }

    switch (finalAction) {
        case ContinuationAction.FINAL_SEND_MESSAGE:
            let finalMessageStr = "Neue Anfrage über Kontaktformular: \
" + request.firstName + " " + request.surName + "<br/> \
Email Addresse: " + request.email + "<br/>\
Anfrage: --------<br/>\
" + request.message + "<br/>\
--------------------<br/>";

            await mailer.sendEmail([config.get('mail.SMTP_USERNAME')], "(Web) Kontaktanfrage", finalMessageStr, finalMessageStr);
            res.status(ContactFormularStatusCodes.MESSAGE_SENT);
            res.json({});
            break;
        case ContinuationAction.SEND_EMAIL_VERIFICATION_MESSAGE:
            let verificationCode = generateContactEmailVerifyCode(req.body.email);
            await mailer.sendEmail([req.body.email], "Bitte verifiziere deine E-Mail Addresse!", "Dein Verifikationscode: " + verificationCode, "<h5> Dein Verifikations Code: </h5><center><br><h1>" + verificationCode + "</h1></center>");
            res.status(ContactFormularStatusCodes.EMAIL_VERIFICATION_REQUIRED);
            res.json({});
            break;
    }
})

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
let serv = https.createServer(ssl.SSL_OPTIONS, app);

runSecureRedirectServer();
mainLogger.info("Backend server up and running on Port " + httpsPort + ". Have a nice day!");
serv.listen(httpsPort, '0.0.0.0');

function initializeDevelopmentBuildEnvironment(projectRoot: string) {
    const logger = getLogger("dev-init");
    logger.info("--- Preparing development environment ---");
    let runtimeRoot = path.join(projectRoot, 'js', 'backend');

    let copyPaths = [
        {
            src: path.join(projectRoot, 'ssl'),
            dest: path.join(runtimeRoot, 'ssl')
        },
        {
            src: path.join(projectRoot, 'framework', 'databases'),
            dest: path.join(runtimeRoot, 'framework', 'databases')
        }
    ]

    for (let copyPath of copyPaths) {
        logger.info("    - Copying path ", {src: copyPath.src, dst: copyPath.dest});
        fs.cpSync(copyPath.src, copyPath.dest, { recursive: true });
    }

    logger.info("--- Preparing development environment finished ---");
}


async function initializeModules() {
    const apiModules = [
        ApiModuleVideos,
        ApiModuleGallery
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