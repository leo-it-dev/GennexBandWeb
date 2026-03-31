import { ApplicationRef, ElementRef, Injector } from "@angular/core";
import { AppComponent } from "./app.component";

export async function timeout(timeoutMs: number) {
    return new Promise<void>((res, _) => {
        setTimeout(() => res(), timeoutMs);
    });
}

export function removePathFromURL() {
    const url = window.location.origin;
    window.history.replaceState({}, document.title, url);
}

export function getAppRoot(appRef: ApplicationRef): HTMLElement {
    const rootComponent = appRef.components[0]; // ComponentRef
    return rootComponent.location.nativeElement;
}