import { Component } from '@angular/core';
import { ArrowSvgComponent } from '../arrow-svg/arrow-svg.component';
import { MembersBackendService } from '../modules/members/members-backend.service';
import { SectionHeaderComponent } from '../section-header/section-header.component';

@Component({
	selector: 'app-about-us',
	imports: [ArrowSvgComponent],
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
