import { URI } from "vscode-uri"
import type { IContentProvider } from "../../components/components.ts"
import { b64_blob, b64_format, blob_b64 } from "../../common/contents.ts"

export class StaticContentProvider implements IContentProvider {
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
      if (uri.scheme === "local") {
         const ref = uri.toString()
         const local_data = localStorage.getItem(ref)
         if (local_data) {
            return b64_format(local_data)
         }
         else {
            throw new Error(`Unsupported local content uri: ${uri}`)
         }
      }
      else {
         return this.check_url_content(uri.toString())
      }
   }

   async load_content(uri: URI): Promise<Blob> {
      if (uri.scheme === "local") {
         const ref = uri.toString()
         const local_data = localStorage.getItem(ref)
         if (local_data) {
            return b64_blob(localStorage.getItem(ref))
         }
         else {
            throw new Error(`Unsupported local content uri: ${uri}`)
         }
      }
      else {
         return this.load_url_content(uri.toString())
      }
   }

   async store_content(content: Blob, uri: URI): Promise<boolean> {
      if (uri.scheme === "local") {
         const ref = uri.toString()
         const bytes = await blob_b64(content)
         localStorage.setItem(ref, bytes)
         return true
      }
      return false
   }
}

export function contentLocalURI(id: string, norm: string, key?: string): URI {
   const path = key ? `/${norm}/${key}` : `/${norm}`
   return URI.from({ scheme: "local", authority: id, path })
}
