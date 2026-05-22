import { ApiModuleInterfaceB2F, ApiModuleInterfaceF2B } from "./backend_call"

/* Api endpoint gallery */

export type DownloadableDocument = {
    name: string,
    url: string,
    size: number
}
export type ForwardLink = {
    name: string,
    url: string
}
export type Sample = {
    name: string,
    url: string
}

export interface ApiInterfaceDocumentsOut extends ApiModuleInterfaceB2F { documents: DownloadableDocument[], links: ForwardLink[], samples: Sample[] };