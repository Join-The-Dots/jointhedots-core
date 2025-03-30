import { ComponentFilter, ComponentManifest, ComponentPublication, IComponentProvider, IContentProvider } from "../interfaces"
import { InMemComponentPublisher } from "./InMemComponentProvider"
import { MapLike } from "../../common/types"
import { ContentBlob } from "../../common/contents"
import { parseComponentURI } from "../helpers"

export type StaticManifest = {
   name: string
   baseline: string
   components: MapLike<string>
   catalogs: MapLike<string>
}

export class StaticComponentProvider implements IComponentProvider {
   library: StaticManifest = null
   catalog: InMemComponentPublisher = null
   constructor(readonly content_provider: IContentProvider) {
   }
   async get_provider_library(): Promise<StaticManifest> {
      if (!this.library) {
         this.library = await (await fetch("./components.manifest.json")).json()
      }
      return this.library
   }
   async get_component_catalog(): Promise<InMemComponentPublisher> {
      if (!this.catalog) {
         const library = await this.get_provider_library()
         const catalog_uri = parseComponentURI(`./${library.catalogs.every}`)
         const catalog_blob = await this.content_provider.load_content(catalog_uri)
         if (catalog_blob) {
            const catalog = await ContentBlob.object.read<ComponentPublication[]>(catalog_blob)
            this.catalog = new InMemComponentPublisher(catalog)
         }
      }
      return this.catalog
   }
   async get_component_publication(id: string): Promise<ComponentPublication> {
      const catalog = await this.get_component_catalog()
      return catalog.get_component_publication(id)
   }

   async search_component_publications(filter: ComponentFilter): Promise<ComponentPublication[]> {
      const catalog = await this.get_component_catalog()
      return catalog.search_component_publications(filter)
   }

   async get_component_manifest(id: string): Promise<ComponentManifest> {
      try {
         const library = await this.get_provider_library()
         const manifest_file = library.components[id]
         if (manifest_file) {
            const manifest_uri = parseComponentURI(`./${manifest_file}`)
            const manifest_blob = await this.content_provider.load_content(manifest_uri)
            if (manifest_blob) {
               return ContentBlob.object.read(manifest_blob)
            }
         }
      }
      catch (_) { }
      return null
   }
   async set_component_manifest(component_id: string, manifest: ComponentManifest): Promise<boolean> {
      return false
   }
   async add_component(manifest: ComponentManifest): Promise<ComponentPublication> {
      return null
   }
   async delete_component(component_id: string): Promise<boolean> {
      return false
   }
}
