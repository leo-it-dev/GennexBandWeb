import { getLogger } from '../logger';
import Database = require('better-sqlite3');

export type SqlUpdate = {
	update: string,
	params: any[]
};

export class SQLiteDB {

	logger = getLogger("sqlite");

	database?: Database.Database = undefined;
	moduleName: string = "";

	sqliteInit(moduleName: string) {
		const databasePath = __dirname + "/databases/" + moduleName + ".db";
		this.moduleName = moduleName;
		this.logger.info("Opening sqlite database", { dbname: moduleName, db: databasePath });
		this.database = new Database(databasePath, { fileMustExist: false, readonly: false });
	}

	runTransaction(callback: () => void) {
		if (this.database == undefined) {
			this.logger.error("Can't perform operation on sqlite database as it is not initialized!", { dbname: this.moduleName, op: "transaction", parameters: [] });
			throw Error("Can't perform operation on sqlite database as it is not initialized!");
		}

		this.database.transaction(() => {
			callback();
		})();
	}

	// throws Error on failure
	sqlUpdate(update: SqlUpdate): void {
		if (this.database == undefined) {
			this.logger.error("Can't perform operation on sqlite database as it is not initialized!", { dbname: this.moduleName, op: "update", parameters: update.params });
			throw Error("Can't perform operation on sqlite database as it is not initialized!");
		}

		this.database
			.prepare(update.update)
			.run(update.params);
	}

	// throws Error on failure
	sqlFetchAll(query: string, params: any[]): any[] {
		if (this.database == undefined) {
			this.logger.error("Can't perform operation on sqlite database as it is not initialized!", { dbname: this.moduleName, op: "query-all", query: query, params: params });
			throw Error("Can't perform operation on sqlite database as it is not initialized!");
		}

		return this.database
			.prepare(query)
			.all(params);
	};

	// throws Error on failure
	sqlFetchFirst(query: string, params: any[]): any {
		if (this.database == undefined) {
			this.logger.error("Can't perform operation on sqlite database as it is not initialized!", { dbname: this.moduleName, op: "query-first", query: query, params: params });
			throw Error("Can't perform operation on sqlite database as it is not initialized!");
		}

		return this.database
			.prepare(query)
			.get(params);
	};
}