import { Component, inject, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiInterfaceContactIn, ApiInterfaceContactOut } from '../../../../api_common/contact';
import { contactFormularRequestVerification, ContactFormularResponse, ContactFormularStatusCodes, VERIFICATION_CODE_LENGTH } from '../../../../api_common/verification';
import { formBuilderGroupFromInputVerifierTemplate } from '../formVerifier';
import { HcaptchaComponent } from '../hcaptcha/hcaptcha.component';
import { LoadingoverlayService } from '../services/loadingoverlay.service';
import { SlotComponent } from '../slot/slot.component';
import { BackendService } from '../api/backend.service';
import { ContactBackendService } from '../modules/contact/contact-backend.service';

@Component({
	selector: 'app-contact',
	imports: [SlotComponent, HcaptchaComponent, ReactiveFormsModule],
	templateUrl: './contact.component.html',
	styleUrl: './contact.component.scss'
})
export class ContactComponent {

	public oneLineText = "Du möchtest uns eine Konzertanfrage senden oder genaueres erfahren? Dann kannst Du hier per Mail mit uns in Kontakt treten.";

	@ViewChild('captcha')
	private captcha!: HcaptchaComponent;

	constructor(private loadingser: LoadingoverlayService, private backendService: BackendService) {

	}

	private formBuilder = inject(FormBuilder);
	contactFormGroup = formBuilderGroupFromInputVerifierTemplate(this.formBuilder, contactFormularRequestVerification);

	async sendContactFormular(request: ApiInterfaceContactIn): Promise<ContactFormularResponse> {
		this.loadingser.showLoadingOverlay(["Bitte warten"], "/images/lottiefiles/loading.json", true, false, "", 0, (nt: string) => { });

		return new Promise((res, _) => {
			this.backendService.anonymousBackendCall<ApiInterfaceContactIn, ApiInterfaceContactOut>(ContactBackendService.API_URL_CONTACT, request).then(async (dat) => {
				switch (dat.result) {
					case ContactFormularStatusCodes.MESSAGE_SENT:
						res(ContactFormularResponse.SUCCESS);
						return;
					case ContactFormularStatusCodes.CAPTCHA_INVALID:
						res(ContactFormularResponse.CAPTCHA_INVALID);
						return;
					case ContactFormularStatusCodes.EMAIL_VERIFICATION_CODE_INVALID:
						res(ContactFormularResponse.EMAIL_VERIFICATION_CODE_INVALID);
						break;
					case ContactFormularStatusCodes.EMAIL_VERIFICATION_REQUIRED:
						res(ContactFormularResponse.EMAIL_VERIFICATION_REQUIRED);
						return;
					case ContactFormularStatusCodes.INTERNAL_SERVER_ERROR:
					case ContactFormularStatusCodes.MALFORMED_REQUEST:
						throw new Error("Error during online backend request: " + dat.result);
				}
			}).catch(err => {
				console.error(err);
				res(ContactFormularResponse.UNKNOWN_ERROR);
			}).finally(() => {
				this.captcha.reset();
			});
		});
	}

	showEmailVerificationRequiredOverlay() {
		this.loadingser.showLoadingOverlay(["Deine Nachricht ist schon fast bei uns. ", "Bitte prüfe noch dein Mailfach und gib den Code ein, den wir Dir geschickt haben."], "/images/lottiefiles/mailbox.json", true, true, "Email Code", VERIFICATION_CODE_LENGTH, (verificationCode: string) => {
			if (verificationCode.length == VERIFICATION_CODE_LENGTH) {
				verificationCode = verificationCode.toUpperCase()

				// Second try sending message. Now with our email verification code embedded.
				this.sendContactFormular({
					firstName: this.contactFormGroup.controls['firstName'].value as string,
					surName: this.contactFormGroup.controls['surName'].value as string,
					email: this.contactFormGroup.controls['email'].value as string,
					message: this.contactFormGroup.controls['message'].value as string,
					captcha: this.contactFormGroup.controls['captcha'].value as string,
					mailVerificationCode: verificationCode
				}).then(res => {
					this.handleContactFormularResponse(res);
				})
			}
		});
	}

	handleContactFormularResponse(response: ContactFormularResponse) {
		switch (response) {
			case ContactFormularResponse.SUCCESS:
				this.loadingser.showLoadingOverlay(["Vielen Dank.", "Deine Nachricht ist soeben bei uns eingegangen.", "Wir werden uns schnellstmöglich bei Dir melden."], "/images/lottiefiles/success.json", false, false, "", 0, (nt: string) => { });
				this.contactFormGroup.reset();
				break;
			case ContactFormularResponse.EMAIL_VERIFICATION_REQUIRED:
				this.showEmailVerificationRequiredOverlay();
				break;
			case ContactFormularResponse.CAPTCHA_INVALID:
				this.loadingser.showLoadingOverlay(["Captcha ist ungültig.", "Bitte erneut lösen und absenden."], "/images/lottiefiles/error.json", true, false, "", 0, (nt: string) => { });
				break;
			case ContactFormularResponse.EMAIL_VERIFICATION_CODE_INVALID:
				this.showEmailVerificationRequiredOverlay();
				this.loadingser.markInputErronous();
				break;
			case ContactFormularResponse.UNKNOWN_ERROR:
				this.loadingser.showLoadingOverlay(["Oh nein. Es ist ein Fehler aufgetreten.", "Es liegt an uns... nicht an dir.", "Bitte versuche es später nochmal oder nimm Kontakt mit uns über Instagram auf @gennex_official."], "/images/lottiefiles/error.json", true, false, "", 0, (nt: string) => { });
				break;
		}
	}

	submitForm() {
		this.contactFormGroup.updateValueAndValidity();
		if (this.contactFormGroup.valid) {

			this.sendContactFormular({
				firstName: this.contactFormGroup.controls['firstName'].value as string,
				surName: this.contactFormGroup.controls['surName'].value as string,
				email: this.contactFormGroup.controls['email'].value as string,
				message: this.contactFormGroup.controls['message'].value as string,
				captcha: this.contactFormGroup.controls['captcha'].value as string,
				mailVerificationCode: ''
			}).then(res => {
				this.handleContactFormularResponse(res);
			})
		}
	}
}
