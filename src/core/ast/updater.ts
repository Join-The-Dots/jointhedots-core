import * as AST from "core/ast/nodes"
import { JSONSchemaRelation } from "./schema/document"

export type DataBreakupLevel = {
   key: string
   data: any
}

export class DataBreakupOnPath {
   constructor(
      readonly stack: DataBreakupLevel[],
      public data: any,
   ) { }
   static breakup(keys: string[], data: any): DataBreakupOnPath {
      const stack: DataBreakupLevel[] = []
      for (let i = keys[0] === "" ? 1 : 0; i < keys.length; i++) {
         const key = keys[i]
         stack.push({ key, data })
         if (data instanceof Object) data = data[key]
         else data = undefined
      }
      return new DataBreakupOnPath(stack, data)
   }
   static find(what: Object, data: any): DataBreakupOnPath {
      const rstack: DataBreakupLevel[] = []
      if (recursiveSearchObject(what, data, rstack)) {
         return new DataBreakupOnPath(rstack.reverse(), what)
      }
      return null

      function recursiveSearchObject(what: Object, data: any, rstack: DataBreakupLevel[]): boolean {
         if (data instanceof Object) {
            if (data === what) {
               return true
            }
            if (Array.isArray(data)) {
               for (let i = 0; i < data.length; i++) {
                  if (recursiveSearchObject(what, data[i], rstack)) {
                     rstack.push({ key: i.toString(), data: data })
                     return true
                  }
               }
            }
            else if (data instanceof JSONSchemaRelation) {
               return false
            }
            else {
               for (const key in data) {
                  if (recursiveSearchObject(what, data[key], rstack)) {
                     rstack.push({ key, data: data })
                     return true
                  }
               }
            }
         }
         return false
      }
   }
   get keys(): string[] {
      return this.stack.map(x => x.key)
   }
   get path(): string {
      return this.keys.join("/")
   }
   front(index: number) {
      if (index < this.stack.length) {
         return this.stack[this.stack.length - index]
      }
   }
   back(index: number) {
      if (index < this.stack.length) {
         return this.stack[this.stack.length - 1 - index]
      }
   }
   setBack(index: number, value: DataBreakupLevel) {
      if (index < this.stack.length) {
         this.stack[this.stack.length - 1 - index] = value
      }
   }
   remake(): any {
      let content = cleanUndefined(this.data)
      for (let i = this.stack.length - 1; i >= 0; i--) {
         let { key, data } = this.stack[i]
         if (data instanceof Object && data[key] !== content) {
            if (Array.isArray(data)) {
               data = data.slice()
               data[key] = content
            }
            else {
               data = {
                  ...data,
                  [key]: content,
               }
               if (content === undefined) {
                  delete data[key]
               }
            }
         }
         else if (data === undefined) {
            data = {
               [key]: content,
            }
         }
         content = data
      }
      return content
   }
}

const forbiddenNames = [
   "break", "case", "catch", "class", "const", "continue", "debugger", "default",
   "delete", "do", "else", "export", "extends", "finally", "for", "function",
   "if", "import", "in", "instanceof", "new", "return", "super", "switch",
   "this", "throw", "try", "typeof", "var", "void", "while", "with", "yield",
   "enum", "await", "implements", "interface", "package", "private", "protected",
   "public", "static", "let", "async", "of", "from", "null", "true", "false",
   "NaN", "Infinity", "undefined", "r"
]

export function isValidTechnicalName(name: string): boolean {
   if (forbiddenNames.includes(name)) {
      return false
   }
   return /^[$A-Z_a-z][0-9A-Z_a-z]*$/g.test(name)
}

export function cleanUndefined<T extends any>(data: T): T {
   if (data instanceof Object) {
      if (Array.isArray(data)) {
         data.forEach(x => cleanUndefined(x))
      }
      else if (data instanceof JSONSchemaRelation) {
         // nothing todo
      }
      else {
         for (const key in data) {
            if (data[key] !== undefined) {
               cleanUndefined(data[key])
            }
            else {
               delete data[key]
            }
         }
      }
   }
   return data
}

export function copyData<T extends any>(data: T): T {
   if (data instanceof Object) {
      if (Array.isArray(data)) {
         return data.map(x => copyData(x)) as T
      }
      else if (data instanceof JSONSchemaRelation) {
         return { $ref: data.$ref } as T
      }
      else {
         return Object.keys(data).reduce((x, k) => {
            x[k] = copyData(data[k])
            return x
         }, {}) as T
      }
   }
   return data
}

export function checkDataEquals(data1: any, data2: any): boolean {
   if (data1 === data2) {
      return true
   }
   if (typeof data1 !== typeof data2) {
      return false
   }
   if (data1 instanceof Object) {
      if (data1.constructor !== data2.constructor) {
         return false
      }
      if (Array.isArray(data1)) {
         if (data1.length !== data2.length) {
            return false
         }
         for (let i = 0; i < data1.length; i++) {
            if (checkDataEquals(data1[i], data2[i]) === false) {
               return false
            }
         }
         return true
      }
      else if (data1 instanceof JSONSchemaRelation) {
         return data1.$ref === data2.$ref
      }
      else {
         if (checkDataEquals(Object.keys(data1), Object.keys(data2)) === false) {
            return false
         }
         for (const key in data1) {
            if (checkDataEquals(data1[key], data2[key]) === false) {
               return false
            }
         }
         return true
      }
   }
   return false
}

