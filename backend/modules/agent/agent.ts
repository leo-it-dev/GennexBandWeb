import { getLogger } from "../../logger";
import { AgentTrigger } from "./agent_trigger";

export abstract class Agent {

    private triggers: (new (...args: any[]) => AgentTrigger)[];

    private _logger = getLogger("agent-" + this.name());

    constructor(triggers: (new (...args: any[]) => AgentTrigger)[]) {
        this.triggers = triggers;
        this.logger().info("Initialized new agent!", { agent: this.name(), triggers: this.triggers });
    }

    public async processTrigger(trigger: AgentTrigger) {
        if (this.triggers.find(t => trigger instanceof t) != undefined) {
            let result = this.triggeredBy(trigger);
            if (result instanceof Promise) {
                await result;
            }
        }
    }

    protected logger() {
        return this._logger;
    }

    abstract name(): string;
    abstract initialize(): void;
    abstract triggeredBy(trigger: AgentTrigger): void | Promise<any>;
}