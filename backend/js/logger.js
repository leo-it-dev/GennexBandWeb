"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = getLogger;
exports.ellipseString = ellipseString;
var chalk = require("chalk");
var util_1 = require("util");
var winston = require("winston");
// Winston
var customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        debug: 'blue'
    },
};
var _baseLogger = winston.createLogger({
    levels: customLevels.levels,
    level: 'debug',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    defaultMeta: {},
    transports: [
        //
        // - Write all logs with importance level of `error` or higher to `error.log`
        //   (i.e., error, fatal, but not other levels)
        //
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        //
        // - Write all logs with importance level of `info` or higher to `combined.log`
        //   (i.e., fatal, error, warn, and info, but not trace)
        //
        new winston.transports.File({ filename: 'combined.log' }),
        // Pipe all logs to our OpenTelemetry endpoint.
        /*new OtelWinstonTransporter({
            
        }),*/
        //
        // log to the `console` with the format:
        // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
        //
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.timestamp({ format: 'DD.MM.YYYY HH:mm:ss' }), winston.format.printf(function (info) {
                return "".concat(info.timestamp, " ").concat(chalk.magenta(info.service), " ").concat(info.level, ": ").concat(info.message) + (info.splat !== undefined ? "".concat(info.splat) : " ") +
                    "".concat((0, util_1.inspect)(Object.fromEntries(Object.entries(info).filter(function (_a) {
                        var key = _a[0];
                        return !["timestamp", "level", "message", "splat", "service"].includes(key);
                    })), {
                        colors: true,
                        depth: 2,
                        showHidden: false
                    }));
            })),
        })
    ]
});
winston.addColors(customLevels.colors);
function getLogger(serviceName) {
    return _baseLogger.child({ service: serviceName });
}
/**
 * !!Don't export to utilities.ts. Circular import!
 * Logger must be standalone!
 */
function ellipseString(inputStr, maxLength) {
    if (inputStr.length > maxLength) {
        return inputStr.substring(0, maxLength) + "...";
    }
    else {
        return inputStr;
    }
}
//# sourceMappingURL=logger.js.map