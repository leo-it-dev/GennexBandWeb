import { ApiModule } from "../../api_module";
import * as nodemailer from 'nodemailer';
import * as config from 'config';
import { MailTemplate } from '../../email/mail-template';
import * as mutex from 'async-mutex';
import { SqlUpdate } from "../../framework/sqlite_database";

export type BatchEmail = {
    destinations: string[],
    subject: string,
    textContent: string,
    htmlContent: string,
    retryCounter: number,
    id: number
}

export class ApiModuleMailer extends ApiModule {

    queuedBatchEmailsMutex = new mutex.Mutex();
    transporter: nodemailer.Transporter;

    async storeBatchEmail(mail: BatchEmail) {
        await this.sqlite().sqlUpdate({
            params: [JSON.stringify(mail.destinations), mail.subject, mail.textContent, mail.htmlContent, mail.retryCounter],
            update: "INSERT INTO batch(destinations,subject,textContent,htmlContent,retryCounter) VALUES (?, ?, ?, ?, ?);"
        });
    }

    // !!!!! DELETE AFTER SUCCESSFULL SEND !!!!
    async readFirstBatchEmail(): Promise<BatchEmail> {
        let mailEntry = await this.sqlite().sqlFetchFirst("SELECT ID,destinations,subject,textContent,htmlContent,retryCounter FROM batch ORDER BY ID desc LIMIT 1", []);
        let mail: BatchEmail = {
            id: mailEntry["ID"],
            destinations: JSON.parse(mailEntry["destinations"]) as string[],
            htmlContent: mailEntry["htmlContent"],
            textContent: mailEntry["textContent"],
            retryCounter: mailEntry["retryCounter"],
            subject: mailEntry["subject"]
        };
        return mail;
    }

    async updateBatchEmailDestinations(emailID: number, destinationAddresses: string[]) {
        await this.sqlite().sqlUpdate({
            params: [destinationAddresses, emailID],
            update: "UPDATE batch SET destinations=? WHERE ID=?"
        })
    }

    async deleteBatchEmail(emailID: number) {
        await this.sqlite().sqlUpdate({
            params: [emailID],
            update: "DELETE FROM batch WHERE ID=?;"
        });
    }

    async countBatchEmails(): Promise<number> {
        let dat = await this.sqlite().sqlFetchFirst("SELECT count(*) from batch;", []);
        return dat["count(*)"] as number;
    }

    modname(): string {
        throw "mailer";
    }
    initialize() {
        // Create a transporter using Ethereal test credentials.
        // For production, replace with your actual SMTP server details.
        this.transporter = nodemailer.createTransport({
            host: config.get("mail.HOSTNAME_SMTP"),
            port: config.get("mail.PORT_SMTP"),
            secure: config.get("mail.SMTP_USE_SSL"),
            auth: {
                user: config.get("mail.SMTP_USERNAME"),
                pass: config.get("mail.SMTP_PASSWORD"),
            }
            // ,logger: true,
            // cdebug: true
        });
    }

    protected sqliteTableCreate(): SqlUpdate | undefined {
        return {
            params: [],
            update: "CREATE TABLE IF NOT EXISTS batch (\
                        ID INTEGER PRIMARY KEY AUTOINCREMENT,\
                        destinations TEXT NOT NULL, \
                        subject TEXT NOT NULL, \
                        textContent TEXT NOT NULL, \
                        htmlContent TEXT NOT NULL, \
                        retryCounter INTEGER DEFAULT 0\
                    \);"
        };
    }

    registerEndpoints(): void {

    }

    // Send an email using async/await
    async queueBatchEmail(batchMail: BatchEmail) {
        if (batchMail.retryCounter > 0) {
            await this.queuedBatchEmailsMutex.runExclusive(async () => {
                await this.storeBatchEmail(batchMail);
                this.logger().warn("Queued batch mail!", { recipientCount: batchMail.destinations.length, subject: batchMail.subject, retryCount: batchMail.retryCounter })
            });
        } else {
            this.logger().warn("Deleting batch mail after exceeding max retry count!", { receipients: batchMail.destinations, subject: batchMail.subject })
        }
    }

    async popBatchEmailChunk(maxContacts: number, callback: (batchMail) => Promise<string[]>) {
        this.queuedBatchEmailsMutex.runExclusive<BatchEmail>(async () => {
            if (await this.countBatchEmails() > 0) {
                // pop the first batch email
                let queuedBatchMail = await this.readFirstBatchEmail();
                // select the first 'maxContacts' email addresses as targets for this email send batch.
                let contactSubset = queuedBatchMail.destinations.slice(0, Math.min(maxContacts, queuedBatchMail.destinations.length))

                // prepare our batch email
                let batchMail: BatchEmail = {
                    id: queuedBatchMail.id,
                    destinations: contactSubset,
                    htmlContent: queuedBatchMail.htmlContent,
                    textContent: queuedBatchMail.textContent,
                    subject: queuedBatchMail.subject,
                    retryCounter: queuedBatchMail.retryCounter
                };

                let rejectedAddresses = await callback(batchMail);

                // if there are still contacts left we need to send the mail to go ahead and throw that email back into our batch buffer.
                // only add those accounts as destination addresses that are not part of this batch's target email addresses.
                if (contactSubset.length < queuedBatchMail.destinations.length) {
                    await this.updateBatchEmailDestinations(
                        queuedBatchMail.id,
                        queuedBatchMail.destinations.filter(email => !batchMail.destinations.includes(email))
                    )
                } else {
                    await this.deleteBatchEmail(queuedBatchMail.id);
                }

                if (rejectedAddresses.length > 0) {
                    await this.queueBatchEmail({
                        destinations: rejectedAddresses,
                        htmlContent: batchMail.htmlContent,
                        textContent: batchMail.textContent,
                        retryCounter: batchMail.retryCounter - 1,
                        subject: batchMail.subject,
                        id: -1,
                    });
                }

                return batchMail;
            } else {
                return undefined;
            }
        });
    }

    // promise return an array of email addresses that did NOT accept the email.
    async sendEmail(mail: BatchEmail): Promise<string[]> {
        this.logger().info("Trying to send mail!", { destinationCount: mail.destinations.length, subject: mail.subject })

        try {
            const info = await this.transporter.sendMail({
                from: config.get('mail.MAIL_FROM_HEADER'),
                to: mail.destinations.join(', '),
                subject: mail.subject,
                text: mail.textContent, // Plain-text version of the message
                html: mail.htmlContent, // HTML version of the message
            });
            this.logger().info("Message sent!", { destinationCount: mail.destinations.length, subject: mail.subject, messageId: info.messageId });
            return info.rejected as string[];
        } catch (error) {
            this.logger().error("Error sending message!", { destinationCount: mail.destinations.length, subject: mail.subject, error: error });
            return mail.destinations;
        }
    }
}
