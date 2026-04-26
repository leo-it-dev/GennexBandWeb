import { AfterViewInit, Component } from '@angular/core';
import { MainpageComponent } from '../mainpage/mainpage.component';
import { CalendarBackendService } from '../modules/calendar/calendar-backend.service';
import { PageNewComponent } from '../page-new/page-new.component';

@Component({
	selector: 'app-show-event-url',
	imports: [PageNewComponent],
	templateUrl: './show-event-url.component.html',
	styleUrl: './show-event-url.component.scss',
})
export class ShowEventURLComponent implements AfterViewInit {

	constructor(private calService: CalendarBackendService) {}

	ngAfterViewInit(): void {

	}
}
