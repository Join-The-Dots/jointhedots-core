import { JSONSchema } from "../ast/schema/schema"
import { MapLike } from 'typescript'
import { ComponentEntry } from './manifold'
import { ComponentManifest, ServiceEntry, ServiceType } from "./interfaces"

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
export interface ComponentService {

   // Component runtime
   getAvailableServices(component: ComponentEntry): ServiceType[]
   getService<IService>(component: ComponentEntry, type: ServiceType): Promise<IService>

   // Component management
   createComponent(component: ComponentEntry, descriptor: ComponentManifest): Promise<void>
   updateComponent(component: ComponentEntry, descriptor: ComponentManifest): Promise<void>

   // Descriptor management
   checkDescriptor(descriptor: ComponentManifest): Promise<ComponentChecking>
}

// Component manifest entry "component"
export type ComponentDescriptor = {
   readonly name: ServiceType
   readonly title: string
   readonly icon: string
   readonly services: string[]
   readonly attributes: MapLike<JSONSchema>
}

export const ComponentServiceKey = new ServiceEntry<ComponentService, ComponentDescriptor>("component")

export type ComponentEditorProps<T extends ComponentManifest = ComponentManifest> = {
   descriptor: ComponentDescriptor
   schema: JSONSchema
   manifest: T
   onChange?: (manifest: T) => void
}

export type ComponentEditor<T extends ComponentManifest = ComponentManifest> = {
   panels?: MapLike<{
      icon?: string
      view: React.ComponentType<ComponentEditorProps<T>>
   }>
}

export const ComponentEditorKey = ComponentServiceKey.subservice<ComponentEditor>("editor")
