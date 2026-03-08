import { Injectable, signal, WritableSignal } from '@angular/core';
import { BackendService } from '../api/backend.service';

export interface IModule {
	name(): string;
}

export type Module = {
	imodule: IModule;
}
 
@Injectable({
	providedIn: 'root'
})
export class ModuleService {

	private _modules: Module[] = [];

	constructor(
	) {
		// Append future modules here to auto-cache backend information upon online-login.
		let modules: BackendService[] = [
		];

		modules.forEach(m => this._modules.push({
			imodule: m,
		}));
	}

	get modules(): Module[] {
		return this._modules;
	}
}