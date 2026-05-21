import { Component, DOCUMENT, effect, Inject, signal, WritableSignal } from '@angular/core';
import { AboutUsComponent } from '../about-us/about-us.component';
import { BigOverlayComponent } from '../big-overlay/big-overlay.component';
import { BookingComponent } from '../booking/booking.component';
import { CalendarListOverlayComponent } from '../calendar-list-overlay/calendar-list-overlay.component';
import { CalendarListComponent } from '../calendar-list/calendar-list/calendar-list.component';
import { ContactComponent } from '../contact/contact.component';
import { IsVisibleDirective } from '../directives/is-visible-directive';
import { FooterComponent } from '../footer/footer.component';
import { GalleryOverlayComponent } from '../gallery-overlay/gallery-overlay.component';
import { GalleryComponent } from '../gallery/gallery.component';
import { ImpressumComponent } from '../impressum/impressum.component';
import { LoadingoverlayComponent } from '../loadingoverlay/loadingoverlay.component';
import { LogoBlockComponent } from '../logo-block/logo-block.component';
import { PrivacypolicyComponent } from '../privacypolicy/privacypolicy.component';
import { LoadingoverlayService } from '../services/loadingoverlay.service';
import { PageControlService } from '../services/page-control.service';
import { SetlistComponent } from '../setlist/setlist.component';
import { TitlebarComponent } from '../titlebar/titlebar.component';
import { VideoListMobileSelectorComponent } from '../video-list-mobile-selector/video-list-mobile-selector.component';
import { VideoListComponent } from '../video-list/video-list.component';

@Component({
	selector: 'app-page-new',
	imports: [TitlebarComponent, CalendarListComponent, LogoBlockComponent, AboutUsComponent, VideoListComponent, SetlistComponent, GalleryComponent, BookingComponent, ContactComponent, FooterComponent, ImpressumComponent, PrivacypolicyComponent, BigOverlayComponent, LoadingoverlayComponent, IsVisibleDirective, VideoListMobileSelectorComponent, CalendarListOverlayComponent, GalleryOverlayComponent],
	templateUrl: './page-new.component.html',
	styleUrl: './page-new.component.scss',
})
export class PageNewComponent {

	public doShowPrivacyPolicy: WritableSignal<boolean> = signal(false);
	public doShowImpressum: WritableSignal<boolean> = signal(false);

	constructor(public pageControl: PageControlService,
		public loadingOverlay: LoadingoverlayService,
		@Inject(DOCUMENT)
		private document: Document
	) {
		effect(() => {
			if (this.pageControl.preventBodyScrolling() || this.doShowImpressum() ||this.doShowPrivacyPolicy()) {
				this.document.body.classList.add("preventBodyScrolling");
			} else {
				this.document.body.classList.remove("preventBodyScrolling");
			}
		});
	}
}
