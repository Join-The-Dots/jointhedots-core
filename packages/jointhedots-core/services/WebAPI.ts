import { JSONSchema } from "../ast/schema/schema"

export interface WebAPIService {
   fetch(path: string, data?: Blob | any, method?: string): Promise<Blob>
   getSchema(path: string): Promise<JSONSchema>
}

