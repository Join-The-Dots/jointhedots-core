import { AST } from "../ast"
import { JSONSchema } from "../ast/schema/schema"
import { stringify_document } from "../ast/serde/printer"
import { Interpreter } from "./config"
import { DocumentLayer, DocumentModel, DXElement, ElementClass, ElementClasses, ElementTypenames } from "./model"

export type ElementJSON = {
   $type: string
   [more: string]: any
}

export interface IElementSerializer {
   generate(target: DXElement): ElementJSON
}

export interface IDeserializerContext {
   readonly model: DocumentModel
   readonly layer: DocumentLayer
   resolveReference($ref: string): DXElement
   New<T extends DXElement>(Cls: ElementClass<T>, owner: DXElement, typing: JSONSchema): T
   revise(target: DXElement)
}

export const ElementSerializers = new Map<string, (object: Object, data: ElementJSON) => ElementJSON>()
export const ElementDeserializers = new Map<string, (object: Object, data: ElementJSON, owner: DXElement, context: IDeserializerContext) => Promise<Object>>()
export const ElementInstanciers = new Map<string, (context: IDeserializerContext) => Object>()

export class ASTStdGenerator {
   emitIdentifier(target: DXElement): AST.Any {
      return null
   }
   generate(from: DXElement, target: DXElement): AST.Any {
      if (from === null || from === target.owner) {
         return target.exportAST(this)
      }
      return {
         $ref: target.$key,
      } as AST.LDXReference
   }
}


export function serialize_element_properties(object: DXElement, data: ElementJSON): ElementJSON {
   for (const key in object) {
      if (["model", "$key", "owner", "typing"].includes(key) === false) {
         const value = serializeValue(object[key])
         if (value !== undefined) data[key] = value
      }
   }
   return data
}

export async function deserialize_element_properties(object: DXElement, data: ElementJSON, owner: DXElement, context: IDeserializerContext) {
   for (const key in data) {
      if (key[0] !== "$") {
         object[key] = await deserializeValue(data[key], owner, context)
      }
   }
   return object
}

export function serializeValue(value: any): any {
   if (Array.isArray(value)) {
      return value.map(x => serializeValue(x))
   }
   else if (value instanceof Object) {
      if (value instanceof DXElement && value.$key !== null) {
         return { $ref: value.$key }
      }
      const $type = ElementTypenames.get(value.constructor)
      const serializer = ElementSerializers.get($type)
      if (serializer) {
         return serializer(value, { $type })
      }
      return undefined
   }
   return value
}

export function serializeElement(object: DXElement): ElementJSON {
   return object.serialize({ $type: object.constructor.name })
}

export async function deserializeValue(data: any, owner: DXElement, context: IDeserializerContext): Promise<any> {
   if (Array.isArray(data)) {
      const object = []
      for (const item of data) {
         object.push(await deserializeValue(item, owner, context))
      }
      return object
   }
   else if (data instanceof Object) {
      const { $type, $ref } = data
      if ($ref) {
         return context.resolveReference($ref)
      }
      const instancier = ElementInstanciers.get($type)
      if (!instancier) throw new Error(`Unknow $type '${$type}' instancier`)
      const deserializer = ElementDeserializers.get($type)
      if (!deserializer) throw new Error(`Unknow $type '${$type}' deserializer`)
      return deserializer(instancier(context), data, owner, context)
   }
   return data
}

export function exportElementMarkdown(element: DXElement) {
   try {
      const ctx = new ASTStdGenerator()
      const ast = ctx.generate(null, element)
      return stringify_document(ast)
   }
   catch (e) {
      console.error(e)
      return null
   }
}

export function exportDocumentMarkdown(model: DocumentModel) {
   try {
      const ctx = new ASTStdGenerator()
      const ast = ctx.generate(null, model.main)
      return stringify_document(ast)
   }
   catch (e) {
      console.error(e)
      return null
   }
}

Interpreter.addEventListener("init", () => {
   ElementTypenames.set(Object, Object.name)
   ElementClasses.set(Object.name, Object)
   ElementSerializers.set(Object.name, (object: Object, data: ElementJSON) => {
      const inner = data.inner = {}
      for (const key in object) {
         const value = serializeValue(object[key])
         if (value !== undefined) inner[key] = value
      }
      return data
   })
   ElementDeserializers.set(Object.name, async (object: Object, data: ElementJSON, owner: DXElement, context: IDeserializerContext) => {
      const { inner } = data
      for (const key in inner) {
         object[key] = await deserializeValue(inner[key], owner, context)
      }
      return object
   })
   ElementInstanciers.set(Object.name, (context: IDeserializerContext) => {
      return {} as Object
   })
})
