import { type ComponentFilter, type ComponentManifest, type ComponentPublication, type IComponentProvider } from "../../components/components.ts"

export class CombinedComponentProvider implements IComponentProvider {
   constructor(readonly providers: IComponentProvider[] = []) {
   }
   add_provider(provider: IComponentProvider) {
      this.providers.push(provider)
   }
   async get_component_publication(id: string): Promise<ComponentPublication> {
      for (const provider of this.providers) {
         const found = await provider.get_component_publication(id)
         if (found) return found
      }
      return null
   }
   async search_component_publications(filter: ComponentFilter): Promise<ComponentPublication[]> {
      const result = []
      for (const provider of this.providers) {
         const founds = await provider.search_component_publications(filter)
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
   async set_component_manifest(component_id: string, manifest: ComponentManifest): Promise<boolean> {
      for (const provider of this.providers) {
         const done = await provider.set_component_manifest(component_id, manifest)
         if (done) return true
      }
      return false
   }
   async add_component(manifest: ComponentManifest): Promise<ComponentPublication> {
      for (const provider of this.providers) {
         const done = await provider.add_component(manifest)
         if (done) return done
      }
      return null
   }
   async delete_component(component_id: string): Promise<boolean> {
      for (const provider of this.providers) {
         const done = await provider.delete_component(component_id)
         if (done) return true
      }
      return false
   }
}
