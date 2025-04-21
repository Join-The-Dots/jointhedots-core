import { URI, Utils } from "vscode-uri"
import { ComponentFilter, ComponentManifest, ComponentPublication, ComponentControllerKey, IContentProvider, IResourceLoader } from "./components"
import { CommonResourceProvider } from "./handlers/CommonResourceProvider"
import { StaticContentProvider } from "./handlers/StaticContentProvider"
import { StaticComponentProvider } from "./providers/StaticComponentProvider"
import { CombinedComponentProvider } from "./providers/CombinedComponentProvider"
import { LocalComponentProvider } from "./providers/LocalComponentProvider"
import { Log, LogObject, queryLogInfos, queryLogObjects, QueryLogResult } from "../logging"

type ComponentErrorManifest = ComponentManifest & {
   error: Error
}

// Component registry entry
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
   get installed(): boolean {
      return this.instance !== undefined
   }
   setError(error: Error) {
      this.failure = error
      this.set<ComponentErrorManifest>({
         $id: this.id,
         error,
         services: {}
      })
      Log.error(error, this)
      return this
   }
   get<Manifest extends ComponentManifest = ComponentManifest>(): Manifest {
      if (this.manifest === undefined) {
         throw new Error(`Cannot get manifest of not loaded module`)
      }
      return this.manifest as Manifest
   }
   set<Manifest extends ComponentManifest = ComponentManifest>(manifest: Manifest) {
      this.manifest = manifest
      return this
   }
   fetch<Manifest extends ComponentManifest = ComponentManifest>(): Promise<Manifest> {
      let loading = ComponentsRegistry.loadings.get(this)
      if (loading) return loading

      if (this.manifest === undefined) {
         loading = ComponentsRegistry.components_provider.get_component_manifest(this.id).then(async (manifest) => {
            if (manifest) this.manifest = manifest
            else this.setError(new Error(`Component '${this.id}' not found`))
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
   async install(): Promise<ComponentEntry> {
      let installing = ComponentsRegistry.installings.get(this)
      if (installing) return installing

      if (this.instance === undefined) {
         this.instance = null
         installing = new Promise(async (resolve) => {
            if (this.loaded === false) {
               await this.fetch()
            }

            const type = this.manifest?.type
            if (type) {
               const entry = acquireComponent(type)
               const controller = await ComponentControllerKey.fetch(entry)
               await controller.createComponent(this, this.manifest)
            }

            if (this.instance instanceof Object) {
               ComponentsRegistry.datamap.set(this.instance, this)
            }
            else {
               this.instance = null
            }

            resolve(this)
         })
      }
      else {
         installing = Promise.resolve(this)
      }

      ComponentsRegistry.installings.set(this, installing)
      return installing
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
   getLogStats() {
      return queryLogInfos(this.id)
   }
   getLogs(count: number): QueryLogResult {
      return queryLogObjects(count, this.id)
   }
}

// Component resource
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
               if (component.installed === false) {
                  await component.install()
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
                  const controller = ComponentControllerKey.get(acquireComponent(manifest.type))
                  this.entry = await controller.getService(component, this.resource)
                  this.identifier = null
               }
               else if (ref) {
                  const factory = await acquireComponent(ref.type).acquireResource("factory").fetch()
                  this.entry = await factory(ref.data)
                  this.identifier = null
               }
               else {
                  this.entry = null
                  this.identifier = null
               }
               ComponentsRegistry.datamap.set(this.get(), this)
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
   get spec() {
      const norm = this.resource.split(".")[0]
      return this.component.manifest?.specs?.[norm]
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
   datamap = new WeakMap<any, ComponentResource | ComponentEntry>()

   loadings = new Map<any, Promise<any>>()
   installings = new Map<any, Promise<ComponentEntry>>()
   listeners = new Set<ComponentsListener>()

   components_provider = new CombinedComponentProvider([])
   resources_loader: IResourceLoader = null
   content_provider: IContentProvider = null

   constructor() {
      this.content_provider = new StaticContentProvider()
      this.components_provider.add_provider(new StaticComponentProvider(this.content_provider))
      this.components_provider.add_provider(new LocalComponentProvider())
      this.resources_loader = new CommonResourceProvider(this.content_provider)
   }
   listen(l: ComponentsListener) {
      this.listeners.add(l)
      return l
   }
   unlisten(l: ComponentsListener) {
      this.listeners.delete(l)
   }
   notifyError(subject: ComponentEntry, error: Error) {

   }
}

export const ComponentsRegistry = new ComponentsManifold()

export function acquireComponent(id: string): ComponentEntry {
   let obj = ComponentsRegistry.components.get(id) as ComponentEntry
   if (!obj && typeof id === "string") {
      obj = new ComponentEntry(id)
      ComponentsRegistry.components.set(id, obj)
   }
   return obj
}

export function acquireResource(ref: string): ComponentResource {
   const parts = ref.split("#")
   if (parts.length === 2) {
      const entry = acquireComponent(parts[0])
      return entry?.acquireResource(parts[1])
   }
   return null
}

export function resolveRelativeComponent(ref: string, from: ComponentEntry): ComponentEntry {
   if (from && ref.startsWith("/")) {
      return acquireComponent(`${from?.id}${ref}`)
   }
   return null
}

export async function createNewComponent(manifest: ComponentManifest): Promise<ComponentManifest> {
   console.log("[New Component]", manifest?.$id)
   const provider = ComponentsRegistry.components_provider
   await provider.add_component(manifest)
   return manifest
}

export async function updateComponent(manifest: ComponentManifest): Promise<ComponentManifest> {
   console.log("[Update Component]", manifest?.$id)
   const provider = ComponentsRegistry.components_provider
   await provider.add_component(manifest)

   const component = ComponentsRegistry.components.get(manifest.$id)
   if (component && component.loaded) {
      component.manifest = manifest
      if (manifest.type && component.installed) {
         const controller = ComponentControllerKey.get(acquireComponent(manifest.type))
         await controller.updateComponent(component, manifest)
         if (component.instance instanceof Object) {
            ComponentsRegistry.datamap.set(component.instance, component)
         }
         ComponentsRegistry.listeners.forEach(l => l(component))
      }
   }

   return manifest
}

export async function deleteComponent(id: string): Promise<void> {
   console.log("deleteComponent", id)
   const provider = ComponentsRegistry.components_provider
   if (await provider.delete_component(id)) {
      const component = ComponentsRegistry.components.get(id)
      if (component) {
         component.failure = new Error(`Component deleted`)
         ComponentsRegistry.listeners.forEach(l => l(component))
         ComponentsRegistry.components.delete(id)
      }
   }
}

export async function searchComponentsPublications(filter: ComponentFilter): Promise<ComponentPublication[]> {
   return ComponentsRegistry.components_provider.search_component_publications(filter)
}

export async function fetchComponentsPublications(components_ids: string[]): Promise<ComponentPublication[]> {
   const results: ComponentPublication[] = []
   for (const id of components_ids) {
      const cnx = await ComponentsRegistry.components_provider.get_component_publication(id)
      if (cnx) {
         results.push(cnx)
      }
      else {
         results.push(failedComponentPublication(id))
      }
   }
   return results
}

export function failedComponentPublication(id: string, title?: string): ComponentPublication {
   return {
      component_id: id,
      title: title ? title : "! Not found: " + id,
   }
}
