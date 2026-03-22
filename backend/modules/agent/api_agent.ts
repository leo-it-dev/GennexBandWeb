import { getRepeatedScheduler } from "../..";
import { AgentSendEventNotification } from "../../agents/agent-send-event-notification";
import { ApiModule } from "../../api_module";
import { Agent } from "./agent";
import { AgentTrigger, AgentTrigger12H, AgentTrigger1H, AgentTrigger1M, AgentTrigger24H, AgentTrigger4H, AgentTrigger5M } from "./agent_trigger";

export class ApiModuleAgentHandler extends ApiModule {

    private agents: Agent[] = [];

    modname(): string {
        return "agent";
    }

    registerEndpoints(): void {}

    initialize() {
        getRepeatedScheduler().scheduleRepeatedEvent(this, "agent-trigger-24H", 60*60*24, (finished) => { this.runTrigger(new AgentTrigger24H()); finished() }, true);
        getRepeatedScheduler().scheduleRepeatedEvent(this, "agent-trigger-12H", 60*60*12, (finished) => { this.runTrigger(new AgentTrigger12H()); finished() }, true);
        getRepeatedScheduler().scheduleRepeatedEvent(this, "agent-trigger-4H",  60*60*4 , (finished) => { this.runTrigger(new AgentTrigger4H()) ; finished() }, true);
        getRepeatedScheduler().scheduleRepeatedEvent(this, "agent-trigger-1H",  60*60*1 , (finished) => { this.runTrigger(new AgentTrigger1H()) ; finished() }, true);
        getRepeatedScheduler().scheduleRepeatedEvent(this, "agent-trigger-5M",  60*5    , (finished) => { this.runTrigger(new AgentTrigger5M()) ; finished() }, true);
        getRepeatedScheduler().scheduleRepeatedEvent(this, "agent-trigger-1M",  60      , (finished) => { this.runTrigger(new AgentTrigger1M()) ; finished() }, true);

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