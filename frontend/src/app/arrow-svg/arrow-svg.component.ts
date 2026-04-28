import { Component, ElementRef } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-arrow-svg',
    templateUrl: '../../../public/images/svg/arrow.svg',
    styleUrl: "./arrow-svg.component.scss"
})
export class ArrowSvgComponent {
    constructor(private elementRef: ElementRef) {
        if (elementRef.nativeElement.hasAttribute('col')) {
            const col = elementRef.nativeElement.getAttribute('col');
            elementRef.nativeElement.style.setProperty('--color', col);
        } else {
            elementRef.nativeElement.style.setProperty('--color', "var(--primaryLight)");
        }
    }
}