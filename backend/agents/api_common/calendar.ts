import { ApiModuleInterfaceB2F, ApiModuleInterfaceF2B } from "./backend_call"
import { PublishFormularStatusCode } from "./verification";

/* Api endpoint calendar */

export enum CalendarEntryState {
    CREATED = "CREATED",
    MODIFIED = "MODIFIED",
    DELETED = "DELETED",
    DEFAULT = "DEFAULT"
}

export enum Visibility {
    PRIVATE = "PRIVATE", PUBLIC = "PUBLIC"
}

export type Attachment = {
    title: string;
    url: string;
    mimeType: string;
}

export type CalendarEntry = {
    title: string,
    description: string,
    date: Date,
    location?: Location,
    locationString: string,
    id: string,
    state: CalendarEntryState,
    visibility: Visibility
    attachments: Attachment[]
}

export type Calendar = {
    entries: CalendarEntry[]
}

export type Location = {
    lat: number,
    lon: number
}

export interface ApiInterfaceCalendarIn extends ApiModuleInterfaceF2B { };
export interface ApiInterfaceCalendarOut extends ApiModuleInterfaceB2F { calendar: Calendar };

// publish event to all newsletter subscribers
export interface ApiInterfaceCalendarPublishIn extends ApiModuleInterfaceF2B {
    token: string
};
export interface ApiInterfaceCalendarPublishOut extends ApiModuleInterfaceB2F {
    result: PublishFormularStatusCode
};
