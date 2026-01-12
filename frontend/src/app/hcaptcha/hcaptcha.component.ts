import { AfterViewInit, Component, ElementRef, NgZone, ViewChild } from '@angular/core';
import { ConfigService } from '../services/config.service';

declare const hcaptcha: any;

@Component({
	selector: 'app-hcaptcha',
	imports: [],
	templateUrl: './hcaptcha.component.html',
	styleUrl: './hcaptcha.component.scss'
})
export class HcaptchaComponent implements AfterViewInit {

	@ViewChild('hcaptchaContainer', { static: true })
	container!: ElementRef;

	captchaId!: number;

	constructor(private zone: NgZone, private config: ConfigService) { }

	ngAfterViewInit(): void {
		// fetch hcaptcha key.
		this.config.awaitConfig().then(conf => {
			this.zone.runOutsideAngular(() => this.captchaId = hcaptcha.render(this.container.nativeElement, {
				sitekey: conf.hcaptcha_key,
				callback: (token: string) => {
					this.zone.run(() => {
						console.log('Captcha token:', token);
					});
				}
			}));
		});
	}
}
