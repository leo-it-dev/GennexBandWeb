import {
    AfterViewInit,
    Directive,
    ElementRef,
    Input,
    OnDestroy,
    Renderer2,
} from '@angular/core'

@Directive({
    selector: '[isVisible]',
    standalone: true,
})
export class IsVisibleDirective implements AfterViewInit, OnDestroy {

    @Input() visibleClass = 'is-visible'

    @Input() threshold: number | number[] = 0.2

    @Input() rootMargin = '0px'

    private observer?: IntersectionObserver

    constructor(
        private el: ElementRef,
        private renderer: Renderer2,
    ) { }

    ngAfterViewInit(): void {

        this.observer = new IntersectionObserver(
            ([entry]) => {

                if (entry.isIntersecting) {
                    this.renderer.addClass(
                        this.el.nativeElement,
                        this.visibleClass,
                    )
                } else {
                    this.renderer.removeClass(
                        this.el.nativeElement,
                        this.visibleClass,
                    )
                }
            },
            {
                threshold: this.threshold,
                rootMargin: this.rootMargin,
            },
        )

        this.observer.observe(this.el.nativeElement)
    }

    ngOnDestroy(): void {
        this.observer?.disconnect()
    }
}