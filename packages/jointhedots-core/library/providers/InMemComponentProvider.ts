import { ComponentFilter, ComponentManifest, ComponentPublication, IComponentProvider, IComponentPublisher } from "../components"
import { createComponentPublication, matchComponentFilter } from "../helpers"

export class InMemComponentPublisher implements IComponentPublisher {
   pubs = new Map<string, ComponentPublication>()
   constructor(catalog: ComponentPublication[] = []) {
      for (const entry of catalog) {
         this.pubs.set(entry.component_id, entry)
      }
   }
   async get_component_publication(id: string): Promise<ComponentPublication> {
      return this.pubs.get(id)
   }
   async search_component_publications(filter: ComponentFilter): Promise<ComponentPublication[]> {
      const result = []
      for (const pub of this.pubs.values()) {
         if (matchComponentFilter(pub, filter)) {
            result.push(pub)
         }
      }
      return result
   }
}

export class InMemComponentProvider extends InMemComponentPublisher implements IComponentProvider {
   manifests = new Map<string, ComponentManifest>()
   async add_component(manifest: ComponentManifest): Promise<ComponentPublication> {
      const entry = await createComponentPublication(manifest)
      this.manifests.set(entry.component_id, manifest)
      this.pubs.set(entry.component_id, entry)
      return entry
   }
   async delete_component(component_id: string): Promise<boolean> {
      this.manifests.delete(component_id)
      this.pubs.delete(component_id)
      return true
   }
   async get_component_manifest(component_id: string): Promise<ComponentManifest> {
      return this.manifests.get(component_id)
   }
   async set_component_manifest(component_id: string, manifest: ComponentManifest): Promise<boolean> {
      return false
   }
}
