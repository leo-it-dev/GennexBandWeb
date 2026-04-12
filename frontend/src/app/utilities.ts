import { ApplicationRef, effect, Injector, runInInjectionContext, Signal } from "@angular/core";
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

export async function computedIsUpdated<T>(injector: Injector, computedSignal: Signal<T>) {
    // Base problem: We need to wait for our computed() elements to be recomputed. These computed elements are based on the above selectedFarmer, etc.
    // Only real way to know of the recomputation is a side-effect (effect()). The effect can only run in an injection context. Also the effect must only contain
    // one signal so it only reacts to that signal being updated. To acchieve this we wrap the effect in a promise and only call the last computed() one time.
    // We finally wait for that promise to resolve and we are able to wait for the computed value to be updated :)
    return new Promise((resolve) => {
        runInInjectionContext(injector, () => {
            let eff = effect(() => {
                computedSignal(); // This is the last value we expect to be updated. So let's wait for that to be updated.
                resolve(null); // Update finished, resolve promise
                eff.destroy(); // Delete effect so it only fires once.
            });
        });
    });
}