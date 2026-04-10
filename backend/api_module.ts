import bodyParser = require("body-parser");
import { Express } from "express";
import { Logger } from "winston";
import { ApiModuleBody, ApiModuleInterfaceB2F, ApiModuleInterfaceF2B, ApiModuleResponse, RequestTyped } from "../api_common/backend_call";
import { getLogger } from "./logger";
import { SQLiteDB, SqlUpdate } from "./framework/sqlite_database";
import { getApiModule } from "./index";

export class ApiModuleLazy<T = ApiModule> {

    moduleInstance?: T = undefined;
    logger = getLogger("module-lazy-load");

    constructor(private moduleClass: { new(...args: any[]): T }) {}

    get(): T {
        if (this.moduleInstance == undefined) {
            try {
                this.moduleInstance = getApiModule(this.moduleClass);
            } catch(err) {
                this.logger.error("Error resolving lazy load module reference!", {moduleClass: this.moduleClass.name});
                throw Error("Eror resolving lazy load module reference! " + this.moduleClass.name);
            }
        }
        return this.moduleInstance;
    }
}

export abstract class ApiModule {
    private _app: Express;
    private _logger?: Logger;
    private _sqlite?: SQLiteDB;

    constructor(app: Express) {
        this._app = app;
    }

    async initializeModuleInternal() {
        this._sqlite = new SQLiteDB();
        this._sqlite.sqliteInit(this.modname());

        const sqliteCreateTable = this.sqliteTableCreate();
        if (sqliteCreateTable != undefined && sqliteCreateTable.length > 0) {
            for (let update of sqliteCreateTable) {
                await this._sqlite.sqlUpdate(update);
            }
        }
    }

    abstract modname(): string;
    abstract registerEndpoints(): void;
    abstract initialize(): any;

    basepath(): string {
        return "/module/" + this.modname();
    }

    logger(): Logger {
        if (this._logger === undefined) {
            this._logger = getLogger(this.modname());
        }
        return this._logger;
    }

    protected sqliteTableCreate(): SqlUpdate[] | undefined {
        return undefined;
    };

    protected sqlite(): SQLiteDB {
        if (this._sqlite) {
            return this._sqlite;
        }
        throw Error("SQLite Database is not yet initialized!");
    }

    postJson<REQ extends ApiModuleInterfaceF2B, RES extends ApiModuleInterfaceB2F>(route: string, handler: (req: RequestTyped<REQ>) => Promise<ApiModuleResponse<RES>>) {
        this._app.post(this.basepath() + "/" + route, bodyParser.json(), async (req, res) => {
            let moduleResponse: ApiModuleResponse<RES>;
            moduleResponse = await handler(new RequestTyped<REQ>(req));
            let transformedResponse: ApiModuleBody = {
                content: moduleResponse.responseObject,
                error: moduleResponse.error
            };
            res.status(moduleResponse.statusCode).json(transformedResponse);
        });
    }

    get<REQ extends ApiModuleInterfaceF2B, RES extends ApiModuleInterfaceB2F>(route: string, handler: (req: RequestTyped<REQ>) => Promise<ApiModuleResponse<RES>>) {
        this._app.get(this.basepath() + "/" + route, async (req, res) => {
            let moduleResponse: ApiModuleResponse<RES>;

            moduleResponse = await handler(new RequestTyped<REQ>(req));

            let transformedResponse: ApiModuleBody = {
                content: moduleResponse.responseObject,
                error: moduleResponse.error
            };
            res.status(moduleResponse.statusCode).json(transformedResponse);
        });
    }
}