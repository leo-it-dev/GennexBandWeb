import { Component, inject, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { subscribeFormularRequestVerification, SubscribeFormularResponse, SubscribeFormularStatusCodes, VERIFICATION_CODE_LENGTH } from '../../../../api_common/verification';
import { ApiInterfaceSubscribeIn, ApiInterfaceSubscribeOut } from '../../../../api_common/subscribe';
import { formBuilderGroupFromInputVerifierTemplate } from '../formVerifier';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { LoadingoverlayService } from '../services/loadingoverlay.service';
import { BackendService } from '../api/backend.service';
import { SubscribeBackendService } from '../modules/subscribe/subscribe-backend.service';
import { HcaptchaComponent } from '../hcaptcha/hcaptcha.component';

@Component({
	selector: 'app-contact-channels',
	imports: [SectionHeaderComponent, ReactiveFormsModule, HcaptchaComponent],
	templateUrl: './contact-channels.component.html',
	styleUrl: './contact-channels.component.scss',
})
export class ContactChannelsComponent {

	private formBuilder = inject(FormBuilder);
	subscribeFormGroup = formBuilderGroupFromInputVerifierTemplate(this.formBuilder, subscribeFormularRequestVerification);

	@ViewChild('captcha')
	private captcha!: HcaptchaComponent;

	constructor(private loadingser: LoadingoverlayService, private backendService: BackendService) {
 
	}

	submitForm() {
		this.subscribeFormGroup.updateValueAndValidity();
		if (this.subscribeFormGroup.valid) {
			this.sendSubscribeFormular({
				email: this.subscribeFormGroup.controls['email'].value as string,
				captcha: this.subscribeFormGroup.controls['captcha'].value as string,
				mailVerificationCode: ''
			}).then(res => {
				this.handleContactFormularResponse(res);
			})
		}
	}

	handleContactFormularResponse(response: SubscribeFormularResponse) {
		switch (response) {
			case SubscribeFormularResponse.SUCCESS:
				this.loadingser.showLoadingOverlay(["Vielen Dank.", "Wir haben Deine Newsletter-Anmeldung registriert!", "Solltest du zukünftig keine Mails mehr von uns erhalten wollen, kannst Du den Newsletter über den Link in unseren Mails wieder abbestellen."], "/images/success.json", false, false, "", 0, (nt: string) => { });
				this.subscribeFormGroup.reset();
				break;
			case SubscribeFormularResponse.ALREADY_REGISTERED:
				this.loadingser.showLoadingOverlay(["Vielen Dank.", "Diese E-Mail-Adresse ist bereits in unserem System registriert.", "Du erhältst von uns weiterhin E-Mails über Neuigkeiten und Events."], "/images/success.json", false, false, "", 0, (nt: string) => { });
				this.subscribeFormGroup.reset();
				break;
			case SubscribeFormularResponse.EMAIL_VERIFICATION_REQUIRED:
				this.showEmailVerificationRequiredOverlay();
				break;
			case SubscribeFormularResponse.CAPTCHA_INVALID:
				this.loadingser.showLoadingOverlay(["Captcha ist ungültig.", "Bitte erneut lösen und absenden."], "/images/error.json", true, false, "", 0, (nt: string) => { });
				break;
			case SubscribeFormularResponse.EMAIL_VERIFICATION_CODE_INVALID:
				this.showEmailVerificationRequiredOverlay();
				this.loadingser.markInputErronous();
				break;
			case SubscribeFormularResponse.UNKNOWN_ERROR:
				this.loadingser.showLoadingOverlay(["Oh nein. Es ist ein Fehler aufgetreten.", "Es liegt an uns... nicht an dir.", "Bitte versuche es später nochmal oder nimm Kontakt mit uns über Instagram auf @gennex_official."], "/images/error.json", true, false, "", 0, (nt: string) => { });
				break;
		}
	}

	showEmailVerificationRequiredOverlay() {
		this.loadingser.showLoadingOverlay(["Deine Newsletter-Anmeldung ist fast fertig.", "Bitte prüfe noch dein Mailfach und gib den Code ein, den wir Dir geschickt haben."], "/images/mailbox.json", true, true, "Email Code", VERIFICATION_CODE_LENGTH, (verificationCode: string) => {
			if (verificationCode.length == VERIFICATION_CODE_LENGTH) {
				verificationCode = verificationCode.toUpperCase()

				// Second try sending message. Now with our email verification code embedded.
				this.sendSubscribeFormular({
					email: this.subscribeFormGroup.controls['email'].value as string,
					captcha: this.subscribeFormGroup.controls['captcha'].value as string,
					mailVerificationCode: verificationCode
				}).then(res => {
					this.handleContactFormularResponse(res);
				})
			}
		});
	}

	async sendSubscribeFormular(request: ApiInterfaceSubscribeIn): Promise<SubscribeFormularResponse> {
		this.loadingser.showLoadingOverlay(["Bitte warten"], "/images/loading.json", true, false, "", 0, (nt: string) => { });

		return new Promise((res, _) => {
			this.backendService.anonymousBackendCall<ApiInterfaceSubscribeIn, ApiInterfaceSubscribeOut>(SubscribeBackendService.API_URL_SUBSCRIBE, request).then(async (dat) => {
				switch (dat.result) {
					case SubscribeFormularStatusCodes.MESSAGE_SENT:
						res(SubscribeFormularResponse.SUCCESS);
						return;
					case SubscribeFormularStatusCodes.CAPTCHA_INVALID:
						res(SubscribeFormularResponse.CAPTCHA_INVALID);
						return;
					case SubscribeFormularStatusCodes.ALREADY_REGISTERED:
						res(SubscribeFormularResponse.ALREADY_REGISTERED);
						return;
					case SubscribeFormularStatusCodes.EMAIL_VERIFICATION_CODE_INVALID:
						res(SubscribeFormularResponse.EMAIL_VERIFICATION_CODE_INVALID);
						break;
					case SubscribeFormularStatusCodes.EMAIL_VERIFICATION_REQUIRED:
						res(SubscribeFormularResponse.EMAIL_VERIFICATION_REQUIRED);
						return;
					case SubscribeFormularStatusCodes.INTERNAL_SERVER_ERROR:
					case SubscribeFormularStatusCodes.MALFORMED_REQUEST:
						throw new Error("Error during online backend request: " + dat.result);
				}
			}).catch(err => {
				console.error(err);
				res(SubscribeFormularResponse.UNKNOWN_ERROR);
			}).finally(() => {
				this.captcha.reset();
			});
		});
	}
}
