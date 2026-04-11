import { Injectable } from '@angular/core';
import { DynamicScriptLoaderService } from '../services/dynamic-script-loader.service';
import { timeout } from '../utilities';

@Injectable({
	providedIn: 'root',
})
export class HcaptchaScriptLoaderService {

	CAPTCHA_SCRIPT_URL = "https://js.hcaptcha.com/1/api.js?render=explicit&onload=onHCaptchaScriptLoad";
	scriptLoaded = false;
	scriptLoading = false;

	constructor(private dynamicScripts: DynamicScriptLoaderService) {

	}

	loadHCaptchaScript(): Promise<void> {
		return new Promise<void>(async (res, rej) => {

			// script is already done loading.
			if (this.scriptLoaded) {
				res();
				return;
			}

			// no script loaded, but this loadScript has already been called async, wait for loading completion.
			if (this.scriptLoading) {
				while (this.scriptLoading) {
					await timeout(250);
				}
				res();
				return;
			}
			this.scriptLoading = true;

			(window as any).onHCaptchaScriptLoad = () => {
				this.scriptLoaded = true;
				this.scriptLoading = false;
				res();
			};

			// no script loaded, first to call this function. Go and actually load that script onto our page.
			this.dynamicScripts.loadScript(this.CAPTCHA_SCRIPT_URL);
		});
	}
}
