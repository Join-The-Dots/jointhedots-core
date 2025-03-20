import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { MapLike } from '../common/types'

export type CEncryptToken = {
   key: Buffer
   iv: Buffer
}

export type CDataScheme = {
   type: string
   flags?: string[]
   attributes?: MapLike<string>
}

export type CDataUrl = CDataScheme & {
   content?: Buffer
}

export type CRef = string
export type CScheme = string | CDataScheme
export type CData = { $scheme?: CScheme, $ref?: string } & MapLike<any>

function acquireEncryptionToken(): CEncryptToken {
   let skey = localStorage.getItem("component/encrypt")
   if (!skey) {
      skey = randomBytes(128).toString("base64")
      localStorage.setItem("component/encrypt", skey)
   }
   const parts = skey.split(";")
   return {
      key: Buffer.from(parts[0], 'base64'),
      iv: Buffer.from(parts[1], 'base64'),
   }
}

const localEncryptionToken = acquireEncryptionToken()

function parseDataUrl(url: CRef): CDataUrl {
   const chunks = url.slice(5).split(";")

   const flags = chunks[0].split("+")
   const type = flags.shift()

   const attributes = {}
   for (let i = 1; i < chunks.length - 1; i++) {
      const [key, value] = chunks[i].split("=")
      attributes[key] = value
   }

   const bytes = chunks[chunks.length - 1]
   const encoding = bytes.slice(0, bytes.indexOf(","))
   const content = Buffer.from(bytes, encoding as BufferEncoding)

   return { type, flags, content, attributes }
}

function stringifyDataUrl(parsed: CDataUrl): CRef {
   const chunks = []

   if (parsed.flags) {
      chunks.push(parsed.type + "+" + parsed.flags.join("+"))
   }
   else {
      chunks.push(parsed.type)
   }

   for (const key in parsed.attributes) {
      const value = parsed.attributes[key]
      chunks.push(`${key}=${value}`)
   }

   const bytes = "base64," + parsed.content.toString("base64")
   chunks.push(bytes)

   return "data:" + chunks.join(";")
}

export function encryptData(scheme: CScheme, data: CData, token: CEncryptToken): string {
   if (scheme.endsWith(":")) throw new Error("invalid scheme")
   const cipher = createCipheriv('aes-256-cbc', token.key, token.iv)
   const decrypted = JSON.stringify({ ...data, $scheme: scheme })
   const encrypted = cipher.update(decrypted, 'utf8', 'base64') + cipher.final('base64')
   return scheme + ":" + encrypted
}

export function decryptData(scheme: CScheme, payload: string, token: CEncryptToken): CData {
   if (scheme.endsWith(":")) throw new Error("invalid scheme")
   const decipher = createDecipheriv('aes-256-cbc', token.key, token.iv)
   const encrypted = payload.slice(scheme.length + 1)
   const decrypted = decipher.update(encrypted, 'base64', 'utf8') + decipher.final('utf8')
   const data = JSON.parse(decrypted)
   data.$scheme = scheme
   return data
}


export function encodeDataUrl(data: CData): string {
   const jsonString = JSON.stringify(data);
   const base64String = Buffer.from(jsonString, 'utf-8').toString('base64');
   return `data:application/json;base64,${base64String}`;
}

export function decodeDataUrl<T>(dataUrl: string): CData {
   const base64String = dataUrl.split(',')[1];
   const jsonString = Buffer.from(base64String, 'base64').toString('utf-8');
   return JSON.parse(jsonString) as T;
}

export function unpackData(value: any, unpacker: ($ref: CRef, data: CData) => CData): any {
   if (value instanceof Object) {
      if (typeof value?.$ref === "string") {
         return unpacker(value?.$ref, value)
      }
      for (const key in value) {
         value[key] = unpackData(value[key], unpacker)
      }
   }
   return value
}

export function packData(value: any, packer: ($scheme: CScheme, data: CData) => CRef): any {
   if (value instanceof Object) {
      if (value?.$scheme) {
         const $ref = packer(value?.$scheme, value)
         if ($ref) return { $ref }
      }
      for (const key in value) {
         value[key] = packData(value[key], packer)
      }
   }
   return value
}

const localdata_scheme = "localdata:"

export const StandardPacking = {
   unpacker($ref: string, data: CData): CData {
      if ($ref.startsWith("data:")) {
         decryptData(localdata_scheme, $ref, localEncryptionToken)
      }
      return data
   },
   packer($scheme: CScheme, data: CData): CRef {
      if ($scheme instanceof Object) {
         return encryptData($scheme, data, localEncryptionToken)
      }
      return `data:`
   },
}
