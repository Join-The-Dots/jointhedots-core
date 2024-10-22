import { ComponentPublication, IComponentProvider, IContentProvider } from "../interfaces"
import { parseComponentURI } from ".."
import { ContentBlob } from "../contents"

export class MemoryComponentProvider implements IComponentProvider {
   catalog: Map<string, ComponentPublication> = new Map<string, ComponentPublication>()
   constructor(catalog: ComponentPublication[]) {
      for (const entry of catalog) {
         this.catalog.set(entry.component_id, entry)
      }
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

export class StaticComponentProvider implements IComponentProvider {
   catalog: MemoryComponentProvider = null
   constructor(readonly content_provider: IContentProvider) {
   }
   async get_component_catalog(): Promise<MemoryComponentProvider> {
      if (!this.catalog) {
         const catalog_uri = parseComponentURI("./catalogs/every.json")
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
