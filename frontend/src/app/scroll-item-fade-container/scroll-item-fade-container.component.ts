import { AfterViewInit, Component, ElementRef, HostListener, Input, QueryList, Renderer2, ViewChild, ViewChildren } from '@angular/core';
import { SectionHeaderComponent } from '../section-header/section-header.component';

@Component({
	selector: 'app-scroll-item-fade-container',
	imports: [SectionHeaderComponent],
	templateUrl: './scroll-item-fade-container.component.html',
	styleUrl: './scroll-item-fade-container.component.scss',
})
export class ScrollItemFadeContainerComponent implements AfterViewInit {

	constructor(private elRef: ElementRef,
				private renderer: Renderer2) {}

	public SECTION_TITLE_HEIGHT = 100;

	@ViewChild('text')
	private text: ElementRef | undefined = undefined;

	@ViewChildren('scrollItem')
	private scrollItems!: QueryList<ElementRef>;

	@Input({required: true})
	textList: string[] = [];

	sumItemHeight = 0;

	@HostListener('window:resize')
	onResize() {
		// scroll animation items
		let pageHeight = document.body.getBoundingClientRect().height - this.SECTION_TITLE_HEIGHT;
		let parentContainer = this.scrollItems.get(0)?.nativeElement.parentElement;
		let accumTopOffset = parseInt(getComputedStyle(parentContainer).paddingTop ?? "0");

		let sumItemHeight = 0;
		for (let item of this.scrollItems) {
			sumItemHeight += item.nativeElement.getBoundingClientRect().height;
		}
		let offsetForCenterPositionTop = Math.max((pageHeight / 2) - (sumItemHeight / 2), 0);
		accumTopOffset += offsetForCenterPositionTop;

		for (let item of this.scrollItems) {
			this.renderer.setStyle(item.nativeElement, 'top', accumTopOffset + 'px');
			accumTopOffset += item.nativeElement.getBoundingClientRect().height;
		}

		this.sumItemHeight = sumItemHeight;
	}

	ngAfterViewInit(): void {
		this.onResize();

		document.addEventListener("body-scroll", e => {
			e.preventDefault();
			let parentContainer = (this.scrollItems.get(0)?.nativeElement as HTMLElement).parentElement!;
			let parentBounds = parentContainer.getBoundingClientRect();
			let screenHeight = window.innerHeight - this.SECTION_TITLE_HEIGHT;
			let oversizeHeight = Math.max(0, this.sumItemHeight - screenHeight);
			let parentContainerScrollPercent = -(parentBounds.top / (parentBounds.height - screenHeight));

			for (let i = 0; i < this.scrollItems.length; i++) {
				let scrollItem = this.scrollItems.get(i)?.nativeElement;
				let elRect = scrollItem.getBoundingClientRect();
				let scrollPercentTop = Math.min(1.0, Math.max(0.0, 1.0 - (elRect.top - parseInt(getComputedStyle(scrollItem).top)) / 200));
				let scrollPercentBtm = (this.elRef.nativeElement.getBoundingClientRect().bottom - oversizeHeight - elRect.bottom) / 200;
				let scrollPercent = Math.min(scrollPercentTop, scrollPercentBtm);
				this.renderer.setStyle(scrollItem, 'opacity', scrollPercent.toString());

				if (i == 0) {
					this.renderer.setStyle(this.text?.nativeElement, 'backdrop-filter', 'blur(' + (scrollPercentTop * 10).toString() + 'px)');
				}
			}

			this.renderer.setStyle(parentContainer, 'transform', 'translateY(-' + (parentContainerScrollPercent * oversizeHeight) + 'px)');
		});
	}
}
