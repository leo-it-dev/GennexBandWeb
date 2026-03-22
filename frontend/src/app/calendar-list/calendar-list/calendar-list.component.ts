import { Component, computed, effect, signal, Signal, untracked, WritableSignal } from '@angular/core';
import { CalendarBackendService } from '../../modules/calendar/calendar-backend.service';
import { SectionHeaderComponent } from '../../section-header/section-header.component';
import { CalendarEntry } from '../../../../../api_common/calendar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PageControlService } from '../../services/page-control.service';

export type CalendarEntryWithUrl = {
	entry: CalendarEntry,
	url: SafeResourceUrl,
	attachmentURLs: SafeResourceUrl[]
}

@Component({
	selector: 'app-calendar-list',
	imports: [SectionHeaderComponent],
	templateUrl: './calendar-list.component.html',
	styleUrl: './calendar-list.component.scss',
})
export class CalendarListComponent {

	elements: CalendarEntryWithUrl[] = [];
	bigImageEntry: WritableSignal<CalendarEntryWithUrl | undefined> = signal(undefined);

	constructor(private calendar: CalendarBackendService,
		private domSan: DomSanitizer,
		private pageControl: PageControlService) {

		effect(() => {
			this.elements = [];
			for (let el of this.calendar.getCalendarData()().entries) {
				this.elements.push({
					entry: el,
					url: this.domSan.bypassSecurityTrustResourceUrl("https://www.google.com/maps?q=" + el.location?.lat + "," + el.location?.lon + "&z=15&output=embed"),
					attachmentURLs: el.attachments.map(a => this.domSan.bypassSecurityTrustResourceUrl(this.formatAttachmentUrl(a.url)))
				});
			}
		});

		effect(() => {
			this.pageControl.preventBodyScrolling.set(this.bigImageEntry() != undefined);
		});
	}

	formatDate(date: Date) {
		return (date.getDate() < 10 ? "0" : "") + date.getDate() + "." + ((date.getMonth()+1) < 10 ? "0" : "") + (date.getMonth()+1) + "." + date.getFullYear() + " "
			+ (date.getHours() < 10 ? "0" : "") + date.getHours() + ":" + (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
	}

	formatAttachmentUrl(urlstr: string): string {
		let url = new URL(urlstr);
		switch(url.host) {
			case "drive.google.com":
				// transform: // https://drive.google.com/file/d/<file>/view?usp=drivesdk to https://drive.google.com/uc?export=download&id=<file>
				if (url.pathname.toLowerCase().endsWith("/view")) {
					let fileId = url.pathname.split("\/d\/")[1].split("/view")[0];
					url.pathname = "/uc"
					url.search = "?export=download&id=" + fileId;
				}
				break;
		}
		return url.toString();
	}
}
