import { ComponentManifest, ComponentPublication, IComponentProvider } from "../interfaces"

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
   async search_component_publications(pattern?: string, services?: string[]): Promise<ComponentPublication[]> {
      const result = []
      for (const provider of this.providers) {
         const founds = await provider.search_component_publications(pattern, services)
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
