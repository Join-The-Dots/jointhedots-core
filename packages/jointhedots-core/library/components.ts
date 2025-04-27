import { URI } from 'vscode-uri'
import { DocumentationSchema, JSONSchema, ResourceEntry } from "../ast/schema/schema"
import { MapLike } from 'typescript'
import { ComponentEntry } from './manifold'

//-------------------------------------------------------------
// Service: programming resource provided by a component
//-------------------------------------------------------------

export type ServiceType = string

export class ServiceEntry<Instance extends any, Spec extends any> {
   constructor(public resource: string) { }
   get(entry: ComponentEntry): Instance { return entry.getResource(this.resource)?.get<Instance>() }
   fetch(entry: ComponentEntry): Promise<Instance> { return entry.fetchResource<Instance>(this.resource) }
   spec(entry: ComponentEntry): Spec { return entry.acquireResource(this.resource)?.spec as Spec }
   subservice<T extends any>(name: string) { return new ServiceEntry<T, Spec>(`${this.resource}.${name}`) }
}

//-------------------------------------------------------------
// Component model: distribuable unit providing services
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
   description?: string
   keywords?: string[] // Keywords helping for user searching (into publication)
   tags?: string[] // Tags for filtering helping (into publication)
   doc?: DocumentationSchema

   // Specifications
   specs?: MapLike<any>

   // Services
   services?: MapLike<ResourceEntry> // Resources providing specific services interfaces

}

//-------------------------------------------------------------
// Component controller: Component manifest entry "component"
//-------------------------------------------------------------

// Component manifest schema
export type ComponentSchema = {
   readonly name: ServiceType
   readonly title: string
   readonly icon: string
   readonly attributes: MapLike<JSONSchema>
}

export interface ComponentManifestIssue {
   level: "error" | "warn" | "info"
   message: string
   fix?(descriptor: ComponentManifest): Promise<ComponentManifest>
}

export interface ComponentChecking {
   fixed?: ComponentManifest
   issues?: ComponentManifestIssue[]
}

// Component service "component"
export interface ComponentController {

   // Component management
   createComponent(component: ComponentEntry, descriptor: ComponentManifest): Promise<void>
   updateComponent(component: ComponentEntry, descriptor: ComponentManifest): Promise<void>

   // Descriptor management
   checkDescriptor(descriptor: ComponentManifest): Promise<ComponentChecking>
}

export const ComponentControllerKey = new ServiceEntry<ComponentController, ComponentSchema>("component")

export type ComponentEditorProps<T extends ComponentManifest = ComponentManifest> = {
   descriptor: ComponentSchema
   schema: JSONSchema
   manifest: T
   created?: boolean
   onChange: (manifest: T) => void
   onValidate: (manifest: T) => void
   onCancel: () => void
}

export type ComponentEditor<T extends ComponentManifest = ComponentManifest> = {
   creator: React.ComponentType<ComponentEditorProps<T>>
   editor: React.ComponentType<ComponentEditorProps<T>>
}

export const ComponentEditorKey = ComponentControllerKey.subservice<ComponentEditor>("editor")

//-------------------------------------------------------------
// Component providers
//-------------------------------------------------------------

export type ComponentFilter = {
   query: string
   pattern: RegExp
   keywords: string[]
   tags: string[]
   types: string[]
   services: string[]
}

export interface IResourceLoader {
   load_resource(uri: string): Promise<any>
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
