export async function timeout(timeoutMs: number) {
    return new Promise<void>((res, _) => {
        setTimeout(() => res(), timeoutMs);
    });
}

export function removePathFromURL() {
    const url = window.location.origin;
    window.history.replaceState({}, document.title, url);
}
