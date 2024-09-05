import { print } from "core/common/console"
import { JSONSchema } from "core/types/json-schema"
import { CommonTypes } from "core/types/schema"
import { IContentProvider, IModuleProvider } from "core/components/providers"
import { URI } from "vscode-uri"

export type ComponentManifest = JSONSchema

export class ComponentEntry {
   manifest?: ComponentManifest = undefined
   failure?: Error = undefined
   constructor(
      readonly id: string,
   ) {
   }
   get title(): string {
      return this.id
   }
   get namespace(): string {
      const sep = this.id.indexOf(":")
      switch (sep) {
         case -1:
            return "std"
         case 0:
            return ""
         default:
            return this.id.slice(0, sep)
      }
   }
   get valid(): boolean {
      return this.manifest !== undefined && this.failure === undefined
   }
   get loaded(): boolean {
      return this.manifest !== undefined
   }
   get(): ComponentManifest {
      if (this.manifest === undefined) {
         throw new Error(`Cannot get manifest of not loaded module`)
      }
      return this.manifest
   }
   set(manifest: ComponentManifest) {
      this.manifest = manifest
      return this
   }
   setError(error: Error) {
      this.manifest = null
      this.failure = error
      print.error(error)
      return this
   }
   fetch(): Promise<ComponentManifest> {
      let loading = ComponentsRegistry.loadings.get(this)
      if (loading) return loading

      if (this.manifest === undefined) {
         loading = ComponentsRegistry.storage_provider.load_content(componentURI(this.id, "manifest")).then(async (data) => {
            this.manifest = JSON.parse(await data.text())
            return this.manifest
         }, (e) => {
            this.setError(e)
            return this.manifest
         })
      }
      else {
         loading = Promise.resolve(this.manifest)
      }

      ComponentsRegistry.loadings.set(this, loading)
      return loading
   }
}

export type ImportIdentifier = string | symbol

export class ComponentResource {
   entry: any = undefined
   identifier: string = undefined
   constructor(
      readonly component: ComponentEntry,
      readonly resource: string,
   ) {
      component.fetch()
   }
   get valid(): boolean {
      return this.identifier !== undefined && this.component.valid
   }
   get loaded(): boolean {
      return this.identifier !== undefined
   }
   async fetch<T = any>(): Promise<T> {
      if (this.identifier === undefined) {
         let loading = ComponentsRegistry.loadings.get(this)
         if (loading) return loading

         loading = new Promise(async (resolve) => {

            // Fetch manifest with resource catalog
            const { component } = this
            if (component.loaded === false) {
               await component.fetch()
            }

            // Fetch resource data
            const { manifest } = component
            const ref = manifest.attachments?.[this.resource]
            if (ref) {
               let uri: string = ref
               let identifier: string = null
               const pos = ref.indexOf("#")
               if (pos > 0) {
                  uri = ref.slice(0, pos)
                  identifier = ref.slice(pos + 1) || null
               }
               this.entry = await ComponentsRegistry.modules_provider.load_data(uri)
               this.identifier = identifier
            }
            else {
               this.identifier = null
               this.entry = null
            }
            resolve(this.get())
            ComponentsRegistry.loadings.set(this, null)
         })

         ComponentsRegistry.loadings.set(this, loading)
         return loading
      }
      else {
         return this.get()
      }
   }
   get<T = any>(): T {
      if (this.entry) {
         if (this.identifier !== null) {
            return this.entry?.[this.identifier]
         }
         else {
            return this.entry
         }
      }
      return undefined
   }
   set(data: any) {
      this.entry = data
      this.identifier = null
   }
   get_schema(): JSONSchema {
      const { manifest } = this.component
      if (manifest) {
         if (this.identifier !== null) {
            let schema = manifest.properties?.[this.identifier as string]
            if (schema) return schema
            schema = manifest.additionalProperties
            if (schema) return schema
         }
         else {
            return manifest
         }
      }
      return CommonTypes.any
   }
}

export class ComponentsManifold {
   registry = new Map<string, ComponentEntry>()
   resources = new Map<string, ComponentResource>()
   loadings = new Map<any, Promise<any>>()
   modules_provider: IModuleProvider = null
   storage_provider: IContentProvider = null

   acquireComponent(id: string): ComponentEntry {
      let obj = this.registry.get(id) as ComponentEntry
      if (!obj && typeof id === "string") {
         obj = new ComponentEntry(id)
         this.registry.set(id, obj)
      }
      return obj
   }
   resolveRelativeComponent(ref: string, from: ComponentEntry): ComponentEntry {
      if (from && ref.startsWith("/")) {
         return this.acquireComponent(`${from?.id}${ref}`)
      }
      return null
   }
   acquireResource(object: ComponentEntry, identifier: string): ComponentResource {
      if (object) {
         const ref = `${object.id}#${identifier}`
         let rc = this.resources.get(ref)
         if (!rc) {
            rc = new ComponentResource(object, identifier)
            this.resources.set(ref, rc)
         }
         return rc
      }
      return null
   }
   resolveResource(ref: string, identifier: string): ComponentResource {
      return this.acquireResource(this.acquireComponent(ref), identifier)
   }
}

export function make_content_key(component_id: string, norm: string, key?: string): string {
   if (key && key.startsWith("/")) key = key.slice(1)
   if (key) return `${component_id}/${norm}/${key}`
   else return `${component_id}/${norm}`
}

export function componentURI(id: string, norm: string, key?: string): URI {
   const path = key ? `/${norm}/${key}` : `/${norm}`
   return URI.from({ scheme: "component", authority: id, path })
}

export const ComponentsRegistry = new ComponentsManifold()
