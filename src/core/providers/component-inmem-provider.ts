import { ComponentPublication, ResourceContent, IComponentProvider, IContentProvider } from "core/components/providers"
import { URI } from "vscode-uri"

export class InMemComponentStore implements IComponentProvider, IContentProvider {

   // Component attributes
   resources = new Map<string, Blob>()
   publications = new Map<string, ComponentPublication>()

   // Data storage
   contents = new Map<string, any>()

   async get_component_publication(component_id: string): Promise<ComponentPublication> {
      return null
   }

   async search_component_publications(pattern?: string): Promise<ComponentPublication[]> {
      const result = [] as ComponentPublication[]
      /*for (const comp of this.entries.values()) {
         result.push({
            component_id: comp.component_id,
            title: comp.name,
            description: "",
         })
      }*/
      return result
   }

   async get_component_resources(component_id: string): Promise<ResourceContent[]> {
      const res = []
      /*const { ref } = target
      for (const ref of this.resources.keys()) {
         const uri = parseURI(ref)
         if (uri.authority === component_id) {
            res.push(this.get_resource(ref))
         }
      }*/
      return res
   }

   async check_content(uri: URI): Promise<string> {
      const content = this.resources.get(uri.toString())
      return content && content.type
   }
   async load_content(uri: URI): Promise<Blob> {
      return this.resources.get(uri.toString())
   }
   async store_content(content: Blob, uri: URI): Promise<boolean> {
      this.resources.set(uri.toString(), content)
      return true
   }
}
