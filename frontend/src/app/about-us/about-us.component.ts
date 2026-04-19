import { Component, Input } from '@angular/core';
import { SectionHeaderComponent } from '../section-header/section-header.component';

@Component({
	selector: 'app-about-us',
	imports: [SectionHeaderComponent],
	templateUrl: './about-us.component.html',
	styleUrl: './about-us.component.scss',
})
export class AboutUsComponent {

	constructor() {}

	public SECTION_TITLE_HEIGHT = 100;

	@Input({required: true})
	textList: string[] = [];

	@Input({required: true})
	public name: string = "";
}
