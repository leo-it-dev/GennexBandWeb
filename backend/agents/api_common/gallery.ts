import { ApiModuleInterfaceB2F, ApiModuleInterfaceF2B } from "./backend_call"

/* Api endpoint gallery */

export interface ApiInterfaceGalleryIn extends ApiModuleInterfaceF2B { };
export interface ApiInterfaceGalleryOut extends ApiModuleInterfaceB2F { files: string[], thumbnails: string, big: string, thumbnailFormat: string };