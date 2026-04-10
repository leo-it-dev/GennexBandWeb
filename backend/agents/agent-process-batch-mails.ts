import config from 'config';
import { ApiModuleLazy } from '../api_module';
import { Agent } from "../modules/agent/agent";
import { AgentTrigger, AgentTrigger5M } from "../modules/agent/agent_trigger";
import { ApiModuleMailer } from '../modules/mailer/api_mailer';

export class AgentProcessBatchMails extends Agent {

    MAX_CONTACTS_PER_MAIL = config.get('mail.BATCH_MAX_CONTACTS_PER_MAIL_EVERY_5_MINUTES') as number;
    mailer = new ApiModuleLazy(ApiModuleMailer);

    constructor() {
        super([
            AgentTrigger5M,
        ]);
    }

    name() {
        return "send-batch-email"
    }

    initialize() {

    }

    async triggeredBy(trigger: AgentTrigger) {
        await this.mailer.get().popBatchEmailChunk(this.MAX_CONTACTS_PER_MAIL, async (batchMail) => {
            let rejectedMails = await this.mailer.get().sendEmailImmediately(batchMail);
            return rejectedMails;
        });
    }
}