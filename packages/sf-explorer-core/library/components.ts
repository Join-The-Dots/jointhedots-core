import { ComponentManifest, ComponentPublication, IComponentProvider, IContentProvider, IResourceLoader } from "./interfaces"
import { URI, Utils } from "vscode-uri"
import { CommonResourceProvider } from "./handlers/CommonResourceProvider"
import { StaticContentProvider } from "./handlers/StaticContentProvider"
import { StaticComponentProvider } from "./providers/StaticComponentProvider"
import { CombinedComponentProvider } from "./providers/CombinedComponentProvider"
import { ComponentDriverService } from "../services/ComponentDriver"

export class ComponentEntry {
   manifest?: ComponentManifest = undefined
   instance?: any = undefined
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
         loading = ComponentsRegistry.components_provider.get_component_manifest(this.id).then(async (manifest) => {
            this.manifest = manifest
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
   acquireResource(identifier: string): ComponentResource {
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
      if (manifest?.services?.[identifier]) {
         return this.acquireResource(identifier)
      }
      return null
   }
   hasResource(identifier: string): boolean {
      const { manifest } = this
      if (manifest?.services?.[identifier]) {
         return true
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
            try {
               // Fetch manifest with resource catalog
               const { component } = this
               if (component.loaded === false) {
                  await component.fetch()
               }

               // Fetch resource data
               const { manifest } = component
               const ref = manifest.services?.[this.resource]
               if (typeof ref === "string") {
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
               else if (ref === true) {
                  const driver = await ComponentsRegistry.acquireComponent(manifest.type).acquireResource("component").fetch<ComponentDriverService>()
                  if (component.instance === undefined) {
                     component.instance = null
                     await driver.create(component, component.manifest)
                  }
                  this.entry = await driver.getService(component, this.resource)
                  this.identifier = null
               }
               else if (ref) {
                  const factory = await ComponentsRegistry.acquireComponent(ref.type).acquireResource("factory").fetch()
                  this.entry = await factory(ref.data)
                  this.identifier = null
               }
               else {
                  this.entry = null
                  this.identifier = null
               }
            }
            catch (e) {
               console.error(e)
               this.entry = null
               this.identifier = null
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
      const ref = this.component.manifest?.services?.[this.resource]
      if (typeof ref === "string") {
         const base = URI.parse(window.location.href).with({ fragment: null })
         const uri = Utils.joinPath(base, "..", ref.split("#")[0])
         return uri.toString()
      }
      return null
   }
}

export type ComponentsListener = (target: ComponentEntry) => void

export class ComponentsManifold {
   components = new Map<string, ComponentEntry>()
   resources = new Map<string, ComponentResource>()
   loadings = new Map<any, Promise<any>>()
   listeners = new Set<ComponentsListener>()

   components_provider = new CombinedComponentProvider([])
   resources_loader: IResourceLoader = null
   content_provider: IContentProvider = null

   constructor() {
      this.content_provider = new StaticContentProvider()
      this.components_provider.add_provider(new StaticComponentProvider(this.content_provider))
      this.resources_loader = new CommonResourceProvider(this.content_provider)
   }
   listen(l: ComponentsListener) {
      this.listeners.add(l)
      return l
   }
   unlisten(l: ComponentsListener) {
      this.listeners.delete(l)
   }
   acquireComponent(id: string): ComponentEntry {
      let obj = this.components.get(id) as ComponentEntry
      if (!obj && typeof id === "string") {
         obj = new ComponentEntry(id)
         this.components.set(id, obj)
      }
      return obj
   }
   acquireResource(ref: string): ComponentResource {
      const parts = ref.split("#")
      if (parts.length === 2) {
         const entry = this.acquireComponent(parts[0])
         return entry?.acquireResource(parts[1])
      }
      return null
   }
   resolveRelativeComponent(ref: string, from: ComponentEntry): ComponentEntry {
      if (from && ref.startsWith("/")) {
         return this.acquireComponent(`${from?.id}${ref}`)
      }
      return null
   }
   updateComponent(manifest: ComponentManifest): Promise<ComponentEntry> {
      return null
   }
}

export async function createNewComponent(manifest: ComponentManifest): Promise<ComponentManifest> {
   console.log("createNewComponent", manifest)
   const { providers } = ComponentsRegistry.components_provider
   const local = providers[providers.length - 1] as any
   await local.add_component(manifest)
   return manifest
}

export async function updateComponent(manifest: ComponentManifest): Promise<ComponentManifest> {
   console.log("updateComponent", manifest)
   const { providers } = ComponentsRegistry.components_provider
   const local = providers[providers.length - 1] as any
   await local.add_component(manifest)

   const component = ComponentsRegistry.components.get(manifest.$id)
   if (component && component.loaded) {
      component.manifest = manifest
      if (manifest.type) {
         const driver = await ComponentsRegistry.acquireComponent(manifest.type).acquireResource("component").fetch<ComponentDriverService>()
         await driver.update(component, manifest)
         ComponentsRegistry.listeners.forEach(l => l(component))
      }
   }
   return manifest
}

export async function fetchComponentsPublications(components_ids: string[]): Promise<ComponentPublication[]> {
   const results: ComponentPublication[] = []
   for (const id of components_ids) {
      const cnx = await ComponentsRegistry.components_provider.get_component_publication(id)
      if (cnx) {
         results.push(cnx)
      }
      else {
         results.push({
            component_id: id,
            title: "! Not found: " + id,
         })
      }
   }
   return results
}

export const ComponentsRegistry = new ComponentsManifold()
