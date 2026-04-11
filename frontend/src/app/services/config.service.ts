import { Injectable } from '@angular/core';
import { ApiInterfaceConfigOut } from '../../../../api_common/config';
import { timeout } from '../utilities';

@Injectable({
	providedIn: 'root'
})
export class ConfigService {

	private static config: ApiInterfaceConfigOut | undefined = undefined;

	constructor() {
		if (ConfigService.config == undefined) {
			fetch("/module/config/config").then(dat => dat.json()).then((config: any) => {
				ConfigService.config = config["content"]
			}).catch(err => {
				console.error("Can't load config data from server: " + err + "!");
			});
		}
	}

	async awaitConfig(): Promise<ApiInterfaceConfigOut> {
		while (ConfigService.config == undefined) {
			console.log(ConfigService.config);
			await timeout(100);
		}
		return ConfigService.config;
	}
}