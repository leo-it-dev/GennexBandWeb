import { Component, effect, ElementRef, inject, signal, ViewChild, WritableSignal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Attachment, CalendarEntry } from '../../../../../api_common/calendar';
import { ApiInterfaceSubscribeIn, ApiInterfaceSubscribeOut } from '../../../../../api_common/subscribe';
import { subscribeFormularRequestVerification, SubscribeFormularResponse, SubscribeFormularStatusCodes, VERIFICATION_CODE_LENGTH } from '../../../../../api_common/verification';
import { BackendService } from '../../api/backend.service';
import { BigOverlayComponent } from '../../big-overlay/big-overlay.component';
import { ColoredSvgComponent } from '../../colored-svg/colored-svg.component';
import { formBuilderGroupFromInputVerifierTemplate } from '../../formVerifier';
import { AttachmentMapped, CalendarBackendService } from '../../modules/calendar/calendar-backend.service';
import { SubscribeBackendService } from '../../modules/subscribe/subscribe-backend.service';
import { ConfigService } from '../../services/config.service';
import { LoadingoverlayService } from '../../services/loadingoverlay.service';
import { PageControlService } from '../../services/page-control.service';
import { PdfRenderService } from '../../services/pdf-render.service';

@Component({
	selector: 'app-calendar-list',
	imports: [ColoredSvgComponent, ReactiveFormsModule],
	templateUrl: './calendar-list.component.html',
	styleUrl: './calendar-list.component.scss',
})
export class CalendarListComponent {

	elements: CalendarEntry[] = [];

	private formBuilder = inject(FormBuilder);
	public subscribeFormGroup = formBuilderGroupFromInputVerifierTemplate(this.formBuilder, subscribeFormularRequestVerification);

	public isUpcoming(event: CalendarEntry) {
		let today = new Date();
		today.setHours(0, 0, 0, 0);
		return event.date >= today;
	}

	constructor(public calendar: CalendarBackendService,
		private domSan: DomSanitizer,
		private pageControl: PageControlService,
		private pdfRender: PdfRenderService,
		private config: ConfigService,
		private loadingser: LoadingoverlayService,
		private backendService: BackendService) {

		effect(async () => {
			let elements = this.calendar.getCalendarData()().entries;
			if (elements) {
				this.elements = elements;
			} else {
				this.elements = [];
			}
		});

		effect(async () => {
			this.pageControl.preventBodyScrolling.set(this.calendar.bigImageEntry() != undefined);

			let bigImageEntry = this.calendar.bigImageEntry();
			if (bigImageEntry) {
				let mappedAttachments: AttachmentMapped[] = [];
				for (let attachment of bigImageEntry.attachments) {
					let resolvedImageURLs = await this.resolveAttachment(attachment);
					for (let renderedPng of resolvedImageURLs) {
						mappedAttachments.push({
							renderedPng: renderedPng,
							sourceURL: attachment.url
						});
					}
				}
				this.calendar.resolvedBigImage.set({
					entry: bigImageEntry,
					url: this.domSan.bypassSecurityTrustResourceUrl("https://www.google.com/maps?q=" + bigImageEntry.geocoding?.location.lat + "," + bigImageEntry.geocoding?.location.lon + "&z=15&output=embed"),
					attachmentURLs: mappedAttachments
				});

			} else {
				this.calendar.resolvedBigImage.set(undefined);
			}
		});
	}

	formatTime(date: Date) {
		return new Intl.DateTimeFormat("de-DE", { hour: '2-digit', minute: '2-digit', hour12: false }).format(date) + " Uhr";
	}
	formatDate(date: Date) {
		return new Intl.DateTimeFormat("de-DE", { month: 'long', year: 'numeric' }).format(date);
	}
	formatDay(date: Date) {
		return new Intl.DateTimeFormat("de-DE", { day: 'numeric' }).format(date);
	}

	async resolveAttachment(attachment: Attachment): Promise<string[]> {
		if (attachment.mimeType == "application/pdf" || attachment.mimeType.startsWith("image/")) {
			let pdfRenders = await this.pdfRender.awaitPdfRenders();
			let renderedPdf = pdfRenders.find(render => render.sourceURL.toLowerCase() == attachment.url.toLowerCase());
			if (!renderedPdf) {
				return []
			}
			return renderedPdf.pagePngURLs;
		} else {
			return [attachment.url];
		}
	}


	submitForm() {
		let email = this.subscribeFormGroup.get('email');
		if (email) {
			email.updateValueAndValidity();
			if (email.valid) {
				this.loadingser.showLoadingOverlay([], "/images/lottiefiles/bot.json", true, false, "", 0, (nt: string) => { }, undefined, undefined, true, ((token: string) => {
					this.loadingser.hideLoadingOverlay();
					this.subscribeFormGroup.patchValue({
						captcha: token
					});

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
				}));
			}
		}
	}

	handleContactFormularResponse(response: SubscribeFormularResponse) {
		switch (response) {
			case SubscribeFormularResponse.SUCCESS:
				this.loadingser.showLoadingOverlay(["Vielen Dank.", "Wir haben Deine Newsletter-Anmeldung registriert!", "Solltest du zukünftig keine Mails mehr von uns erhalten wollen, kannst Du den Newsletter über den Link in unseren Mails wieder abbestellen."], "/images/lottiefiles/success.json", false, false, "", 0, (nt: string) => { });
				this.subscribeFormGroup.reset();
				break;
			case SubscribeFormularResponse.ALREADY_REGISTERED:
				this.loadingser.showLoadingOverlay(["Vielen Dank.", "Diese E-Mail-Adresse ist bereits in unserem System registriert.", "Du erhältst von uns weiterhin E-Mails über Neuigkeiten und Events."], "/images/lottiefiles/success.json", false, false, "", 0, (nt: string) => { });
				this.subscribeFormGroup.reset();
				break;
			case SubscribeFormularResponse.EMAIL_VERIFICATION_REQUIRED:
				this.showEmailVerificationRequiredOverlay();
				break;
			case SubscribeFormularResponse.CAPTCHA_INVALID:
				this.loadingser.showLoadingOverlay(["Captcha ist ungültig.", "Bitte erneut lösen und absenden."], "/images/lottiefiles/error.json", true, false, "", 0, (nt: string) => { });
				break;
			case SubscribeFormularResponse.EMAIL_VERIFICATION_CODE_INVALID:
				this.showEmailVerificationRequiredOverlay();
				this.loadingser.markInputErronous();
				break;
			case SubscribeFormularResponse.UNKNOWN_ERROR:
				this.loadingser.showLoadingOverlay(["Oh nein. Es ist ein Fehler aufgetreten.", "Es liegt an uns... nicht an dir.", "Bitte versuche es später nochmal oder nimm Kontakt mit uns über Instagram auf @gennex_official."], "/images/lottiefiles/error.json", true, false, "", 0, (nt: string) => { });
				break;
		}
	}

	showEmailVerificationRequiredOverlay() {
		this.loadingser.showLoadingOverlay(["Deine Newsletter-Anmeldung ist fast fertig.", "Bitte prüfe noch dein Mailfach und gib den Code ein, den wir Dir geschickt haben."], "/images/lottiefiles/mailbox.json", true, true, "Email Code", VERIFICATION_CODE_LENGTH, (verificationCode: string) => {
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
		this.loadingser.showLoadingOverlay(["Bitte warten"], "/images/lottiefiles/loading.json", true, false, "", 0, (nt: string) => { });

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
			});
		});
	}
}
