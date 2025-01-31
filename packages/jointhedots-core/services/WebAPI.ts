import { JSONSchema } from "@jointhedots/core"

export interface WebAPIService {
   fetch(path: string, data?: Blob | any, method?: string): Promise<Blob>
   getSchema(path: string): Promise<JSONSchema>
}

