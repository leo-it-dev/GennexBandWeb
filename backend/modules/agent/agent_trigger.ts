import { CalendarEntry } from "../../../api_common/calendar";

export abstract class AgentTrigger {}

export class AgentTrigger24H extends AgentTrigger {}
export class AgentTrigger12H extends AgentTrigger {}
export class AgentTrigger4H extends AgentTrigger {}
export class AgentTrigger1H extends AgentTrigger {}
export class AgentTrigger5M extends AgentTrigger {}
export class AgentTrigger1M extends AgentTrigger {}

export class AgentTriggerCalendarCreate extends AgentTrigger {
    calendarEntries: CalendarEntry[];

    constructor(calendarEntries: CalendarEntry[]) {
        super();
        this.calendarEntries = calendarEntries;
    }
}

export class AgentTriggerCalendarModify extends AgentTrigger {
    calendarEntries: CalendarEntry[];

    constructor(calendarEntries: CalendarEntry[]) {
        super();
        this.calendarEntries = calendarEntries;
    }
}

export class AgentTriggerCalendarDelete extends AgentTrigger {
    calendarEntries: CalendarEntry[];

    constructor(calendarEntries: CalendarEntry[]) {
        super();
        this.calendarEntries = calendarEntries;
    }
}