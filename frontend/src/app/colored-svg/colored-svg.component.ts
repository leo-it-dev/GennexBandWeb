import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    standalone: true,
    selector: 'app-colored-svg',
    templateUrl: './colored-svg.component.html',
    styleUrl: "./colored-svg.component.scss"
})
export class ColoredSvgComponent implements OnInit {

    @Input({ required: true })
    public svgSrc = "";

    public svgContent!: SafeHtml;

    constructor(private elementRef: ElementRef, private http: HttpClient, private domSan: DomSanitizer) {
        if (elementRef.nativeElement.hasAttribute('col')) {
            const col = elementRef.nativeElement.getAttribute('col');
            elementRef.nativeElement.style.setProperty('--color', col);
        } else {
            elementRef.nativeElement.style.setProperty('--color', "var(--primaryLight)");
        }
    }

    ngOnInit(): void {
        this.http.get(this.svgSrc, { responseType: 'text' })
            .subscribe(svg => this.svgContent = this.domSan.bypassSecurityTrustHtml(svg));
    }
}