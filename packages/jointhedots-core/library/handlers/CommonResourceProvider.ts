import { URI } from "vscode-uri"
import { ContentBlob } from "../../common/contents"
import { IContentProvider, IResourceLoader } from "../interfaces"
import { parseComponentURI } from "../helpers"

export class CommonResourceProvider implements IResourceLoader {
   modules_exports = new Map<string, any>()
   baseUrl = getDirectoryUrl(import.meta.url)

   constructor(
      readonly storage: IContentProvider,
   ) {
   }
   async load_resource(ref: string): Promise<any> {

      if (this.modules_exports.has(ref)) {
         return this.modules_exports.get(ref)
      }

      const uri = parseComponentURI(ref)
      const format = await this.storage.check_content(uri)
      switch (format) {
         case "application/json":
         case "text/json":
            return this.import_module_json(ref, uri)
         case "application/javascript":
         case "text/javascript":
         default:
            return this.import_module_esm(ref, uri)
      }
   }
   async import_module_json(ref: string, uri: URI): Promise<any> {
      const view_blob = await this.storage.load_content(uri)
      return ContentBlob.object.read(view_blob)
   }
   async import_module_esm(ref: string, uri: URI): Promise<any> {
      const link = uri.toString()
      const data = await import(link)
      this.modules_exports.set(ref, data)
      return data
   }
}

function getDirectoryUrl(url: string): string {
   const parts = url.split('/')
   parts.pop()
   return parts.join('/')
}
