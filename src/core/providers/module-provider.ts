import { ContentBlob } from "core/common/contents"
import { CoreInstance } from "core"
import { IModuleProvider } from "core/components/providers"
import { URI } from "vscode-uri"
import { parseURI } from "core/types/services"

export class CommonModuleProvider implements IModuleProvider {
   modules_exports = new Map<string, any>()
   baseUrl = getDirectoryUrl(import.meta.url)

   async load_data(ref: string): Promise<any> {

      if (this.modules_exports.has(ref)) {
         return this.modules_exports.get(ref)
      }

      const uri = parseURI(ref)
      const format = await CoreInstance.storage.check_content(uri)
      switch (format) {
         case "application/json":
         case "text/json":
            return null
         case "application/javascript":
         case "text/javascript":
         default:
            return this.import_module_esm(ref, uri)
      }
   }
   async import_module_esm(ref: string, uri: URI): Promise<any> {
      const link = uri.toString()
      const data = await load_module(link)
      this.modules_exports.set(ref, data)
      return data
   }
}

const load_module = new Function("url", "return import(url)")

function getDirectoryUrl(url: string): string {
   const parts = url.split('/')
   parts.pop()
   return parts.join('/')
}
