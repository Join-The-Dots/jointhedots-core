import { ComponentManifest, ComponentPublication, IComponentProvider, IComponentPublisher, makeComponentPublication } from "../interfaces"

function match_list_in_list(targets: string[], expecteds?: string[]): boolean {
   if (!expecteds) {
      return true
   }
   if (targets) {
      for (const target of targets) {
         if (expecteds.includes(target)) return true
      }
   }
   return false
}

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
   async search_component_publications(pattern?: string, services?: string[]): Promise<ComponentPublication[]> {
      const result = []
      const filter = make_search_regexp(pattern)
      for (const [key, entry] of this.pubs) {
         if (is_component_base_content(key, filter) && match_list_in_list(entry.services, services)) {
            result.push(entry)
         }
      }
      return result
   }
}

export class InMemComponentProvider extends InMemComponentPublisher implements IComponentProvider {
   manifests = new Map<string, ComponentManifest>()
   add_component(manifest: ComponentManifest) {
      const entry = makeComponentPublication(manifest)
      this.manifests.set(entry.component_id, manifest)
      this.pubs.set(entry.component_id, entry)
   }
   async get_component_manifest(component_id: string): Promise<ComponentManifest> {
      return this.manifests.get(component_id)
   }
   async set_component_manifest(component_id: string, manifest: ComponentManifest): Promise<boolean> {
      return false
   }
}

export function make_search_regexp(pattern: string) {
   if (pattern) {
      const kws = pattern.split(/\s/).filter(x => x.length > 0)
      if (kws.length > 0) return new RegExp(`(${kws.join(").*(")})`)
   }
   return null
}

export function is_component_base_content(text: string, filter: RegExp): boolean {
   if (text) {
      return !filter || filter.test(text)
   }
   return false
}
