import { NgFor } from '@angular/common';
import { AfterViewInit, Component, ElementRef, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { SectionHeaderComponent } from '../section-header/section-header.component';

@Component({
	selector: 'app-gallery',
	imports: [NgFor, SectionHeaderComponent],
	templateUrl: './gallery.component.html',
	styleUrl: './gallery.component.scss'
})
export class GalleryComponent implements AfterViewInit {

	@ViewChildren('diamondImage')
	items?: QueryList<ElementRef>;

	@ViewChild('wrapper')
	wrapper?: ElementRef;

	@ViewChild('bigImageViewer')
	bigImageViewer?: ElementRef;

	@ViewChild('bigImage')
	bigImage?: ElementRef;

	public images = [
		"/images/bandpic/20250802_202012.jpg",
		"/images/bandpic/20250802_210514.jpg",
		"/images/bandpic/20250802_210703.jpg",
		"/images/bandpic/20250802_212721.jpg",
		"/images/bandpic/20250802_213126.jpg",
		"/images/bandpic/20250802_220226.jpg",
		"/images/bandpic/20250802_220619.jpg",
		"/images/bandpic/20250802_221607.jpg",
		"/images/bandpic/20250802_221645.jpg",
		"/images/bandpic/20250802_221646.jpg",
		"/images/bandpic/20250802_221730.jpg",
		"/images/bandpic/20250802_221853.jpg",
		"/images/bandpic/20250802_221910.jpg",
		"/images/bandpic/20250802_221918.jpg",
		"/images/bandpic/20250802_222944.jpg",
		"/images/bandpic/wa1.jpg",
		"/images/bandpic/wa2.jpg",
	];

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

			for (let _item of this.items) {
				let item = (_item.nativeElement as HTMLElement);
				let isOddRow = rowIdx % 2 == 1;
				let oddRowInset = (isOddRow && !screenTooSmallForInset) ? diamondWidth/2 : 0;
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

			let pad = Math.round((containerWidth - maxRowWidth)/2 * 10) / 10.0;
			wrapper.style.paddingLeft = pad + "px"; // center our galery in the parent component
			wrapper.style.paddingRight = pad + "px"; // center our galery in the parent component
		}
	}

	ngAfterViewInit(): void {
		this.updateDiamonds();
	}

	onResize(evt: Event) {
		this.updateDiamonds();
	}

	openBigImage(evt: Event) {
		if (this.bigImageViewer && this.bigImage && evt.target instanceof HTMLImageElement) {
			(this.bigImageViewer.nativeElement as HTMLImageElement).src = (evt.target as HTMLImageElement).src;
			(this.bigImage.nativeElement as HTMLElement).classList.add("showBigImage");
		}
	}

	closeBigImage(evt: Event) {
		if (this.bigImage) {
			(this.bigImage.nativeElement as HTMLElement).classList.remove("showBigImage");
		}
	}
}
