import { URI } from 'vscode-uri'

export interface IUrlResolver {
   resolve(url: URL): URL
}

export interface IServiceProvider {
   get(uri: URI, init?: RequestInit): Promise<Response>
   post(uri: URI, init?: RequestInit): Promise<Response>
}

export function parseURI(ref: string): URI {
   if (ref.startsWith("/")) {
      return URI.parse(window.location.href).with({ path: ref, query: "", fragment: "" })
   }
   else {
      return URI.parse(ref)
   }
}
