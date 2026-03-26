import { AfterViewInit, Component } from '@angular/core';
import { ApiInterfaceUnsubscribeIn, ApiInterfaceUnsubscribeOut } from '../../../../api_common/subscribe';
import { UnsubscribeFormularResponse, UnsubscribeFormularStatusCodes } from '../../../../api_common/verification';
import { SubscribeBackendService } from '../modules/subscribe/subscribe-backend.service';
import { LoadingoverlayService } from '../services/loadingoverlay.service';

@Component({
	selector: 'app-unsubscribe',
	imports: [],
	templateUrl: './unsubscribe.component.html',
	styleUrl: './unsubscribe.component.scss',
})
export class UnsubscribeComponent implements AfterViewInit {

	constructor(private loadingser: LoadingoverlayService, private backend: SubscribeBackendService) { }

	removePathFromURL() {
		const url = window.location.origin;
		window.history.replaceState({}, document.title, url);
	}

	ngAfterViewInit(): void {
		this.loadingser.showLoadingOverlay(["Möchtest du unseren Newsletter abbestellen?"], "/images/unlink.json", true, false, "bla", 0, (bla: string) => { }, [
			{ text: "Abbrechen", color: "#aaaaaa" },
			{ text: "Abbestellen", color: "#ff643d" },
		], (btn: string) => {
			if (btn == "Abbrechen") {
				this.loadingser.hideLoadingOverlay();
				this.removePathFromURL();
			}
			if (btn == "Abbestellen") {
				this.sendUnsubscribeForm().then(response => {
					this.handleServerResponse(response)
				});
			}
		})
	}

	async sendUnsubscribeForm(): Promise<UnsubscribeFormularResponse> {
		this.loadingser.showLoadingOverlay(["Bitte warten"], "/images/loading.json", true, false, "", 0, (nt: string) => { });

		return new Promise((res, _) => {
			this.backend.anonymousBackendCall<ApiInterfaceUnsubscribeIn, ApiInterfaceUnsubscribeOut>(SubscribeBackendService.API_URL_UNSUBSCRIBE, {
				token: location.search.split("?t=")[1]
			}).then(async (dat) => {
				switch (dat.result) {
					case UnsubscribeFormularStatusCodes.UNSUBSCRIBE_SUCCESS:
						res(UnsubscribeFormularResponse.SUCCESS);
						break;
					case UnsubscribeFormularStatusCodes.ACCOUNT_NOT_FOUND:
						res(UnsubscribeFormularResponse.ACCOUNT_UNKNOWN);
						break;
					case UnsubscribeFormularStatusCodes.TOKEN_INVALID:
						res(UnsubscribeFormularResponse.TOKEN_INVALID);
						break;
					case UnsubscribeFormularStatusCodes.INTERNAL_SERVER_ERROR:
					case UnsubscribeFormularStatusCodes.MALFORMED_REQUEST:
						res(UnsubscribeFormularResponse.UNKNOWN_ERROR);
						break;
				}
			}).catch(_ => {
				res(UnsubscribeFormularResponse.UNKNOWN_ERROR);
			});
		});
	}

	handleServerResponse(response: UnsubscribeFormularResponse) {
		switch (response) {
			case UnsubscribeFormularResponse.SUCCESS:
				this.loadingser.showLoadingOverlay(["Newsletter erfolgreich abgemeldet", "Du erhältst von uns ab sofort keine neuen Nachrichten mehr per E-Mail", "Der Newsletter kann jederzeit erneut über unsere Seite abonniert werden."], "/images/success.json", false, false, "", 0, (nt: string) => { });
				break;
			case UnsubscribeFormularResponse.ACCOUNT_UNKNOWN:
				this.loadingser.showLoadingOverlay(["Unbekannte E-Mail-Adresse", "Dein Link zeigt auf eine E-Mail-Adresse, welche nicht für den Newsletter in unserem System hinterlegt ist."], "/images/warning.json", true, false, "", 0, (nt: string) => { });
				break;
			case UnsubscribeFormularResponse.TOKEN_INVALID:
				this.loadingser.showLoadingOverlay(["Dein Link ist ungültig.", "Versuche falls vorhanden einen Link aus einer neueren E-Mail zu öffnen.", "Alternativ kannst Du uns gerne jederzeit eine kurze E-Mail an contact@gennex.band senden oder per DM auf Instagram @gennex_official und wir löschen die E-Mail-Adresse persönlich aus unserem System."], "/images/error.json", true, false, "", 0, (nt: string) => { });
				break;
			case UnsubscribeFormularResponse.UNKNOWN_ERROR:
				this.loadingser.showLoadingOverlay(["Oh nein. Es ist ein Fehler aufgetreten.", "Es liegt an uns... nicht an dir.", "Bitte versuche es später nochmal oder nimm Kontakt mit uns über Instagram @gennex_official oder E-Mail contact@gennex.band auf."], "/images/error.json", true, false, "", 0, (nt: string) => { });
				break;
		}
		this.removePathFromURL();
	}
}