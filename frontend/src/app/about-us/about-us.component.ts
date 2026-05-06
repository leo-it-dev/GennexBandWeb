import { Component } from '@angular/core';
import { ColoredSvgComponent } from '../colored-svg/colored-svg.component';
import { MembersBackendService } from '../modules/members/members-backend.service';

@Component({
	selector: 'app-about-us',
	imports: [ColoredSvgComponent],
	templateUrl: './about-us.component.html',
	styleUrl: './about-us.component.scss',
})
export class AboutUsComponent {

	public memberListShown = false;

	toggleMemberList() {
		this.memberListShown = !this.memberListShown;
	}

	constructor(public backend: MembersBackendService) {
		
	}
}
