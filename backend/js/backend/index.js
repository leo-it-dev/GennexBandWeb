"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require('express');
var fs = require('fs');
var https = require('https');
var path = require('path');
var app = express();
var logger_1 = require("./logger");
var config = require("config");
var mainLogger = (0, logger_1.getLogger)("index");
var privateKey = fs.readFileSync('ssl/privkey.pem');
var certificate = fs.readFileSync('ssl/gennex_band_bundle.crt');
var httpPort = config.get('generic.HTTP_PORT');
var httpsPort = config.get('generic.HTTPS_PORT');
var domain = config.get('generic.SERVE_DOMAIN');
// Change directory to project root (ts-files)
var projectRoot = path.resolve('./');
process.chdir(projectRoot);
__dirname = projectRoot;
// serve static files in frontend dist folder.
app.use(express.static(path.join(__dirname, '../gennex-web-fe/dist/gennex-web-fe/browser')));
// /{*splat}
// for default requests (to /) serve index.html
app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, '../gennex-web-fe/dist/gennex-web-fe/browser/index.html'));
});
// run server on port 80 for redirections.
function runSecureRedirectServer() {
    return __awaiter(this, void 0, void 0, function () {
        var redirectionLogger, app;
        return __generator(this, function (_a) {
            redirectionLogger = (0, logger_1.getLogger)('https-redirection-server');
            redirectionLogger.info("Starting up secure redirection server on port " + httpPort + "...");
            app = express();
            // redirect every single incoming request to https
            app.use(function (req, res) {
                redirectionLogger.debug("Redirected request to " + req.url + " from HTTP to HTTPS!");
                res.redirect('https://' + domain + ":" + httpsPort + req.originalUrl);
            });
            app.listen(httpPort);
            redirectionLogger.info("Secure redirect server is running on port " + httpPort + "!");
            return [2 /*return*/];
        });
    });
}
// Startup secure SSL port 443 Server
var serv = https.createServer({
    key: privateKey,
    cert: certificate
}, app);
runSecureRedirectServer();
mainLogger.info("Backend server up and running on Port " + httpsPort + ". Have a nice day!");
serv.listen(httpsPort, '0.0.0.0');
//# sourceMappingURL=index.js.map