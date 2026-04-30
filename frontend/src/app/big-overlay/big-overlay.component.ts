import { Component, EventEmitter, Output } from '@angular/core';

@Component({
	selector: 'app-big-overlay',
	imports: [],
	templateUrl: './big-overlay.component.html',
	styleUrl: './big-overlay.component.scss',
})
export class BigOverlayComponent {

	@Output()
	public close = new EventEmitter<void>();

	signalClose() {
		this.close.emit();
	}
}
