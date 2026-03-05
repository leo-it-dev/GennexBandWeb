import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, QueryList, Signal, signal, ViewChild, ViewChildren, WritableSignal } from '@angular/core';
import { SmoothLoadImgComponent } from '../smooth-load-img/smooth-load-img.component';

@Component({
	selector: 'app-diamond-image-map',
	imports: [SmoothLoadImgComponent],
	templateUrl: './diamond-image-map.component.html',
	styleUrl: './diamond-image-map.component.scss'
})
export class DiamondImageMapComponent implements AfterViewInit {

	@ViewChildren('diamondImage')
	items?: QueryList<ElementRef>;

	@ViewChild('wrapper')
	wrapper?: ElementRef;

	@ViewChild('bigImageViewer')
	bigImageViewer?: ElementRef;

	@ViewChild('bigImage')
	bigImage?: ElementRef;

	galleryPreviewItems: WritableSignal<number[]> = signal([]);

	@Output()
	imageClicked: EventEmitter<string> = new EventEmitter<string>();

	@Input({ required: true })
	public images: Signal<string[]> = signal([]);

	@Input({ required: true })
	public parentContainer?: ElementRef = undefined;

	@Input({ required: true })
	public slideshow: boolean = false;

	@Input({ required: true })
	public heightCrop: boolean = false;

	constructor() { }

	setClass(obj: HTMLElement, className: string, set: boolean) {
		if (set && !obj.classList.contains(className)) {
			obj.classList.add(className);
		}
		if (!set && obj.classList.contains(className)) {
			obj.classList.remove(className);
		}
	}

	updateDiamonds() {
		let wrapper = (this.wrapper?.nativeElement as HTMLElement);

		if (this.items && this.items.get(0)) {
			let diamondSize = parseInt(window.getComputedStyle((this.wrapper?.nativeElement as HTMLElement)).getPropertyValue("--size"));
			let diamondWidth = diamondSize * 1.414 + 1; // +1 fixes browser rounding problems
			let containerWidth = (this.wrapper?.nativeElement as HTMLElement).getBoundingClientRect().width;
			let rowWidth = 0;
			let rowIdx = 0;
			let firstOfRow = false;
			let maxRowWidth = 0;
			let screenTooSmallForInset = (diamondWidth * 1.5) > containerWidth;
			let containerHeight = (this.parentContainer?.nativeElement as HTMLElement).getBoundingClientRect().height;

			let requiredDiamondsForPreview = Math.ceil(containerHeight / diamondSize) * Math.ceil(containerWidth / diamondSize);
			if (requiredDiamondsForPreview != this.galleryPreviewItems().length) {
				this.galleryPreviewItems.set([...Array(requiredDiamondsForPreview).keys()]);
			}

			if (!window.matchMedia("(max-width: 700px)").matches) {
				for (let _item of this.items) {
					let item = (_item.nativeElement as HTMLElement);
					let isOddRow = rowIdx % 2 == 1;
					let oddRowInset = (isOddRow && !screenTooSmallForInset) ? diamondWidth / 2 : 0;
					rowWidth += diamondWidth;
					this.setClass(item, "noInsetScreenToSmall", screenTooSmallForInset);
					this.setClass(item, "firstOfRow", firstOfRow && !screenTooSmallForInset);
					this.setClass(item, "oddRow", isOddRow);
					firstOfRow = false;

					if ((rowWidth + diamondWidth + oddRowInset > containerWidth)) {
						// new row
						firstOfRow = true;
						maxRowWidth = Math.max(maxRowWidth, rowWidth + oddRowInset);
						rowWidth = 0;
						rowIdx++;
					}
				}

				let pad = Math.round((containerWidth - maxRowWidth) / 2 * 10) / 10.0;
				wrapper.style.paddingLeft = pad + "px"; // center our galery in the parent component
				wrapper.style.paddingRight = pad + "px"; // center our galery in the parent component
			} else {
				for (let _item of this.items) {
					let item = (_item.nativeElement as HTMLElement);
					this.setClass(item, "noInsetScreenToSmall", true);
					this.setClass(item, "firstOfRow", false);
					this.setClass(item, "oddRow", false);
				}
				wrapper.style.paddingLeft = "0px";
				wrapper.style.paddingRight = "0px";
			}
		}
	}

	ngAfterViewInit(): void {
		this.items?.changes.subscribe(() => {
			this.updateDiamonds();
		});

		if (this.items && this.items.length > 0) {
			this.updateDiamonds();
		}

		this.galleryPreviewItems.set([1]);
	}

	onResize(evt: Event) {
		this.updateDiamonds();
	}
}
