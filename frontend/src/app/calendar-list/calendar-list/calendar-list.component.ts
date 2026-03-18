import { Component, computed, effect, Signal } from '@angular/core';
import { CalendarBackendService } from '../../modules/calendar/calendar-backend.service';
import { SectionHeaderComponent } from '../../section-header/section-header.component';
import { CalendarEntry, CalendarList } from '../../../../../api_common/calendar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export type CalendarEntryWithUrl = {
	entry: CalendarEntry,
	url: SafeResourceUrl
}

@Component({
	selector: 'app-calendar-list',
	imports: [SectionHeaderComponent],
	templateUrl: './calendar-list.component.html',
	styleUrl: './calendar-list.component.scss',
})
export class CalendarListComponent {

	elements: CalendarEntryWithUrl[] = [];

	constructor(private calendar: CalendarBackendService,
		private domSan: DomSanitizer) {

		effect(() => {
			this.elements = [];
			for (let el of this.calendar.getCalendarData()().entries) {
				this.elements.push({
					entry: el,
					url: this.domSan.bypassSecurityTrustResourceUrl("https://www.google.com/maps?q=" + el.location?.lat + "," + el.location?.lon + "&z=15&output=embed")
				});
			}
		});
	}

	formatDate(date: Date) {
		return (date.getDate() < 10 ? "0" : "") + date.getDate() + "." + ((date.getMonth()+1) < 10 ? "0" : "") + (date.getMonth()+1) + "." + date.getFullYear() + " "
			+ (date.getHours() < 10 ? "0" : "") + date.getHours() + ":" + (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
	}
}
