import { Agent, AgentTrigger } from "../modules/agent/agent";

export class AgentSendEventNotification extends Agent {

    constructor() {
        super([
            AgentTrigger.EVENT_CALENDAR_UPDATED
        ]);
    }

    name() {
        return "send-event-notifiations-mail"
    }
    
    initialize() {
        this.logger().info("Agent got initialized 🥳");
    }

    triggeredBy(trigger: AgentTrigger) {
        this.logger().info("Hello from Agent, we just received a brand new trigger event to process 👀: ", trigger);
    }
}