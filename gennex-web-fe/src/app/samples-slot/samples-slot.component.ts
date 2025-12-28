import { AfterViewInit, Component, computed, ElementRef, Renderer2, Signal, signal, ViewChild, WritableSignal } from '@angular/core';
import { SlotComponent, SlotScrollCommunication } from '../slot/slot.component';
import { NgFor } from '@angular/common';

@Component({
	selector: 'app-samples-slot',
	imports: [NgFor, SlotComponent],
	templateUrl: './samples-slot.component.html',
	styleUrl: './samples-slot.component.scss'
})
export class SamplesSlotComponent implements AfterViewInit {

	samplesList: WritableSignal<String[]> = signal([
		"Song1",
		"Song2",
		"Song3",
		"Song4",
		"Song5",
		"Song6",
		"Song7",
		"Song8",
		"Song9",
		"Song10",
		"Song11",
		"Song12"
	]);

	scrollCommunication: SlotScrollCommunication = new SlotScrollCommunication();

	constructor() {
		this.scrollCommunication.stickyHeight = computed(() => this.samplesList().length * 500 + "px");
	}

	ngAfterViewInit(): void {
		document.addEventListener("scroll", e => {
			e.preventDefault();
			let heightPerElement = this.scrollCommunication.scrollBlockHeight() / (this.samplesList().length + 1);
			let nthElement = Math.round(this.scrollCommunication.scrollTop() / heightPerElement);
			let snappingScrollTop = (nthElement / this.samplesList().length) * this.scrollCommunication.scrollBlockHeight();
			this.scrollCommunication.scrollOffset.set(snappingScrollTop);
		});
	}
}
