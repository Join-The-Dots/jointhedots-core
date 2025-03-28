import { MapLike } from "../utils/helpers"

export type ResourceEntry<ResourceInterface = any> = ResourceLink<ResourceInterface> | {
   type: ResourceLink<ResourceFactory<ResourceInterface>>
   data?: any
}

export type ResourceFactory<ResourceInterface = any> = (data: any) => Promise<ResourceInterface>

export type ResourceLink<ResourceInterface = any> = string

export type ComponentID = string

export type ComponentManifest = {
   $id: string
   type?: string
   name?: string
   resources?: MapLike<ResourceEntry> // Resources catalog with undefined interface
   services?: MapLike<ResourceEntry> // Resources providing specific services interfaces
} & MapLike<any>

export interface ComponentPublication {
   component_id: ComponentID
   type?: string
   icon: string
   title: string
   services?: string[]
   description?: string
   keywords?: string[]
   tags?: string[]
}

export type ComponentCatalogID = string // Identifier of catalog

export type ComponentCatalogsDescriptor = {
   name: string
   baseline: string
   components: { [id: ComponentID]: string }
   catalogs: { [id: ComponentCatalogID]: string }
}

export function checkComponentManifest(manif: ComponentManifest, path: string): Error {
   if (typeof manif.$id !== "string") {
      return new Error(`Component descriptor shall have '$id' at: ${path}`)
   }
   return null
}

export function makeComponentPublication(manif: ComponentManifest): ComponentPublication {
   const id = manif.$id
   return {
      component_id: id,
      type: manif.type,
      icon: manif.icon,
      title: manif.title || manif.name || id,
      services: manif.services ? Object.keys(manif.services) : [],
      description: manif.description || "",
      keywords: manif.keywords,
      tags: manif.tags,
   }
}
