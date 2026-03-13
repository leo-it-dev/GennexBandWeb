import { Injectable, Injector } from '@angular/core';
import { IModule } from '../module/module.service';
import { ApiModuleBody, ApiModuleInterfaceB2F, ApiModuleInterfaceF2B } from '../../../../api_common/backend_call';

@Injectable({
	providedIn: 'root'
})
export abstract class BackendService implements IModule {

	constructor(
		protected injector: Injector
	) { };

	anonymousBackendCall<REQ extends ApiModuleInterfaceF2B, RES extends ApiModuleInterfaceB2F>(url: string, body: REQ|undefined = undefined): Promise<RES> {
		return new Promise((res, rej) => {
			fetch(document.location.origin + url, {
				method: body === undefined ? "GET" : "POST",
				body: JSON.stringify(body),
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			}).then(async resp => {
				const json = (await resp.json()) as ApiModuleBody;
				if (resp.ok) {
					res(json.content as RES);
				} else {
					throw new Error(resp.status + ": " + json.error);
				}
			}).catch(e => {
        		console.error("Error performing backend call: " + e);
				rej(e);
			});
		});
	}

	abstract name(): string;
}