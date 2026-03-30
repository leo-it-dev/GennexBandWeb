import { Injectable, Injector, Signal, signal, WritableSignal } from '@angular/core';
import { ApiInterfaceCalendarIn, ApiInterfaceCalendarOut, Calendar, CalendarEntry } from '../../../../../api_common/calendar';
import { BackendService } from '../../api/backend.service';
import { removePathFromURL } from '../../utilities';

@Injectable({
	providedIn: 'root',
})
export class CalendarBackendService extends BackendService {

	public static API_URL_CALENDAR = "/module/calendar/calendar"
	public static API_URL_PUBLISH  = "/module/calendar/publish-event-to-newsletter"

	private calendarData: WritableSignal<Calendar> = signal({entries: []});

	public bigImageEntry: WritableSignal<CalendarEntry | undefined> = signal(undefined);

	name(): string {
		return "Calendar";
	}

	constructor(
		override injector: Injector
	) {
		super(injector)

		this.anonymousBackendCall<ApiInterfaceCalendarIn, ApiInterfaceCalendarOut>(CalendarBackendService.API_URL_CALENDAR).then(dat => {
			for(let e of dat.calendar.entries) {
				e.date = new Date(e.date);
			}

			this.calendarData.set(dat.calendar);

			let eventID = location.search.split("?eid=")[1];
			if (eventID) {
				this.bigImageEntry.set(dat.calendar.entries.find(e => e.id == eventID));
			}

		}).catch(err => {
			console.error("Error retrieving calendar list: ", err);
		});
	};

	public getCalendarData(): Signal<Calendar> {
		return this.calendarData;
	}
}
