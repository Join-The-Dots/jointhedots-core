import { type BundleManifest, type ComponentFilter, type ComponentManifest, type ComponentPublication, type IComponentProvider, type IContentProvider } from "../../components/components.ts"
import { InMemComponentPublisher } from "./InMemComponentProvider.ts"
import { ContentBlob } from "../../common/contents.ts"
import { parseComponentURI } from "../../components/helpers.ts"

export class StaticComponentProvider implements IComponentProvider {
   manifest: BundleManifest = null
   catalog: InMemComponentPublisher = null
   constructor(readonly content_provider: IContentProvider) {
   }
   async get_provider_bundle(): Promise<BundleManifest> {
      if (!this.manifest) {
         this.manifest = await (await fetch("./bundle.manifest.json")).json()
      }
      return this.manifest
   }
   async get_component_catalog(): Promise<InMemComponentPublisher> {
      if (!this.catalog) {
         const manifest = await this.get_provider_bundle()
         this.catalog = new InMemComponentPublisher(manifest.data?.components)
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
         const bundle = await this.get_provider_bundle()
         const pub = bundle.data.components.find(pub => pub.id === id)
         if (pub) {
            const manifest_uri = parseComponentURI(pub.ref ? `./${pub.ref}` : `./${id}.json`)
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
