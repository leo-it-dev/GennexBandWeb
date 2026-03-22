export abstract class MailTemplate {

    abstract getSubject(): string;
    abstract getTextContent(): string;
    abstract getHtmlContent(): string;

}