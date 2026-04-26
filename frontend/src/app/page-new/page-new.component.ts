import { Component } from '@angular/core';
import { TitlebarComponent } from '../titlebar/titlebar.component';

@Component({
	selector: 'app-page-new',
	imports: [TitlebarComponent],
	templateUrl: './page-new.component.html',
	styleUrl: './page-new.component.scss',
})
export class PageNewComponent {

	public memberListShown = false;

	toggleMemberList() {
		this.memberListShown = !this.memberListShown;
	}
}
