import { getBaseURL } from "../..";
import { Calendar, CalendarEntry } from "../../../api_common/calendar";
import { ApiModuleLazy } from "../../api_module";
import { ApiModuleRenderedPDFs } from "../renderedpdf/api_renderedpdf";

let apiRenderedPDF = new ApiModuleLazy(ApiModuleRenderedPDFs);

let cachedEventSchemata: object[];
let lastCalendarSyncTokenState = "";

export function getEventMarkupScheme(calendar: Calendar, syncToken: string): object[] {
    if (syncToken != lastCalendarSyncTokenState) {
        cachedEventSchemata = calendar.entries.map(e => generateSchemeFromEvent(e));
    }
    return cachedEventSchemata;
}

function generateSchemeFromEvent(event: CalendarEntry) {
    let renderedImages = event.attachments.map(att => apiRenderedPDF.get().findRenderedPdf(att.url) || []).flat().map(path => getBaseURL() + path.replace(/^\//, ''));

    let eventSeoMarkupSchema = {
        "@type": "Event",
        "@id": "https://gennex.band/#event-" + event.date.getDate() + "-" + (event.date.getMonth() + 1) + "-" + event.date.getFullYear(),
        name: event.title,
        description: event.description,
        startDate: event.date.toISOString(),
        // endDate: "2026-07-16T01:00:00+02:00",
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",

        image: renderedImages,

        location: {
            "@type": "Place",
            name: event.locationString.split(",")[0],
            address: {
                "@type": "PostalAddress",
                streetAddress: event.geocoding?.streetAddress ?? "",
                addressLocality: event.geocoding?.addressLocality ?? "",
                addressRegion: event.geocoding?.addressRegion ?? "",
                postalCode: String(event.geocoding?.postalCode ?? 0),
                addressCountry: event.geocoding?.addressCountry ?? ""
            },
            geo: {
                "@type": "GeoCoordinates",
                latitude: event.geocoding?.location.lat,
                longitude: event.geocoding?.location.lon,
            }
        },

        performer: {
            "@type": "MusicGroup",
            "@id": "https://gennex.band/#musicgroup",
            "name": "GENNEX"
        },

        organizer: {
            "@type": "Organization",
            "@id": "https://gennex.band/#business",
            name: "GENNEX"
        },

        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "EUR",
            url: "https://gennex.band/#gigs-link",
            availability: "https://schema.org/FreeEvent"
        }
    }
    return eventSeoMarkupSchema;
}