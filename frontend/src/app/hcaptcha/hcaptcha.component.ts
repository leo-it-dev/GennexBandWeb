import { AfterViewInit, Component, ElementRef, NgZone, ViewChild } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { ConfigService } from '../services/config.service';
import { DynamicScriptLoaderService } from '../services/dynamic-script-loader.service';
import { HcaptchaScriptLoaderService } from './hcaptcha-script-loader.service';

declare const hcaptcha: any;

@Component({
	selector: 'app-hcaptcha',
	imports: [],
	templateUrl: './hcaptcha.component.html',
	styleUrl: './hcaptcha.component.scss'
})
export class HcaptchaComponent implements AfterViewInit, ControlValueAccessor {

	@ViewChild('hcaptchaContainer', { static: true })
	container!: ElementRef;

	private captchaId!: number;
	private onChange?: Function = undefined;

	constructor(private zone: NgZone, private config: ConfigService, private controlDir: NgControl, private dynamicScripts: HcaptchaScriptLoaderService) {
		this.controlDir.valueAccessor = this;
	}

	writeValue(obj: any): void {}
	registerOnTouched(fn: any): void {}
	setDisabledState?(isDisabled: boolean): void {}
	registerOnChange(fn: any): void {
 		this.onChange = fn;
	}

	renderHCaptcha() {
		this.config.awaitConfig().then(conf => {
			this.zone.runOutsideAngular(() => this.captchaId = hcaptcha.render(this.container.nativeElement, {
				sitekey: conf.hcaptcha_key,
				callback: (token: string) => {
					if (this.onChange) this.onChange(token);
					this.zone.run(() => {
						console.log('Captcha token:', token);
					});
				}
			}));
		});
	}

	ngAfterViewInit(): void {
		// fetch hcaptcha key.
		this.dynamicScripts.loadHCaptchaScript().then(() => {
			this.renderHCaptcha();
		});
	}

	reset() {
		hcaptcha.reset();
	}
}
