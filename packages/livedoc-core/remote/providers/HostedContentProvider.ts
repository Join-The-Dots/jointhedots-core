import { IContentProvider } from "../../library/interfaces"
import { EditorApi, EditorCmd } from "../cmds/editor"
import { DeviceSockets } from "../proxy-sockets"
import { URI } from "vscode-uri"

export class HostedContentProvider implements IContentProvider {
   async check_content(url: URI): Promise<string> {
      return DeviceSockets.master.execute<EditorApi["CheckContent"]>({
         cmd: EditorCmd.CheckContent,
         uri: url.toString(),
      })
   }
   async load_content(url: URI): Promise<Blob> {
      return DeviceSockets.master.execute<EditorApi["LoadContent"]>({
         cmd: EditorCmd.LoadContent,
         uri: url.toString(),
      })
   }
   async store_content(content: Blob, url: URI): Promise<boolean> {
      return false
   }
}
