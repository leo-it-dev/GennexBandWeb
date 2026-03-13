import { Component, computed, Signal } from '@angular/core';
import { CalendarBackendService } from '../../modules/calendar/calendar-backend.service';
import { SectionHeaderComponent } from '../../section-header/section-header.component';
import { CalendarList } from '../../../../../api_common/calendar';

@Component({
	selector: 'app-calendar-list',
	imports: [SectionHeaderComponent],
	templateUrl: './calendar-list.component.html',
	styleUrl: './calendar-list.component.scss',
})
export class CalendarListComponent {

	constructor(private calendar: CalendarBackendService) {

	}

	getCalendarEntries(): Signal<CalendarList> {
		return this.calendar.getCalendarData();
	}
}
