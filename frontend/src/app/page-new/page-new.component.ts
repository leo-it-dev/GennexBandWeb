import { Component, DOCUMENT, effect, Inject } from '@angular/core';
import { TitlebarComponent } from '../titlebar/titlebar.component';
import { CalendarListComponent } from '../calendar-list/calendar-list/calendar-list.component';
import { LogoBlockComponent } from '../logo-block/logo-block.component';
import { AboutUsComponent } from '../about-us/about-us.component';
import { VideoListComponent } from '../video-list/video-list.component';
import { SetlistComponent } from '../setlist/setlist.component';
import { GalleryComponent } from '../gallery/gallery.component';
import { BookingComponent } from '../booking/booking.component';
import { ContactComponent } from '../contact/contact.component';
import { FooterComponent } from '../footer/footer.component';
import { PageControlService } from '../services/page-control.service';

@Component({
	selector: 'app-page-new',
	imports: [TitlebarComponent, CalendarListComponent, LogoBlockComponent, AboutUsComponent, VideoListComponent, SetlistComponent, GalleryComponent, BookingComponent, ContactComponent, FooterComponent],
	templateUrl: './page-new.component.html',
	styleUrl: './page-new.component.scss',
})
export class PageNewComponent {

	constructor(public pageControl: PageControlService,
		@Inject(DOCUMENT)
		private document: Document
	) {
		effect(() => {
			if (this.pageControl.preventBodyScrolling()) {
				this.document.body.classList.add("preventBodyScrolling");
			} else {
				this.document.body.classList.remove("preventBodyScrolling");
			}
		});
	}
}
