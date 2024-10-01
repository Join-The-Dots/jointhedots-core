import { JSONSchema } from "./JSONSchema"
import { IComponentProvider, IContentProvider, IResourceLoader } from "./interfaces"
import { URI, Utils } from "vscode-uri"
import { CommonResourceProvider } from "./handlers/resource-loader"
import { LocalComponentContent, LocalComponentProvider } from "./handlers/component-catalog-provider"

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
      console.error(error)
      return this
   }
   fetch(): Promise<ComponentManifest> {
      let loading = ComponentsRegistry.loadings.get(this)
      if (loading) return loading

      if (this.manifest === undefined) {
         loading = ComponentsRegistry.content_provider.load_content(makeComponentURI(this.id, "manifest")).then(async (data) => {
            const text = await data.text()
            this.manifest = JSON.parse(text)
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
   acquireResource(object: ComponentEntry | string, identifier: string): ComponentResource {
      const ref = `${this.id}#${identifier}`
      let rc = ComponentsRegistry.resources.get(ref)
      if (!rc) {
         rc = new ComponentResource(this, identifier)
         ComponentsRegistry.resources.set(ref, rc)
      }
      return rc
   }
   getResource(identifier: string): ComponentResource {
      const { manifest } = this
      if (manifest?.attachments?.[identifier]) {
         return this.acquireResource(this, identifier)
      }
      return null
   }
   async getResourceAsync(identifier: string): Promise<ComponentResource> {
      if (this.manifest === undefined) await this.fetch()
      return this.getResource(identifier)
   }
   async fetchResource<T = any>(identifier: string): Promise<T> {
      if (this.manifest === undefined) await this.fetch()
      return this.getResource(identifier)?.fetch<T>()
   }
}

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
               this.entry = await ComponentsRegistry.resources_loader.load_resource(uri)
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
   get url(): string {
      const ref = this.component.manifest?.attachments?.[this.resource]
      if (ref) {
         const base = URI.parse(window.location.href).with({ fragment: null })
         const uri = Utils.joinPath(base, "..", ref.split("#")[0])
         return uri.toString()
      }
      return null
   }
}

export class ComponentsManifold {
   components = new Map<string, ComponentEntry>()
   resources = new Map<string, ComponentResource>()
   loadings = new Map<any, Promise<any>>()

   components_provider: IComponentProvider = null
   resources_loader: IResourceLoader = null
   content_provider: IContentProvider = null

   acquireComponent(id: string): ComponentEntry {
      let obj = this.components.get(id) as ComponentEntry
      if (!obj && typeof id === "string") {
         obj = new ComponentEntry(id)
         this.components.set(id, obj)
      }
      return obj
   }
   resolveRelativeComponent(ref: string, from: ComponentEntry): ComponentEntry {
      if (from && ref.startsWith("/")) {
         return this.acquireComponent(`${from?.id}${ref}`)
      }
      return null
   }
}

export function makeContentKey(component_id: string, norm: string, key?: string): string {
   if (key && key.startsWith("/")) key = key.slice(1)
   if (key) return `${component_id}/${norm}/${key}`
   else return `${component_id}/${norm}`
}

export function makeComponentURI(id: string, norm: string, key?: string): URI {
   const path = key ? `/${norm}/${key}` : `/${norm}`
   return URI.from({ scheme: "component", authority: id, path })
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

export const ComponentsRegistry = new ComponentsManifold()
ComponentsRegistry.content_provider = new LocalComponentContent()
ComponentsRegistry.components_provider = new LocalComponentProvider(ComponentsRegistry.content_provider)
ComponentsRegistry.resources_loader = new CommonResourceProvider(ComponentsRegistry.content_provider)
