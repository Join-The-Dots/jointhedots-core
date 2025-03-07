
export const ContentBlob = {
   object: {
      async read<T = any>(content: Blob): Promise<T> {
         if (content && content.type == "application/json") {
            const text = await content.text()
            return JSON.parse(text) as T
         }
         return null
      },
      write<T = any>(data: T): Blob {
         const bytes = JSON.stringify(data)
         return new Blob([bytes], { type: "application/json" })
      },
   },
   text: {
      async read(content: Blob): Promise<string> {
         return content.text()
      },
      write(data: string, type?: string): Blob {
         const bytes = JSON.stringify(data)
         return new Blob([bytes], { type: type || "text/plain" })
      },
   },
   buffer: {
      async read(content: Blob): Promise<ArrayBuffer> {
         if (content && content.type == "text/plain") {
            return content.arrayBuffer()
         }
         return null
      },
      write(data: ArrayBuffer | string, type: string): Blob {
         const bytes = JSON.stringify(data)
         return new Blob([bytes], { type })
      },
   },
}

export async function blob_b64(blob: Blob) {
   if (blob) {
      const buf = await blob.arrayBuffer()
      const bytes = new Uint8Array(buf)
      const bin = bytes.reduce((acc, byte) => acc += String.fromCharCode(byte), '')
      const b64 = btoa(bin)
      return `${blob.type};${b64}`
   }
}

export function b64_blob(b64: string): Blob {
   if (b64) {
      const chunks = b64.split(";")
      const bin = atob(chunks[1])
      const bytes = [...bin].map(c => c.charCodeAt(0))
      const buf = new Uint8Array(bytes)
      return new Blob([buf], { type: chunks[0] })
   }
}

export function b64_format(b64: string): string {
   if (b64) {
      const pos = b64.indexOf(";")
      if (pos > 0) return b64.slice(0, pos)
   }
   return ""
}
