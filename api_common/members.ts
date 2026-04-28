import { ApiModuleInterfaceB2F, ApiModuleInterfaceF2B } from "./backend_call"

/* Api endpoint members */

export type Member = {
    file: string,
    name: string,
    role: string
}

export interface ApiInterfaceMembersOut extends ApiModuleInterfaceB2F { members: Member[], thumbnails: string, big: string, thumbnailFormat: string };