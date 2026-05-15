export class Watchdog {
    private timer?: NodeJS.Timeout = undefined;

    constructor(private callback: Function, private delay: number) {}

    kick() {
        this.cancel();
        this.timer = setTimeout(() => {
            this.timer = undefined;
            this.callback.bind(this)();
        }, this.delay);
    }

    cancel() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = undefined;
    }
}