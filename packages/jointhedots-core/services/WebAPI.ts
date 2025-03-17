import { JSONSchema } from "../ast/schema/schema"
import { MapLike } from "../common/types"
import { ServiceEntry } from "../library/interfaces"

// Service "webapi"
export interface WebAPIService {
   fetch(path: string, data?: Blob | any, method?: string): Promise<Blob>
   getSchema(path: string): Promise<JSONSchema>
}

// Manifest entry "webapi"
export type WebAPIDescriptor = {
   swagger: MapLike<JSONSchema> // TODO with swagger types
}

export const WebAPIServiceKey = new ServiceEntry<WebAPIService, WebAPIDescriptor>("webapi")
