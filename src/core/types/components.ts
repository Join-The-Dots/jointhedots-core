import { JSONSchema } from "./schema"
import { MapLike } from "core/types/common"

/* export interface ComponentDescriptor {
   name: string
   baseline?: string

   type?: string
   format?: string
   service?: string

   definition?: JSONSchema
   description?: string
   location?: string

   module?: string
   proxied?: true | EntriesMap
   aliases?: MapLike<string>

   uses?: string[]

   //[metadata: string]: any
} */

export interface ComponentEntry {
   component_id: string
   name: string
   service: string
   location: string
}

export interface ComponentPublication {
   component_id: string
   icon: string
   title: string
   description: string
   keywords?: string[]
   tags?: string[]
}

export interface ComponentResource {
   component_id: string
   name: string
   format: string
   content?: Blob
}

export type ContentUID = string

export type FileURI = string

export type FileDirectory = {
   [name: string]: FileURI
}

export type Entry = {
   identifier?: string
   entry?: string
   required?: boolean
}

export type EntriesMap = { "."?: Entry } | {
   ".": never
   [key: string]: EntriesMap
}
