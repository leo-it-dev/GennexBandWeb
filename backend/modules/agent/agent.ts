import { getLogger } from "../../logger";
import { AgentTrigger } from "./agent_trigger";

export abstract class Agent {

    private triggers: (new (...args) => AgentTrigger)[];

    private _logger = getLogger("agent-" + this.name());

    constructor(triggers: (new (...args) => AgentTrigger)[]) {
        this.triggers = triggers;
        this.logger().info("Initialized new agent!", { agent: this.name(), triggers: this.triggers });
    }

    public processTrigger(trigger: AgentTrigger) {
        if (this.triggers.find(t => trigger instanceof t) != undefined) {
            this.triggeredBy(trigger);
        }
    }

    protected logger() {
        return this._logger;
    }

    abstract name();
    abstract initialize();
    abstract triggeredBy(trigger: AgentTrigger);
}