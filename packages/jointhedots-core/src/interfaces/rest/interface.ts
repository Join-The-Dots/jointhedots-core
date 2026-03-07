import { URI } from "vscode-uri"
import { acquireComponent, ComponentEntry } from "../../components/manifold.ts"
import { ServiceAccessor } from "../../services/service-accessor.ts"

export interface RESTService {
   getUrl(path: string): string
   invoke(path: string, init?: RequestInit): Promise<Response>
}

export const RESTServiceKey = ServiceAccessor.About<RESTService, unknown>("api.rest")

export type RESTServiceImport = {
   type?: "api.rest"
   endpoint?: string
   path?: string
}

export function __import_RESTService(entry: RESTServiceImport, component: ComponentEntry): RESTService {
   const baseUrl = entry.endpoint + (entry.path || "")
   return {
      invoke(path: string, init?: RequestInit) {
         return globalThis.fetch(baseUrl + path, init)
      },
      getUrl(path: string) {
         return baseUrl + path
      },
   }
}

export const REST = {
   async fetch(link: string | URI, init?: RequestInit): Promise<Response> {
      if (typeof link === "string") {
         link = URI.parse(link)
      }
      if (link.scheme === "jtd") {
         const comp = acquireComponent(link.authority)
         const svc = await RESTServiceKey.fetch(comp)
         if (svc) {
            const path = link.query ? `${link.path}?${link.query}` : link.path
            return svc.invoke(path, init)
         }
         else {
            return Response.error()
         }
      }
      else {
         return fetch(link.toString(), init)
      }
   },
   async getUri(link: string | URI): Promise<URI> {
      if (typeof link === "string") {
         link = URI.parse(link)
      }
      if (link.scheme === "jtd") {
         const comp = acquireComponent(link.authority)
         const svc = await RESTServiceKey.fetch(comp)
         if (svc) {
            const path = link.query ? `${link.path}?${link.query}` : link.path
            link = URI.parse(svc.getUrl(path))
         }
         else {
            throw new Error(`Unknown component '${link.authority}'`)
         }
      }
      return link
   }
}
