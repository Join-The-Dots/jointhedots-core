import { URI } from 'vscode-uri'
import { JSONSchema } from "../ast/schema/schema"
import { MapLike } from 'typescript'

export type ComponentID = string

export interface ComponentPublication {
   component_id: ComponentID
   type?: string
   icon?: string
   title: string
   services?: string[]
   description?: string
   keywords?: string[]
   tags?: string[]
}

export interface ResourceContent {
   component_id: ComponentID
   name: string
   format: string
   content?: Blob
}

export type ComponentManifest = Omit<JSONSchema, "type"> & {
   $id: string
   type?: string
   keywords?: string[]
   tags?: string[]
} & MapLike<any>

export interface IComponentPublisher {
   search_component_publications(pattern?: string, services?: string[]): Promise<ComponentPublication[]>
   get_component_publication(component_id: string): Promise<ComponentPublication>
}

export interface IComponentProvider extends IComponentPublisher {
   get_component_manifest(component_id: string): Promise<ComponentManifest>
   set_component_manifest(component_id: string, manifest: ComponentManifest): Promise<boolean>
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

export function makeComponentPublication(manif: ComponentManifest): ComponentPublication {
   const { $id } = manif
   return {
      component_id: $id,
      type: manif.type,
      icon: manif.icon,
      title: manif.title || manif.name || $id,
      services: manif.services ? Object.keys(manif.services) : [],
      description: manif.description || "",
      keywords: manif.keywords,
      tags: manif.tags,
   }
}
