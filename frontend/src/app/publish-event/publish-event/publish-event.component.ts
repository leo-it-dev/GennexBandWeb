import { AfterViewInit, Component } from '@angular/core';
import { ApiInterfaceCalendarPublishIn, ApiInterfaceCalendarPublishOut } from '../../../../../api_common/calendar';
import { PublishFormularResponse, PublishFormularStatusCode } from '../../../../../api_common/verification';
import { CalendarBackendService } from '../../modules/calendar/calendar-backend.service';
import { LoadingoverlayService } from '../../services/loadingoverlay.service';
import { removePathFromURL } from '../../utilities';
import { MainpageComponent } from '../../mainpage/mainpage.component';
import { PageNewComponent } from '../../page-new/page-new.component';

enum EventPublishType {
	NEW, MODIFY, DELETE
}

@Component({
	selector: 'app-publish-event',
	imports: [PageNewComponent],
	templateUrl: './publish-event.component.html',
	styleUrl: './publish-event.component.scss',
})
export class PublishEventComponent implements AfterViewInit {

	constructor(private loadingser: LoadingoverlayService, private backend: CalendarBackendService) { }

	ngAfterViewInit(): void {
		let eventPublishType = undefined;
		if (window.location.pathname.startsWith("/publishEventNew")) {
			eventPublishType = EventPublishType.NEW;
		} else if (window.location.pathname.startsWith("/publishEventMod")) {
			eventPublishType = EventPublishType.MODIFY;
		} else if (window.location.pathname.startsWith("/publishEventDel")) {
			eventPublishType = EventPublishType.DELETE;
		} else {
			return;
		}

		if (eventPublishType == EventPublishType.NEW) {
			this.loadingser.showLoadingOverlay(["Möchtest du ALLE Abonnenten per Mail auf das Event aufmerksam machen?"], "/images/lottiefiles/rocket.json", true, false, "bla", 0, (bla: string) => { }, [
				{ text: "Abbrechen", color: "#aaaaaa" },
				{ text: "Publish", color: "#ff643d" },
			], (btn: string) => {
				if (btn == "Abbrechen") {
					this.loadingser.hideLoadingOverlay();
					removePathFromURL();
				}
				if (btn == "Publish") {
					this.sendPublishForm().then(response => {
						this.handleServerResponse(response, eventPublishType)
					});
				}
			})
		} else if (eventPublishType == EventPublishType.MODIFY) {
			this.loadingser.showLoadingOverlay(["Möchtest du ALLE Abonnenten per Mail auf die Event-Änderung aufmerksam machen?"], "/images/lottiefiles/rocket.json", true, false, "bla", 0, (bla: string) => { }, [
				{ text: "Abbrechen", color: "#aaaaaa" },
				{ text: "Publish Change", color: "#ff643d" },
			], (btn: string) => {
				if (btn == "Abbrechen") {
					this.loadingser.hideLoadingOverlay();
					removePathFromURL();
				}
				if (btn == "Publish Change") {
					this.sendPublishForm().then(response => {
						this.handleServerResponse(response, eventPublishType)
					});
				}
			})
		} else if (eventPublishType == EventPublishType.DELETE) {
			this.loadingser.showLoadingOverlay(["Möchtest du ALLE Abonnenten per Mail auf die Eventabsage aufmerksam machen?"], "/images/lottiefiles/rocket.json", true, false, "bla", 0, (bla: string) => { }, [
				{ text: "Abbrechen", color: "#aaaaaa" },
				{ text: "Publish Deletion", color: "#ff643d" },
			], (btn: string) => {
				if (btn == "Abbrechen") {
					this.loadingser.hideLoadingOverlay();
					removePathFromURL();
				}
				if (btn == "Publish Deletion") {
					this.sendPublishForm().then(response => {
						this.handleServerResponse(response, eventPublishType)
					});
				}
			})
		}
	}

	async sendPublishForm(): Promise<PublishFormularResponse> {
		this.loadingser.showLoadingOverlay(["Bitte warten"], "/images/lottiefiles/paperplane.json", true, false, "", 0, (nt: string) => { });

		return new Promise((res, _) => {
			this.backend.anonymousBackendCall<ApiInterfaceCalendarPublishIn, ApiInterfaceCalendarPublishOut>(CalendarBackendService.API_URL_PUBLISH, {
				token: location.search.split("?t=")[1]
			}).then(async (dat) => {
				switch (dat.result) {
					case PublishFormularStatusCode.PUBLISH_SUCCESS:
						res(PublishFormularResponse.SUCCESS);
						break;
					case PublishFormularStatusCode.INTERNAL_SERVER_ERROR:
					case PublishFormularStatusCode.MALFORMED_REQUEST:
						res(PublishFormularResponse.INTERNAL_ERROR);
						break;
					case PublishFormularStatusCode.TOKEN_INVALID:
						res(PublishFormularResponse.TOKEN_INVALID);
						break;
					case PublishFormularStatusCode.UNKNOWN_EVENT:
						res(PublishFormularResponse.UNKNOWN_EVENT);
						break;
				}
			}).catch(_ => {
				res(PublishFormularResponse.INTERNAL_ERROR);
			});
		});
	}

	handleServerResponse(response: PublishFormularResponse, eventPublishType: EventPublishType) {
		switch (response) {
			case PublishFormularResponse.SUCCESS:
				if (eventPublishType == EventPublishType.NEW) {
					this.loadingser.showLoadingOverlay(["Neues Event erfolgreich in Newsletter-Warteschlange hinterlegt!"], "/images/lottiefiles/success.json", false, false, "", 0, (nt: string) => { });
				}
				else if (eventPublishType == EventPublishType.MODIFY) {
					this.loadingser.showLoadingOverlay(["Modifiziertes Event erfolgreich in Newsletter-Warteschlange hinterlegt!"], "/images/lottiefiles/success.json", false, false, "", 0, (nt: string) => { });
				} else if (eventPublishType == EventPublishType.DELETE) {
					this.loadingser.showLoadingOverlay(["Abgesagtes Event erfolgreich in Newsletter-Warteschlange hinterlegt!"], "/images/lottiefiles/success.json", false, false, "", 0, (nt: string) => { });
				}
				break;
			case PublishFormularResponse.INTERNAL_ERROR:
				this.loadingser.showLoadingOverlay(["Fehler beim Absenden des Newsletter!", "Server log beachten!"], "/images/lottiefiles/error.json", true, false, "", 0, (nt: string) => { });
				break;
			case PublishFormularResponse.TOKEN_INVALID:
				this.loadingser.showLoadingOverlay(["Dein Link ist ungültig.", "Versuche falls vorhanden einen Link aus einer neueren E-Mail zu öffnen."], "/images/lottiefiles/error.json", true, false, "", 0, (nt: string) => { });
				break;
			case PublishFormularResponse.UNKNOWN_EVENT:
				this.loadingser.showLoadingOverlay(["Das angegebene Event ist nicht mehr verfügbar!", "Wurde das Event im Kalender gelöscht?"], "/images/lottiefiles/error.json", true, false, "", 0, (nt: string) => { });
				break;
		}
		removePathFromURL();
	}
}