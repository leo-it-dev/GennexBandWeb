import { getRepeatedScheduler } from "../..";
import { AgentSendEventNotification } from "../../agents/agent-send-event-notification";
import { ApiModule } from "../../api_module";
import { Agent, AgentTrigger } from "./agent";

export class ApiModuleAgentHandler extends ApiModule {

    private agents: Agent[] = [];

    modname(): string {
        return "agent";
    }

    registerEndpoints(): void {}

    initialize() {
        getRepeatedScheduler().scheduleRepeatedEvent(this, "agent-trigger-24H", 60*60*24, (finished) => { this.runTrigger(AgentTrigger.TIME_24H); finished() }, true);
        getRepeatedScheduler().scheduleRepeatedEvent(this, "agent-trigger-12H", 60*60*12, (finished) => { this.runTrigger(AgentTrigger.TIME_12H); finished() }, true);
        getRepeatedScheduler().scheduleRepeatedEvent(this, "agent-trigger-4H",  60*60*4 , (finished) => { this.runTrigger(AgentTrigger.TIME_4H) ; finished() }, true);
        getRepeatedScheduler().scheduleRepeatedEvent(this, "agent-trigger-1H",  60*60*1 , (finished) => { this.runTrigger(AgentTrigger.TIME_1H) ; finished() }, true);
        getRepeatedScheduler().scheduleRepeatedEvent(this, "agent-trigger-5M",  60*5    , (finished) => { this.runTrigger(AgentTrigger.TIME_5M) ; finished() }, true);
        getRepeatedScheduler().scheduleRepeatedEvent(this, "agent-trigger-1M",  60      , (finished) => { this.runTrigger(AgentTrigger.TIME_1M) ; finished() }, true);

        let agentClasses: (new (...args: any[]) => Agent)[] = [
            AgentSendEventNotification
        ];

        for (let agent of agentClasses) {
            let agentInst = new agent();
            agentInst.initialize();
            this.agents.push(agentInst);
        }
    }

    runTrigger(trigger: AgentTrigger) {
        for (let agent of this.agents) {
            agent.processTrigger(trigger);
        }
    }
}