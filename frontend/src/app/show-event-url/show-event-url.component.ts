import { AfterViewInit, Component, effect } from '@angular/core';
import { removePathFromURL } from '../utilities';
import { CalendarBackendService } from '../modules/calendar/calendar-backend.service';

@Component({
	selector: 'app-show-event-url',
	imports: [],
	templateUrl: './show-event-url.component.html',
	styleUrl: './show-event-url.component.scss',
})
export class ShowEventURLComponent implements AfterViewInit {

	constructor(private calService: CalendarBackendService
	) {}

	ngAfterViewInit(): void {

	}
}
