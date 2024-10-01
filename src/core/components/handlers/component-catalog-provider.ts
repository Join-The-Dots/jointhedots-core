import { URI } from "vscode-uri"
import { ComponentPublication, IComponentProvider, IContentProvider, ResourceContent } from "../interfaces"
import { makeComponentURI, parseComponentURI } from ".."
import { b64_blob, b64_format, blob_b64, ContentBlob } from "../contents"

export class LocalComponentProvider implements IComponentProvider {
   publication_cache: Map<string, ComponentPublication> = null
   constructor(readonly content_provider: IContentProvider) {
   }
   async get_component_catalog(): Promise<Map<string, ComponentPublication>> {
      if (!this.publication_cache) {
         const catalog_uri = parseComponentURI("./catalogs/every.json")
         const catalog_blob = await this.content_provider.load_content(catalog_uri)
         if (catalog_blob) {
            const catalog = await ContentBlob.object.read<ComponentPublication[]>(catalog_blob)
            this.publication_cache = new Map<string, ComponentPublication>()
            for (const entry of catalog) {
               this.publication_cache.set(entry.component_id, entry)
            }
         }
      }
      return this.publication_cache
   }
   async get_component_publication(id: string): Promise<ComponentPublication> {
      const catalog = await this.get_component_catalog()
      return catalog.get(id)
   }

   async search_component_publications(pattern?: string): Promise<ComponentPublication[]> {
      const result = []
      const catalog = await this.get_component_catalog()
      const filter = make_search_regexp(pattern)
      for (const [key, entry] of catalog) {
         if (is_component_base_content(key, filter)) {
            result.push(entry)
         }
      }
      return result
   }
}

export class LocalComponentContent implements IContentProvider {
   async check_url_content(ref: string): Promise<string> {
      const res = await fetch(ref, { method: "HEAD" })
      if (res.ok) {
         const ctype = res.headers.get("content-type")
         return ctype ? ctype.split(";")[0].trim() : "application/octet-stream"
      }
      return null
   }

   async load_url_content(ref: string): Promise<Blob> {
      const res = await fetch(ref)
      if (res.ok) {
         return res.blob()
      }
      else {
         throw new Error(`Fetch failed ${res.statusText} ${res.status} '${ref}'`)
      }
   }

   async check_content(uri: URI): Promise<string> {
      if (uri.scheme === "component") {
         const ref = uri.toString()
         const local_data = localStorage.getItem(ref)
         if (local_data) {
            return b64_format(local_data)
         }
         else if (uri.path === "/manifest") {
            return this.check_url_content(`manifest/${encodeURIComponent(uri.authority)}.json`)
         }
         else {
            throw new Error(`Unsupported component content uri: ${uri}`)
         }
      }
      else {
         return this.check_url_content(uri.toString())
      }
   }

   async load_content(uri: URI): Promise<Blob> {
      if (uri.scheme === "component") {
         const ref = uri.toString()
         const local_data = localStorage.getItem(ref)
         if (local_data) {
            return b64_blob(localStorage.getItem(ref))
         }
         else if (uri.path === "/manifest") {
            return this.load_url_content(`manifest/${encodeURIComponent(uri.authority)}.json`)
         }
         else {
            throw new Error(`Unsupported component content uri: ${uri}`)
         }
      }
      else {
         return this.load_url_content(uri.toString())
      }
   }

   async store_content(content: Blob, uri: URI): Promise<boolean> {
      if (uri.scheme === "component") {
         const ref = uri.toString()
         const bytes = await blob_b64(content)
         localStorage.setItem(ref, bytes)
         return true
      }
      return false
   }
}

function make_search_regexp(pattern: string) {
   const kws = pattern.split(/\s/).filter(x => x.length > 0)
   if (kws.length > 0) return new RegExp(`(${kws.join(").*(")})`)
   return null
}

function is_component_base_content(text: string, filter: RegExp): boolean {
   if (text) {
      return !filter || filter.test(text)
   }
   return false
}
