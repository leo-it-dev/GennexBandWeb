import { runAgentTrigger } from "../..";
import { Calendar, CalendarEntry, CalendarEntryState, Visibility } from "../../../api_common/calendar";
import { AgentTriggerCalendarCreate, AgentTriggerCalendarDelete, AgentTriggerCalendarModify } from "../agent/agent_trigger";
import { CalendarSync } from "./calendar_helper";

export class AccumulatedCalendarFilter {
    private calendar: Calendar = { entries: [] };
    private syncToken = undefined;

    async accumulateCalendarData(newCalendarChunk: CalendarSync) {
        let entriesDeleted: CalendarEntry[] = [];
        let entriesCreated: CalendarEntry[] = [];
        let entriesModified: CalendarEntry[] = [];

        for (let newEntry of newCalendarChunk.calendarList.entries) {
            // at this point we know if the event is deleted or not.
            // we now need to find out if the event already existed or is newly created.
            if (newEntry.state == CalendarEntryState.DELETED) {
                this.calendar.entries = this.calendar.entries.filter(e => e.id != newEntry.id);
                entriesDeleted.push(newEntry);
            } else {
                // check whether we already know about that entry.
                // in that case it is MODIFIED. Otherwise it is CREATED
                let alreadyStoredEntry = this.calendar.entries.find(oldEntry => oldEntry.id == newEntry.id);
                if (alreadyStoredEntry) {
                    newEntry.state = CalendarEntryState.MODIFIED;
                    this.calendar.entries = this.calendar.entries.map(oldEntry => oldEntry.id == newEntry.id ? newEntry : oldEntry)
                    entriesModified.push(newEntry);
                } else {
                    newEntry.state = CalendarEntryState.CREATED;
                    this.calendar.entries.push(newEntry);
                    entriesCreated.push(newEntry);
                }
            }
        }

        // We run this function every time we receive new calendar data, then we assign a tag indicating if the received data chunk
        // resolves to a new calendar entry, modified an existing calendar entry or if a calendar entry has been deleted.
        //
        // The first time we call this function (right after syncing the full calendar on backend start up) we receive a full list of all 
        // calendar entries without having any cached. Therefore every entry we receive that first cycle is tagged as CREATED.
        // we would therefore call all our agents and tell them we created like 20 new calendar entries which is bs.
        // Therefore we don't call our agents on the first sync cycle and only call them once we do an incremental sync (this.syncToken != undefined).
        // From that point on the data we receive is actually indicating -changes- in our calendar.
        if (this.syncToken) {
            if (entriesDeleted.length > 0) await runAgentTrigger(new AgentTriggerCalendarDelete(entriesDeleted));
            if (entriesModified.length > 0) await runAgentTrigger(new AgentTriggerCalendarModify(entriesModified));
            if (entriesCreated.length > 0) await runAgentTrigger(new AgentTriggerCalendarCreate(entriesCreated));
        }

        this.syncToken = newCalendarChunk.syncToken;
    }

    getCurrentCalendarState() {
        return this.calendar;
    }
    getCurrentSyncToken() {
        return this.syncToken;
    }
}
