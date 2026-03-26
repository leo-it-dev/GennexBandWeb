export async function timeout(timeoutMs: number) {
    return new Promise<void>((res, _) => {
        setTimeout(() => res(), timeoutMs);
    });
}