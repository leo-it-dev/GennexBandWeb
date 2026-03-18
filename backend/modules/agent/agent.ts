import { getLogger } from "../../logger";

export enum AgentTrigger {
    TIME_24H = "24h",
    TIME_12H = "12h",
    TIME_4H = "4h",
    TIME_1H = "1h",
    TIME_5M = "5m",
    TIME_1M = "1m",
    EVENT_CALENDAR_UPDATED = "CALENDAR_UPDATE",
}

export abstract class Agent {

    private triggers: AgentTrigger[];

    private _logger = getLogger("agent-" + this.name());

    constructor(triggers: AgentTrigger[]) {
        this.triggers = triggers;
        this.logger().info("Initialized new agent!", { agent: this.name(), triggers: this.triggers });
    }

    public processTrigger(trigger: AgentTrigger) {
        if (this.triggers.includes(trigger)) {
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