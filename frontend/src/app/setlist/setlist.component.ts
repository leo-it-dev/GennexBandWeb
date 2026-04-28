import { Component } from '@angular/core';
import { ConfigService } from '../services/config.service';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';

@Component({
	selector: 'app-setlist',
	imports: [],
	templateUrl: './setlist.component.html',
	styleUrl: './setlist.component.scss',
})
export class SetlistComponent {

	setlistURL?: SafeResourceUrl = undefined;

	constructor(private configService: ConfigService, private domSan: DomSanitizer) {
		this.configService.awaitConfig().then(d => {
			this.setlistURL = domSan.bypassSecurityTrustResourceUrl("https://open.spotify.com/embed/playlist/" + d.spotify_playlist_id + "?utm_source=generator&theme=0");
		});
	}
}
