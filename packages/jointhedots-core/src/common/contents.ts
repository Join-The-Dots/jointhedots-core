// Content blob utilities for handling binary data

export type ContentBlob = Blob

export const ContentBlob = {
   object: {
      async read<T = any>(blob: Blob): Promise<T> {
         const text = await blob.text()
         return JSON.parse(text) as T
      },
      async write<T = any>(data: T): Promise<Blob> {
         const text = JSON.stringify(data)
         return new Blob([text], { type: "application/json" })
      }
   },
   text: {
      async read(blob: Blob): Promise<string> {
         return blob.text()
      },
      async write(text: string): Promise<Blob> {
         return new Blob([text], { type: "text/plain" })
      }
   }
}

// Base64 utilities
export function b64_blob(base64: string): Blob {
   const [meta, data] = base64.split(",")
   const mimeMatch = meta.match(/data:([^;]+)/)
   const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream"
   const binary = atob(data)
   const bytes = new Uint8Array(binary.length)
   for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
   }
   return new Blob([bytes], { type: mime })
}

export function b64_format(base64: string): string {
   const match = base64.match(/data:([^;]+)/)
   return match ? match[1] : "application/octet-stream"
}

export async function blob_b64(blob: Blob): Promise<string> {
   return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
   })
}
