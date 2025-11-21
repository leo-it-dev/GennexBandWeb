import { Component, Input } from '@angular/core';

@Component({
	selector: 'app-parallax-scroller-slot',
	imports: [],
	templateUrl: './parallax-scroller-slot.component.html',
	styleUrl: './parallax-scroller-slot.component.scss'
})
export class ParallaxScrollerSlotComponent {

	@Input({required: true})
	title: string = "";

	@Input({required: true})
	imgUrl: string = "";

}