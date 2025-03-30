import { URI } from 'vscode-uri'
import { DocumentationSchema, JSONSchema, ResourceEntry } from "../ast/schema/schema"
import { MapLike } from 'typescript'
import { ComponentEntry } from './manifold'

//-------------------------------------------------------------
// Service: programming resource provided by a component
//-------------------------------------------------------------

export type ServiceType = string

export class ServiceEntry<S extends any, D extends any> {
   constructor(public resource: string) { }
   get(entry: ComponentEntry): S { return entry.getResource(this.resource)?.get<S>() }
   fetch(entry: ComponentEntry): Promise<S> { return entry.fetchResource<S>(this.resource) }
   descriptor(entry: ComponentEntry): D { return entry.acquireResource(this.resource)?.descriptor as D }
   subservice<T extends any>(name: string) { return new ServiceEntry<T, D>(`${this.resource}.${name}`) }
}

//-------------------------------------------------------------
// Resource: programming resource
//-------------------------------------------------------------

export interface ResourceContent {
   component_id: ComponentID
   name: string
   format: string
   content?: Blob
}

export interface IResourceLoader {
   load_resource(uri: string): Promise<any>
}

//-------------------------------------------------------------
// Component: distribuable unit providing services
//-------------------------------------------------------------

export type ComponentID = string

// Component publication
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

// Component manifest
export type ComponentManifest = {
   $id: string // Compoenent ID (into publication)
   type?: string // ID of component service to use (into publication)

   // Metadata
   title?: string
   icon?: string
   keywords?: string[] // Keywords helping for user searching (into publication)
   tags?: string[] // Tags for filtering helping (into publication)
   doc?: DocumentationSchema

   // Services
   services?: MapLike<ResourceEntry> // Resources providing specific services interfaces

} & MapLike<any>

export type ComponentFilter = {
   query: string
   pattern: RegExp
   keywords: string[]
   tags: string[]
   types: string[]
   services: string[]
}

export interface IComponentPublisher {
   search_component_publications(filter: ComponentFilter): Promise<ComponentPublication[]>
   get_component_publication(component_id: string): Promise<ComponentPublication>
}

export interface IComponentProvider extends IComponentPublisher {
   get_component_manifest(component_id: string): Promise<ComponentManifest>
   set_component_manifest(component_id: string, manifest: ComponentManifest): Promise<boolean>
   add_component(manifest: ComponentManifest): Promise<ComponentPublication>
   delete_component(component_id: string): Promise<boolean>
}

export interface IContentProvider {
   check_content(uri: URI): Promise<string>
   load_content(uri: URI): Promise<Blob>
   store_content(content: Blob, uri: URI): Promise<boolean>
}
