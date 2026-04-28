import { Component, Input } from '@angular/core';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { ArrowSvgComponent } from '../arrow-svg/arrow-svg.component';
import { MembersBackendService } from '../modules/members/members-backend.service';

@Component({
	selector: 'app-about-us',
	imports: [SectionHeaderComponent, ArrowSvgComponent],
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
