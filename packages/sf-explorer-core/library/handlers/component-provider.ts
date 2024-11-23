import { ComponentManifest, ComponentPublication, IComponentProvider, IContentProvider, parseComponentURI } from "../interfaces"
import { ContentBlob } from "../contents"
import { MapLike } from "../../common/types"

export class MemoryComponentProvider implements IComponentProvider {
   catalog: Map<string, ComponentPublication> = new Map<string, ComponentPublication>()
   constructor(catalog: ComponentPublication[]) {
      for (const entry of catalog) {
         this.catalog.set(entry.component_id, entry)
      }
   }
   async get_component_manifest(component_id: string): Promise<ComponentManifest> {
      return null
   }
   async get_component_publication(id: string): Promise<ComponentPublication> {
      return this.catalog.get(id)
   }
   async search_component_publications(pattern?: string): Promise<ComponentPublication[]> {
      const result = []
      const filter = make_search_regexp(pattern)
      for (const [key, entry] of this.catalog) {
         if (is_component_base_content(key, filter)) {
            result.push(entry)
         }
      }
      return result
   }
}

export type StaticManifest = {
   name: string
   baseline: string
   components: MapLike<string>
   catalogs: MapLike<string>
}

export class StaticComponentProvider implements IComponentProvider {
   library: StaticManifest = null
   catalog: MemoryComponentProvider = null
   constructor(readonly content_provider: IContentProvider) {
   }
   async get_provider_library(): Promise<StaticManifest> {
      if (!this.library) {
         this.library = await (await fetch("./components.manifest.json")).json()
      }
      return this.library
   }
   async get_component_catalog(): Promise<MemoryComponentProvider> {
      if (!this.catalog) {
         const library = await this.get_provider_library()
         const catalog_uri = parseComponentURI(`./${library.catalogs.every}`)
         const catalog_blob = await this.content_provider.load_content(catalog_uri)
         if (catalog_blob) {
            const catalog = await ContentBlob.object.read<ComponentPublication[]>(catalog_blob)
            this.catalog = new MemoryComponentProvider(catalog)
         }
      }
      return this.catalog
   }
   async get_component_publication(id: string): Promise<ComponentPublication> {
      const catalog = await this.get_component_catalog()
      return catalog.get_component_publication(id)
   }

   async search_component_publications(pattern?: string): Promise<ComponentPublication[]> {
      const catalog = await this.get_component_catalog()
      return catalog.search_component_publications(pattern)
   }

   async get_component_manifest(id: string): Promise<ComponentManifest> {
      const library = await this.get_provider_library()
      const manifest_uri = parseComponentURI(`./${library.components[id]}`)
      const manifest_blob = await this.content_provider.load_content(manifest_uri)
      if (manifest_blob) {
         return ContentBlob.object.read(manifest_blob)
      }
      return null
   }
}

export class CombinedComponentProvider implements IComponentProvider {
   constructor(readonly providers: IComponentProvider[] = []) {
   }
   async get_component_publication(id: string): Promise<ComponentPublication> {
      for (const provider of this.providers) {
         const found = await provider.get_component_publication(id)
         if (found) return found
      }
      return null
   }
   async search_component_publications(pattern?: string): Promise<ComponentPublication[]> {
      const result = []
      for (const provider of this.providers) {
         const founds = await provider.search_component_publications(pattern)
         if (founds) result.push(...founds)
      }
      return result
   }
   async get_component_manifest(id: string): Promise<ComponentManifest> {
      for (const provider of this.providers) {
         const founds = await provider.get_component_manifest(id)
         if (founds) return founds
      }
      return null
   }
}

function make_search_regexp(pattern: string) {
   if (pattern) {
      const kws = pattern.split(/\s/).filter(x => x.length > 0)
      if (kws.length > 0) return new RegExp(`(${kws.join(").*(")})`)
   }
   return null
}

function is_component_base_content(text: string, filter: RegExp): boolean {
   if (text) {
      return !filter || filter.test(text)
   }
   return false
}
