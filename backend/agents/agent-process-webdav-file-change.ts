import { Agent } from "../modules/agent/agent";
import { AgentTrigger, AgentTriggerWebDavFileCreate, AgentTriggerWebDavFileModify } from "../modules/agent/agent_trigger";

export class AgentProcessWebDavFileChange extends Agent {

    constructor() {
        super([
            AgentTriggerWebDavFileCreate,
            AgentTriggerWebDavFileModify,
        ]);
    }

    name() {
        return "process-webdav-file-change"
    }

    initialize() {

    }

    async triggeredBy(trigger: AgentTrigger) {
        this.logger().info("WebDav agent got triggered by event: ", {trigger: trigger});
    }
}