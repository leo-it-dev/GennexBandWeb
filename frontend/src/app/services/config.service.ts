import { Injectable } from '@angular/core';
import { ApiCommonConfig } from '../../../../api_common/config';
import { timeout } from '../utilities';

@Injectable({
	providedIn: 'root'
})
export class ConfigService {

	private static config: ApiCommonConfig | undefined = undefined;

	constructor() {
		if (ConfigService.config == undefined) {
			fetch("/config").then(dat => dat.json()).then((config: ApiCommonConfig) => {
				ConfigService.config = config
			}).catch(err => {
				console.error("Can't load config data from server: " + err + "!");
			});
		}
	}

	async awaitConfig(): Promise<ApiCommonConfig> {
		while (ConfigService.config == undefined) {
			await timeout(100);
		}
		return ConfigService.config;
	}
}
