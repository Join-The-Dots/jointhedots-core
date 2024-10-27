import { URI } from 'vscode-uri'
import { JSONSchema } from "../ast/schema/schema"

export interface ComponentPublication {
   component_id: string
   icon: string
   title: string
   description?: string
   keywords?: string[]
   tags?: string[]
}

export interface ResourceContent {
   component_id: string
   name: string
   format: string
   content?: Blob
}

export type ComponentManifest = JSONSchema

export interface IComponentProvider {
   search_component_publications(pattern?: string): Promise<ComponentPublication[]>
   get_component_publication(component_id: string): Promise<ComponentPublication>
   get_component_manifest(component_id: string): Promise<ComponentManifest>
}

export interface IResourceLoader {
   load_resource(uri: string): Promise<any>
}

export interface IContentProvider {
   check_content(uri: URI): Promise<string>
   load_content(uri: URI): Promise<Blob>
   store_content(content: Blob, uri: URI): Promise<boolean>
}

export function makeContentKey(component_id: string, norm: string, key?: string): string {
   if (key && key.startsWith("/")) key = key.slice(1)
   if (key) return `${component_id}/${norm}/${key}`
   else return `${component_id}/${norm}`
}

export function parseComponentURI(ref: string): URI {
   if (ref.startsWith("./")) {
      const base = URI.parse(window.location.href)
      const parts = base.path.split("/")
      parts[parts.length - 1] = ref.slice(2)
      return base.with({ path: parts.join("/"), query: "", fragment: "" })
   }
   else if (ref.startsWith("/")) {
      return URI.parse(window.location.href).with({ path: ref, query: "", fragment: "" })
   }
   else {
      return URI.parse(ref)
   }
}
