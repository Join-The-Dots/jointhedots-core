import { OneOrMany } from "../../common/types"
import { SemanticUnit, TextualUnit, VisualUnit } from "../semantic/units"

export type Json = any


export type ResourceUri = string

export interface ISerde<T> {
   serialize(object: T): Json
   deserialize(data: Json): T
}

export abstract class Resource {

   // Identity API
   abstract getURI(): string

   // Export API
   abstract toSharableURI(): string
   abstract toJSON(): Json
   abstract toBlob(): Blob
   abstract toString(): string
   abstract toSemantic(fragment?: string): OneOrMany<SemanticUnit>
}

export class Blob extends Uint8Array {
   constructor(
      bytes: ArrayBuffer,
      readonly media: string,
      readonly format: string,
      readonly encoding?: string,
   ) {
      super(bytes)
   }
   static fromString(str: string, format: string = "plain", media: string = "text"): Blob {
      const buf = Buffer.from(str)
      return new Blob(buf.buffer, media, format)
   }
   toBase64() {
      if (typeof btoa === 'function') {
         const binString = Array.from(this, (byte) => String.fromCodePoint(byte)).join("")
         return btoa(binString)
      } else if (typeof Buffer === 'function') {
         return Buffer.from(this).toString('base64')
      }
   }
   toURI() {
      return `data:${this.media}/${this.format};base64,${this.toBase64()}`
   }
}

export class BlobResource extends Resource {
   constructor(
      readonly data: Blob,
      readonly uri?: string,
   ) {
      super()
   }
   getURI(): string {
      if (this.uri) return this.uri
      return this.toSharableURI()
   }
   toString(): string {
      return `[${this.constructor.name}](${this.getURI()})`
   }
   toBlob(): Blob {
      return this.data
   }
   toSharableURI(): string {
      return this.toBlob().toURI()
   }
   toSemantic(): OneOrMany<SemanticUnit> {
      const { media, format } = this.data
      switch (media) {
         case "text":
            return TextualUnit.New(
               this.data.toString(),
               format,
            )
         case "image":
            return VisualUnit.New(
               this.toBlob()
            )
         default:
            return null
      }
   }
   toJSON(): Json {
      const { media, format } = this.data
      switch (media) {
         case "text":
            return {
               type: "text",
               format,
               text: this.data.toString()
            }
         case "image":
            return {
               type: "image",
               url: this.toSharableURI()
            }
         default:
            return {
               type: "resource",
               uri: this.toSharableURI()
            }
      }
   }
}
