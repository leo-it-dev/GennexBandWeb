import { ApplicationRef } from "@angular/core";
import { Subject, switchMap, timer } from "rxjs";

export async function timeout(timeoutMs: number) {
    return new Promise<void>((res, _) => {
        let sub = new Subject<void>();
        sub.pipe(switchMap(() => timer(timeoutMs))).subscribe(() => {
            res();
        });
        sub.next();
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