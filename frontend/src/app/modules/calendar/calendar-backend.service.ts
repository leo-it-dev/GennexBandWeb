import { Injectable, Injector, Signal, signal, WritableSignal } from '@angular/core';
import { ApiInterfaceCalendarIn, ApiInterfaceCalendarOut, CalendarList } from '../../../../../api_common/calendar';
import { BackendService } from '../../api/backend.service';

@Injectable({
	providedIn: 'root',
})
export class CalendarBackendService extends BackendService {

	public static API_URL_CALENDAR = "/module/calendar/calendar"

	private calendarData: WritableSignal<CalendarList> = signal({entries: []});

	name(): string {
		return "Calendar";
	}

	constructor(
		override injector: Injector
	) {
		super(injector)

		this.anonymousBackendCall<ApiInterfaceCalendarIn, ApiInterfaceCalendarOut>(CalendarBackendService.API_URL_CALENDAR).then(dat => {
			this.calendarData.set(dat.calendar);
		}).catch(err => {
			console.error("Error retrieving calendar list: ", err);
		});
	};

	public getCalendarData(): Signal<CalendarList> {
		return this.calendarData;
	}
}
