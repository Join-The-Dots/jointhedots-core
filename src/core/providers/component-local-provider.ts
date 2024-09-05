import { b64_blob, b64_format, blob_b64, ContentBlob } from "core/common/contents"
import { ComponentPublication, ResourceContent, IComponentProvider, IContentProvider } from "core/components/providers"
import { componentURI } from "core/components/registry"
import { URI } from "vscode-uri"

export class LocalComponentStore implements IComponentProvider, IContentProvider {
   publication_cache = new Map<string, ComponentPublication>()

   async get_component_publication(id: string): Promise<ComponentPublication> {
      let pub = this.publication_cache.get(id)
      if (!pub) {
         const manifest_blob = await this.load_content(componentURI(id, "manifest"))
         if (manifest_blob) {
            const manifest = await ContentBlob.object.read(manifest_blob)
            pub = {
               component_id: id,
               description: manifest.description || "",
               title: manifest.title || id,
               icon: manifest.icon,
               keywords: manifest.keyworks,
            }
            this.publication_cache.set(id, pub)
         }
      }
      return pub
   }

   async search_component_publications(pattern?: string): Promise<ComponentPublication[]> {
      const result = [] as Promise<ComponentPublication>[]
      const length = localStorage.length
      const filter = make_search_regexp(pattern)
      for (let i = 0; i < length; i++) {
         const key = localStorage.key(i)
         const id = is_component_base_content(key, filter)
         if (id !== null) {
            result.push(this.get_component_publication(id))
         }
      }
      return Promise.all(result)
   }

   async get_component_resources(component_id: string): Promise<ResourceContent[]> {
      const res = []
      /*const length = localStorage.length
      for (let i = 0; i < length; i++) {
         const key = localStorage.key(i)
         const uri = parseURI(key)
         if (uri.authority === component_id) {
            res.push(this.get_resource(key))
         }
      }*/
      return res
   }

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
      return res.blob()
   }

   async check_content(uri: URI): Promise<string> {
      if (uri.scheme === "component") {
         const ref = uri.toString()
         const local_data = localStorage.getItem(ref)
         if (local_data) {
            return b64_format(local_data)
         }
         else {
            return this.check_url_content(`${uri.path}/${encodeURIComponent(uri.authority)}.json`)
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
         else {
            return this.load_url_content(`${uri.path}/${encodeURIComponent(uri.authority)}.json`)
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

function is_component_base_content(key: string, filter: RegExp): string | null {
   if (key.endsWith("/manifest")) {
      if (filter && !filter.test(key)) return null
      const parts = key.split("/")
      if (parts.length === 2) {
         if (filter && !filter.test(parts[0])) return null
         return parts[0]
      }
   }
   return null
}
