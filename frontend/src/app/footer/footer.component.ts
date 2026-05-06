import { Component, EventEmitter, Output } from '@angular/core';

@Component({
	selector: 'app-footer',
	imports: [],
	templateUrl: './footer.component.html',
	styleUrl: './footer.component.scss',
})
export class FooterComponent {

	@Output()
	onImpressum = new EventEmitter<void>();

	@Output()
	onPrivacyPolicy = new EventEmitter<void>();

}
