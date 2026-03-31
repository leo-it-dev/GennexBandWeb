import { AfterViewInit, Component, effect, ElementRef, Input, QueryList, Signal, ViewChild, WritableSignal } from '@angular/core';

@Component({
	selector: 'app-dynamic-background-image',
	imports: [],
	templateUrl: './dynamic-background-image.component.html',
	styleUrl: './dynamic-background-image.component.scss'
})
export class DynamicBackgroundImageComponent implements AfterViewInit {

	@Input({ required: true })
	triggers!: WritableSignal<ElementRef<HTMLElement>[]>

	@ViewChild('backgroundImgBack')
	backgroundImageBack!: ElementRef<HTMLImageElement>

	@ViewChild('backgroundImgFront')
	backgroundImageFront!: ElementRef<HTMLImageElement>

	lastActiveTrigger?: ElementRef = undefined;
	ctr = false;

	constructor() {
		effect(() => {
			if (this.triggers().length > 0) {
				this.updateOnScroll();
			}
		})
	}

	handleImageSwap() {
		if (!this.ctr) {
			this.backgroundImageBack.nativeElement.style.opacity = "0";
			this.backgroundImageFront.nativeElement.style.opacity = "1";
		} else {
			this.backgroundImageBack.nativeElement.style.opacity = "1";
			this.backgroundImageFront.nativeElement.style.opacity = "0";
		}
	}

	updateOnScroll() {
		if (this.triggers().length > 0) {
			let activeTrigger: ElementRef | undefined = this.triggers()[0];

			for (let elRef of this.triggers()) {
				let natEl = elRef.nativeElement as HTMLElement
				let bounds = natEl.getBoundingClientRect()
				if (bounds.y < window.innerHeight) {
					// trigger is now scrolled into viewport. Save it. We need to find the trigger that is closest to the bottom of our viewscreen.
					activeTrigger = elRef;
				}
			}

			if (activeTrigger && this.lastActiveTrigger != activeTrigger) {
				this.lastActiveTrigger = activeTrigger;

				let image = activeTrigger.nativeElement.getAttribute("img");
				if (image) {
					this.ctr = !this.ctr;

					if (!this.ctr) {
						this.backgroundImageFront.nativeElement.src = image;
					} else {
						this.backgroundImageBack.nativeElement.src = image;
					}
				}
			}
		}
	}

	ngAfterViewInit(): void {
		this.backgroundImageBack.nativeElement.onload = () => this.handleImageSwap();
		this.backgroundImageFront.nativeElement.onload = () => this.handleImageSwap();

		document.addEventListener("body-scroll", e => {
			e.preventDefault();
			this.updateOnScroll();
		});
	}
}
