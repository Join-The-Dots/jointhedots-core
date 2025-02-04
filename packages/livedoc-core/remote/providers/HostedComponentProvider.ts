import { ComponentManifest, ComponentPublication, IComponentProvider } from "../../library/interfaces"
import { EditorApi, EditorCmd } from "../cmds/editor"
import { DeviceSockets } from "../proxy-sockets"

export class HostedComponentProvider implements IComponentProvider {
   constructor() {
   }
   async search_component_publications(pattern?: string): Promise<ComponentPublication[]> {
      return []
   }
   async get_component_publication(component_id: string): Promise<ComponentPublication> {
      return DeviceSockets.master.execute<EditorApi["GetComponentPublication"]>({
         cmd: EditorCmd.GetComponentPublication,
         id: component_id,
      })
   }
   async get_component_manifest(component_id: string): Promise<ComponentManifest> {
      return DeviceSockets.master.execute<EditorApi["GetComponentManifest"]>({
         cmd: EditorCmd.GetComponentManifest,
         id: component_id,
      })
   }
   async set_component_manifest(component_id: string, manifest: ComponentManifest) {
      return false
   }
}
