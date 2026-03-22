import { ApiModuleInterfaceB2F, ApiModuleInterfaceF2B } from "./backend_call"

/* Api endpoint gallery */

export type RenderedPDF = {
    sourceURL: string,
    pagePngURLs: string[]
};

export interface ApiInterfaceRenderedPDFsIn extends ApiModuleInterfaceF2B { };
export interface ApiInterfaceRenderedPDFsOut extends ApiModuleInterfaceB2F { renderedPDFs: RenderedPDF[] };