export function ASTExpressionFilter(data: any) {
   if (data instanceof JSONSchemaRelation) {
      return false
   }
   return true
}

export function findObjectPath(what: Object, content: Object): string {
   const infos = DataBreakupOnPath.find(what, content)
   if (infos) return infos.path
   return null
}

export function findObjectKeys(what: Object, content: Object): string[] {
   const infos = DataBreakupOnPath.find(what, content)
   if (infos) return infos.keys
   return null
}

export function getDataAtKeys(keys: string[], content: Object): any {
   for (let i = keys[0] === "" ? 1 : 0; i < keys.length; i++) {
      if (content instanceof Object) {
         content = content[keys[i]]
         if (content === undefined) {
            return undefined
         }
      }
      else {
         return undefined
      }
   }
   return content
}

export function getDataAtPath(path: string, content: Object): any {
   const keys = path ? path.split("/") : []
   return getDataAtKeys(keys, content)
}

export function setDataAtPath(path: string, data: any, content: Object): any {
   const infos = DataBreakupOnPath.breakup(path.split("/"), content)
   infos.data = data
   return infos.remake()
}

export type DescriptorPlacement = {
   path: string
   content: AST.Node
}

export function findDescriptorPath(searched: any, descriptor: AST.Node) {
   return DataBreakupOnPath.find(searched, descriptor)
}

export function insertDescriptorAtPath(path: string, descriptor: AST.Node, source: AST.Node): DescriptorPlacement {
   const content = DataBreakupOnPath.breakup(path.split("/"), source)
   injectDescriptorStackTop(content, descriptor)
   return {
      path: content.path,
      content: content.remake()
   }
}

export function displaceDescriptorAtPath(from_path: string, to_path: string, source: AST.Node): DescriptorPlacement {

   // Remove content at 'from' path
   const keys_ejected = from_path.split("/")
   const content_ejected = DataBreakupOnPath.breakup(keys_ejected, source)
   const descriptor = ejectDescriptorStackTop(content_ejected)

   // Insert content at 'to' path
   if (descriptor !== undefined) {
      const keys_injected = consolidatePathAfterEjection(to_path.split("/"), keys_ejected)
      if (keys_injected) {
         const content_injected = DataBreakupOnPath.breakup(keys_injected, content_ejected.remake())
         injectDescriptorStackTop(content_injected, descriptor)
         return {
            path: content_injected.path,
            content: content_injected.remake(),
         }
      }
   }

   return {
      path: from_path,
      content: source,
   }
}

export function deleteDescriptorAtPath(path: string, source: AST.Node): AST.Node {
   const content = DataBreakupOnPath.breakup(path.split("/"), source)
   ejectDescriptorStackTop(content)
   return content.remake()
}

function injectDescriptorStackTop(content: DataBreakupOnPath, injected: AST.Node) {
   if (content.data instanceof Object) {
      const owner = content.back(0)
      if (Array.isArray(owner.data)) {
         let index = parseInt(owner.key)
         if (!isNaN(index)) {
            index++
            owner.key = index.toString()
            owner.data = owner.data.slice()
            owner.data.splice(index, 0, undefined)
         }
      }
      else {
         content.stack.push({ key: "items", data: { type: "group" } })
         content.stack.push({ key: "1", data: [content.data] })
      }
   }
   content.data = injected
}

function ejectDescriptorStackTop(content: DataBreakupOnPath): AST.Node {
   let ejected: AST.Node = content.data
   if (content.data instanceof Object) {
      const owner = content.back(0)
      if (Array.isArray(owner.data)) {
         let index = parseInt(owner.key)
         if (!isNaN(index)) {
            const data = owner.data.slice()
            data.splice(index, 1)
            content.stack.pop()
            content.data = data
         }
         else {
            content.data = undefined
         }
      }
      else {
         content.data = undefined
      }
   }
   return ejected
}

function consolidatePathAfterEjection(keys: string[], keys_ejected: string[]): string[] {
   if (keys_ejected.length <= keys.length) {

      // Compute common paths length
      let common_length = 0
      while (common_length < keys_ejected.length && keys[common_length] == keys_ejected[common_length]) {
         common_length++
      }

      // Check if self ejected
      if (common_length === keys_ejected.length) {
         return null
      }

      // Shift indexes when ejected is an array item
      const last_index = parseInt(keys[keys_ejected.length - 1])
      const last_index_ejected = parseInt(keys_ejected[keys_ejected.length - 1])
      if (!isNaN(last_index_ejected) && !isNaN(last_index)) {
         if (last_index_ejected < last_index) {
            keys[keys_ejected.length - 1] = (last_index - 1).toString()
         }
      }

   }
   return keys
}

export function exactInstanceOf(obj: Object, cls: new (...args) => Object) {
   return obj?.["constructor"] === cls
}
