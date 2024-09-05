import { IServiceProvider } from "core/types/services"
import { URI } from "vscode-uri"

export class HttpServiceProvider implements IServiceProvider {
   baseUrl = ""
   get(uri: URI, init?: RequestInit): Promise<Response> {
      return fetch(this.baseUrl + uri.path, { method: "GET" })
   }
   post(uri: URI, content: any): Promise<Response> {
      let contentType: string
      if (typeof content === "string") {
         contentType = "text/plain"
      }
      else if (content instanceof ArrayBuffer) {
         contentType = "application/octet-stream"
      }
      else {
         contentType = "application/json"
         content = JSON.stringify(content)
      }
      return fetch(this.baseUrl + uri.path, {
         method: "POST",
         headers: { "Content-Type": contentType },
         body: content,
      })
   }
}
