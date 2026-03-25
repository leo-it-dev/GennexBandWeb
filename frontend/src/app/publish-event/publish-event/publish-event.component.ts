import { AfterViewInit, Component } from '@angular/core';
import { ApiInterfaceCalendarPublishIn, ApiInterfaceCalendarPublishOut } from '../../../../../api_common/calendar';
import { PublishFormularResponse, PublishFormularStatusCode } from '../../../../../api_common/verification';
import { CalendarBackendService } from '../../modules/calendar/calendar-backend.service';
import { LoadingoverlayService } from '../../services/loadingoverlay.service';

@Component({
	selector: 'app-publish-event',
	imports: [],
	templateUrl: './publish-event.component.html',
	styleUrl: './publish-event.component.scss',
})
export class PublishEventComponent implements AfterViewInit {

	constructor(private loadingser: LoadingoverlayService, private backend: CalendarBackendService) { }

	removePathFromURL() {
		const url = window.location.origin;
		window.history.replaceState({}, document.title, url);
	}

	ngAfterViewInit(): void {
		this.loadingser.showLoadingOverlay(["Möchtest du ALLE Abonnenten per Mail auf das Event aufmerksam machen?"], "/images/rocket.webm", true, false, "bla", 0, (bla: string) => { }, [
			{ text: "Abbrechen", color: "#aaaaaa" },
			{ text: "Publish", color: "#ff643d" },
		], (btn: string) => {
			if (btn == "Abbrechen") {
				this.loadingser.hideLoadingOverlay();
				this.removePathFromURL();
			}
			if (btn == "Publish") {
				this.sendPublishForm().then(response => {
					this.handleServerResponse(response)
				});
			}
		})
	}

	async sendPublishForm(): Promise<PublishFormularResponse> {
		this.loadingser.showLoadingOverlay(["Bitte warten"], "/images/paperplane.webm", true, false, "", 0, (nt: string) => { });

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

	handleServerResponse(response: PublishFormularResponse) {
		switch (response) {
			case PublishFormularResponse.SUCCESS:
				this.loadingser.showLoadingOverlay(["Neues Event erfolgreich an alle Newsletter-Abonnenten versandt"], "/images/success.webm", false, false, "", 0, (nt: string) => { });
				break;
			case PublishFormularResponse.INTERNAL_ERROR:
				this.loadingser.showLoadingOverlay(["Fehler beim Absenden des Newsletter!", "Server log beachten!"], "/images/error.webm", true, false, "", 0, (nt: string) => { });
				break;
			case PublishFormularResponse.TOKEN_INVALID:
				this.loadingser.showLoadingOverlay(["Dein Link ist ungültig.", "Versuche falls vorhanden einen Link aus einer neueren E-Mail zu öffnen."], "/images/error.webm", true, false, "", 0, (nt: string) => { });
				break;
			case PublishFormularResponse.UNKNOWN_EVENT:
				this.loadingser.showLoadingOverlay(["Das angegebene Event ist nicht mehr verfügbar!", "Wurde das Event im Kalender gelöscht?"], "/images/error.webm", true, false, "", 0, (nt: string) => { });
				break;
		}
		this.removePathFromURL();
	}
}