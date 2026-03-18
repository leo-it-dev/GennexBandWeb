import { ApiModuleInterfaceB2F, ApiModuleInterfaceF2B } from "./backend_call"

/* Api endpoint calendar */

export type CalendarEntry = {
    title: string,
    description: string,
    date: Date,
    location?: Location,
    locationString: string,
    id: string
}

export type CalendarList = {
    entries: CalendarEntry[]
}

export type Location = {
    lat: number,
    lon: number
}

export interface ApiInterfaceCalendarIn extends ApiModuleInterfaceF2B { };
export interface ApiInterfaceCalendarOut extends ApiModuleInterfaceB2F { calendar: CalendarList };