import * as AST from "../ast/nodes"
import { MapLike } from "../common/types"
import { IContext, LocalContext } from "./context"
import { EditorState } from 'lexical'
import { emitASTFromValue } from "../ast/producer"
import { ASTGenerator } from "./generator"
import { Builder } from "./builder"
import { CommonTypes } from "../ast/schema/helpers"
import { JSONSchema } from "../ast/schema/schema"
import { ComponentEntry } from "../library/components"
import { copyData } from "../ast/updater"

export type ElementClass<T extends Element = Element> = new (model: DocumentModel) => T
export type ElementKey = string

export interface ElementReferenceUpdater {
   update<T extends Element>(target: T): T
}

export type ElementJSON = {
   $type: string
   [more: string]: any
}

export interface IElementSerializer {
   generate(target: Element): ElementJSON
}

export interface IDeserializerContext {
   readonly model: DocumentModel
   resolveReference($ref: string): Element
}

export type ObjectClass = new (...args) => any
export const ElementTypenames = new Map<ObjectClass, string>()
export const ElementSerializers = new Map<string, (object: Object, data: ElementJSON) => ElementJSON>()
export const ElementDeserializers = new Map<string, (object: Object, data: ElementJSON, owner: Element, context: IDeserializerContext) => Promise<Object>>()
export const ElementInstanciers = new Map<string, (context: IDeserializerContext) => Object>()
export const ElementClasses = new Map<string, ObjectClass>()

RegisterObject()

function RegisterObject() {
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
   ElementDeserializers.set(Object.name, async (object: Object, data: ElementJSON, owner: Element, context: IDeserializerContext) => {
      const { inner } = data
      for (const key in inner) {
         object[key] = await deserializeValue(inner[key], owner, context)
      }
      return object
   })
   ElementInstanciers.set(Object.name, (context: IDeserializerContext) => {
      return {} as Object
   })
}

function serialize_element(object: Object, data: ElementJSON): ElementJSON {
   for (const key in object) {
      if (["model", "$key", "owner", "typing"].includes(key) === false) {
         const value = serializeValue(object[key])
         if (value !== undefined) data[key] = value
      }
   }
   return data
}

async function deserialize_element(object: Object, data: ElementJSON, owner: Element, context: IDeserializerContext) {
   for (const key in data) {
      if (key[0] !== "$") {
         object[key] = await deserializeValue(data[key], owner, context)
      }
   }
   return object
}

function ElementClass() {
   return function (constructor: ElementClass<Element>) {
      const $type = constructor.name
      ElementTypenames.set(constructor, $type)
      ElementClasses.set($type, constructor)
      ElementSerializers.set($type, serialize_element)
      ElementDeserializers.set($type, (object: Element, data: ElementJSON, owner: Element, context: IDeserializerContext) => {
         object.owner = owner
         return deserialize_element(object, data, object, context)
      })
      ElementInstanciers.set($type, (context: IDeserializerContext) => {
         return new constructor(context.model)
      })
   }
}

function SerializableClass() {
   return function (constructor: ObjectClass) {
      const $type = constructor.name
      ElementTypenames.set(constructor, $type)
      ElementClasses.set($type, constructor)
      ElementSerializers.set($type, serialize_element)
      ElementInstanciers.set($type, (context: IDeserializerContext) => {
         return new constructor()
      })
      ElementDeserializers.set($type, (object: Object, data: ElementJSON, owner: Element, context: IDeserializerContext) => {
         return deserialize_element(object, data, owner, context)
      })
   }
}

function serializeValue(value: any): any {
   if (Array.isArray(value)) {
      return value.map(x => serializeValue(x))
   }
   else if (value instanceof Object) {
      if (value instanceof Element && value.$key !== null) {
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

async function deserializeValue(data: any, owner: Element, context: IDeserializerContext): Promise<any> {
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

export abstract class Element {
   $key: ElementKey = null
   typing: JSONSchema = CommonTypes.any
   owner: Element = null
   constructor(
      readonly model: DocumentModel,
   ) {
   }
   New<T extends Element>(Cls: ElementClass<T>, typing: JSONSchema = CommonTypes.any): T {
      return this.model.builder.New(Cls, this, typing)
   }
   NewConst(value: any, typing: JSONSchema = CommonTypes.any): LiteralExpr {
      const node = this.New(LiteralExpr, typing)
      node.value = value
      return node
   }
   read(ctx: IContext): any {
      return undefined
   }
   write(value: any, ctx: IContext): any {
      throw new Error(`Cannot be write`)
   }
   consolidate(builer: Builder) {
   }
   update(data: ElementJSON | Element) {
      const { model } = this
      const cset = this.model.createChangeset()
      if (data instanceof Element) {
         data = data.serialize()
      }
      cset.updates[this.$key] = data
      return model.commit(cset)
   }
   serialize(): ElementJSON {
      return serialize_element(this, {
         $type: this.constructor.name,
      })
   }
   toTitle() {
      return this.constructor.name
   }
   toString() {
      return `${this.constructor.name}:${this.$key}`
   }
   abstract exportAST(gen: ASTGenerator): AST.Any
}

@ElementClass()
export class LiteralExpr extends Element {
   value: any
   override read(): any {
      return this.value
   }
   override exportAST(gen: ASTGenerator) {
      return emitASTFromValue(this.value)
   }
}

@ElementClass()
export class ThisExpr extends Element {
   override read(ctx: IContext): any {
      return ctx.getThis()
   }
   override exportAST(gen: ASTGenerator) {
      return {
         type: "ThisExpression",
      } as AST.ThisExpression
   }
}

@ElementClass()
export class IdentifierExpr extends Element {
   name: string
   override read(ctx: IContext): any {
      return ctx.getValue(this.name)
   }
   override write(value: any, ctx: IContext): any {
      return ctx.setValue(this.name, value)
   }
   override exportAST(gen: ASTGenerator) {
      return {
         type: "Identifier",
         name: this.name,
      } as AST.Identifier
   }
}

@ElementClass()
export class MemberExpr extends Element {
   object: Element
   property: Element
   override consolidate(builer: Builder) {
      this.object = builer.consolidate(this.object)
      this.property = builer.consolidate(this.property)
   }
   override read(ctx: IContext): any {
      const base = this.object.read(ctx)
      const key = this.property.read(ctx)
      return base[key]
   }
   override write(value: any, ctx: IContext): any {
      const base = this.object.read(ctx)
      const key = this.property.read(ctx)
      return base[key] = value
   }
   override exportAST(gen: ASTGenerator) {
      return {
         type: "MemberExpression",
         object: gen.generate(this, this.object),
         property: gen.generate(this, this.property),
      } as AST.MemberExpression
   }
}

@ElementClass()
export class BinaryExpr extends Element {
   left: Element
   right: Element
   operator: AST.BinaryOperator
   override consolidate(builer: Builder) {
      this.left = builer.consolidate(this.left)
      this.right = builer.consolidate(this.right)
   }
   override read(ctx: IContext): any {
      const { left, right, operator } = this
      const leftValue = left.read(ctx)
      const rightValue = right.read(ctx)
      switch (operator) {
         case '+': return leftValue + rightValue
         case '-': return leftValue - rightValue
         case '*': return leftValue * rightValue
         case '/': return leftValue / rightValue
         case '%': return leftValue % rightValue
         case '==': return leftValue == rightValue
         case '!=': return leftValue != rightValue
         case '===': return leftValue === rightValue
         case '!==': return leftValue !== rightValue
         case '<': return leftValue < rightValue
         case '<=': return leftValue <= rightValue
         case '>': return leftValue > rightValue
         case '>=': return leftValue >= rightValue
         default: throw new Error(`Unsupported binary operator: ${operator}`)
      }
   }
   override exportAST(gen: ASTGenerator) {
      return {
         type: "BinaryExpression",
         left: gen.generate(this, this.left),
         right: gen.generate(this, this.right),
      } as AST.BinaryExpression
   }
}

@ElementClass()
export class ConditionalExpr extends Element {
   test: Element
   consequent: Element
   alternate: Element
   override consolidate(builer: Builder) {
      this.test = builer.consolidate(this.test)
      this.consequent = builer.consolidate(this.consequent)
      this.alternate = builer.consolidate(this.alternate)
   }
   override read(ctx: IContext): any {
      const { test, consequent, alternate } = this
      return test.read(ctx) ? consequent.read(ctx) : alternate.read(ctx)
   }
   override exportAST(gen: ASTGenerator) {
      return {
         type: "ConditionalExpression",
         test: gen.generate(this, this.test),
         consequent: gen.generate(this, this.consequent),
         alternate: gen.generate(this, this.alternate),
      } as AST.ConditionalExpression
   }
}

@ElementClass()
export class LogicalExpr extends Element {
   left: Element
   right: Element
   operator: AST.LogicalOperator
   override consolidate(builer: Builder) {
      this.left = builer.consolidate(this.left)
      this.right = builer.consolidate(this.right)
   }
   override read(ctx: IContext): any {
      const { left, right, operator } = this
      const leftValue = left.read(ctx)
      if (operator === '&&' && !leftValue) {
         return leftValue
      } else if (operator === '||' && leftValue) {
         return leftValue
      }
      return right.read(ctx)
   }
   override exportAST(gen: ASTGenerator) {
      return {
         type: "LogicalExpression",
         left: gen.generate(this, this.left),
         right: gen.generate(this, this.right),
         operator: this.operator,
      } as AST.LogicalExpression
   }
}

@ElementClass()
export class UnaryExpr extends Element {
   argument: Element
   operator: AST.UnaryOperator
   override consolidate(builer: Builder) {
      this.argument = builer.consolidate(this.argument)
   }
   override read(ctx: IContext): any {
      const { argument, operator } = this
      const value = argument.read(ctx)
      switch (operator) {
         case '-': return -value
         case '+': return +value
         case '!': return !value
         case '~': return ~value
         case 'typeof': return typeof value
         case 'void': return void value
         case 'delete': throw new Error(`Unsupported delete operation`)
         default: throw new Error(`Unsupported unary operator: ${operator}`)
      }
   }
   override exportAST(gen: ASTGenerator) {
      return {
         type: "UnaryExpression",
         argument: gen.generate(this, this.argument),
         operator: this.operator,
      } as AST.UnaryExpression
   }
}

@ElementClass()
export class DeleteMemberExpr extends Element {
   object: Element
   property: Element
   override consolidate(builer: Builder) {
      this.object = builer.consolidate(this.object)
      this.property = builer.consolidate(this.property)
   }
   override read(ctx: IContext): any {
      const object = this.object.read(ctx)
      const property = this.property.read(ctx)
      return delete object[property]
   }
   override exportAST(gen: ASTGenerator) {
      return {
         type: "UnaryExpression",
         operator: "delete",
         argument: {
            type: "MemberExpression",
            object: gen.generate(this, this.object),
            property: gen.generate(this, this.property),
         } as AST.MemberExpression,
      } as AST.UnaryExpression
   }
}

@SerializableClass()
export class ArrayAppendElement {
   value: Element
   consolidate(builer: Builder) {
      this.value = builer.consolidate(this.value)
      return this
   }
   assign(object: any[], ctx: IContext) {
      const value = this.value.read(ctx)
      object.push(value)
   }
   exportAST(gen: ASTGenerator, from: Element) {
      return gen.generate(from, this.value)
   }
}

@SerializableClass()
export class ArraySpreadElement {
   value: Element
   consolidate(builer: Builder) {
      this.value = builer.consolidate(this.value)
      return this
   }
   assign(object: any[], ctx: IContext) {
      const value = this.value.read(ctx)
      object.push(...value)
   }
   exportAST(gen: ASTGenerator, from: Element) {
      return {
         type: "SpreadElement",
         argument: gen.generate(from, this.value),
      } as AST.SpreadElement
   }
}

export class ArrayExpr extends Element {
   elements: (ArrayAppendElement | ArraySpreadElement)[] = []
   override consolidate(builer: Builder) {
      this.elements = this.elements.map(item => item.consolidate(builer))
   }
   override read(ctx: IContext): any {
      const object: any[] = []
      for (const element of this.elements) {
         element.assign(object, ctx)
      }
      return object
   }
   override exportAST(gen: ASTGenerator) {
      return {
         type: "ArrayExpression",
         elements: this.elements.map(x => x.exportAST(gen, this)),
      } as AST.ArrayExpression
   }
}

export abstract class ObjectProperty<K extends any = any> {
   key?: K = null
   value: Element = null
   get name(): string { return null }
   abstract assign(object: MapLike<any>, ctx: IContext)
   abstract exportAST(gen: ASTGenerator, from: Element)
   consolidate(builer: Builder) {
      this.value = builer.consolidate(this.value)
      return this
   }
}

@SerializableClass()
export class ObjectDynamicProperty extends ObjectProperty<Element> {
   override consolidate(builer: Builder) {
      this.key = builer.consolidate(this.key)
      this.value = builer.consolidate(this.value)
      return this
   }
   assign(object: MapLike<any>, ctx: IContext) {
      const key = this.key.read(ctx)
      const value = this.value.read(ctx)
      object[key] = value
   }
   exportAST(gen: ASTGenerator, from: Element) {
      return {
         type: "Property",
         kind: "init",
         key: gen.generate(from, this.key),
         value: gen.generate(from, this.value),
      } as AST.Property
   }
}

@SerializableClass()
export class ObjectNamedProperty extends ObjectProperty<LiteralExpr> {
   get name(): string {
      return this.key.value
   }
   assign(object: MapLike<any>, ctx: IContext) {
      const value = this.value.read(ctx)
      object[this.key.value] = value
   }
   exportAST(gen: ASTGenerator, from: Element) {
      return {
         type: "Property",
         kind: "init",
         key: gen.generate(from, this.key),
         value: gen.generate(from, this.value),
      } as AST.Property
   }
}

@SerializableClass()
export class ObjectSpreadProperty extends ObjectProperty<never> {
   assign(object: MapLike<any>, ctx: IContext) {
      const value = this.value.read(ctx)
      Object.assign(object, value)
   }
   exportAST(gen: ASTGenerator, from: Element) {
      return {
         type: "SpreadElement",
         argument: gen.generate(from, this.value),
      } as AST.SpreadElement
   }
}

@ElementClass()
export class ObjectExpr extends Element {
   properties: ObjectProperty[] = []
   override consolidate(builer: Builder) {
      this.properties = this.properties.map(item => item.consolidate(builer))
   }
   override read(ctx: IContext): any {
      const object: MapLike<any> = {}
      for (const prop of this.properties) {
         prop.assign(object, ctx)
      }
      return object
   }
   override exportAST(gen: ASTGenerator) {
      return {
         type: "ObjectExpression",
         properties: this.properties.map(x => x.exportAST(gen, this)),
      } as AST.ObjectExpression
   }
}

@ElementClass()
export class CallExpr extends Element {
   callee: Element
   arguments: ArrayExpr
   override consolidate(builer: Builder) {
      this.callee = builer.consolidate(this.callee)
      this.arguments = builer.consolidate(this.arguments)
   }
   override read(ctx: IContext): any {
      const callee = this.callee.read(ctx)
      const args = this.arguments.read(ctx)
      return callee.apply(ctx.getThis(), args)
   }
   override exportAST(gen: ASTGenerator) {
      return {
         type: "CallExpression",
         callee: gen.generate(this, this.callee),
         arguments: gen.generate(this, this.arguments)["elements"],
      } as AST.CallExpression
   }
}

export class Script {
   execute(ctx: IContext) {
   }
}

@ElementClass()
export class FunctionExpr extends Element {
   thisRelay: boolean = false
   expression: boolean = false
   generator: boolean = false
   async: boolean = false

   params: AST.Pattern[] = null
   body: Script = null
   override read(ctx: IContext): any {
      const node = this
      return function (...args: any[]) {
         const scope = new LocalContext(ctx, node.thisRelay ? ctx.getThis() : this)
         scope.setArguments(args, node.params)
         node.body.execute(scope)
         return scope.getValue("$result")
      }
   }
   override exportAST(gen: ASTGenerator) {
      return null
   }
}

@ElementClass()
export class UpdateExpr extends Element {
   argument: Element
   operator: AST.UpdateOperator
   prefix: boolean
   override consolidate(builer: Builder) {
      this.argument = builer.consolidate(this.argument)
   }
   override read(ctx: IContext): any {
      const { argument, operator, prefix } = this
      const initialValue = argument.read(ctx)
      let updatedValue = initialValue
      if (operator === '++') {
         updatedValue++
      } else if (operator === '--') {
         updatedValue--
      } else {
         throw new Error(`Unsupported update operator: ${operator}`)
      }
      argument.write(updatedValue, ctx)
      return prefix ? initialValue : updatedValue
   }
   override exportAST(gen: ASTGenerator) {
      return {
         type: "UpdateExpression",
         argument: gen.generate(this, this.argument),
         operator: this.operator,
         prefix: this.prefix,
      } as AST.UpdateExpression
   }
}

@ElementClass()
export class AssignmentExpr extends Element {
   left: Element
   right: Element
   operator: AST.AssignmentOperator
   override consolidate(builer: Builder) {
      this.left = builer.consolidate(this.left)
      this.right = builer.consolidate(this.right)
   }
   override read(ctx: IContext): any {
      const { left, right, operator } = this
      const initialValue = left.read(ctx)
      let updatedValue = initialValue
      const argument = right.read(ctx)
      switch (operator) {
         case '=': updatedValue = argument; break
         case '+=': updatedValue += argument; break
         case '-=': updatedValue -= argument; break
         case '*=': updatedValue *= argument; break
         case '/=': updatedValue /= argument; break
         case '%=': updatedValue %= argument; break
         default: throw new Error(`Unsupported assignment operator: ${operator}`)
      }
      left.write(updatedValue, ctx)
      return updatedValue
   }
   override exportAST(gen: ASTGenerator) {
      return {
         type: "AssignmentExpression",
         left: gen.generate(this, this.left),
         right: gen.generate(this, this.right),
         operator: this.operator,
      } as AST.AssignmentExpression
   }
}

export abstract class LDXElementExpr extends Element {
}

@ElementClass()
export class LDXDisplayExpr extends LDXElementExpr {
   tag: string
   entry: ComponentEntry
   props: ObjectExpr
   dock: ObjectExpr
   override consolidate(builer: Builder) {
      this.props = builer.consolidate(this.props)
      this.dock = builer.consolidate(this.dock)
   }
   override read(ctx: IContext): any {
   }
   override toTitle(): string {
      return this.tag
   }
   override exportAST(gen: ASTGenerator) {
      const attributes: AST.JSXAttribute[] = []
      for (const ns in this) {
         const attrs = this[ns]
         if (attrs instanceof ObjectExpr) {
            for (const att of attrs.properties) {
               const name = att.name
               const value = att.value
               attributes.push({
                  type: "JSXAttribute",
                  name: (ns === "props") ? {
                     type: "JSXIdentifier",
                     name,
                  } : {
                     type: "JSXNamespacedName",
                     namespace: {
                        type: "JSXIdentifier",
                        name: ns,
                     },
                     name: {
                        type: "JSXIdentifier",
                        name,
                     }
                  },
                  value: {
                     type: "JSXExpressionContainer",
                     expression: gen.generate(attrs, value),
                  }
               } as AST.JSXAttribute)
            }
         }
      }
      const tag = {
         type: "JSXIdentifier",
         name: this.tag,
      }
      const children = []// this.children?.map(c => emitASTFromValue(c) as any) || []
      return {
         type: 'JSXElement',
         openingElement: {
            type: "JSXOpeningElement",
            name: tag,
            attributes,
         },
         closingElement: children.length > 0 && {
            type: "JSXClosingElement",
            name: tag,
         },
         children,
      } as AST.JSXElement
   }
}

@ElementClass()
export class LDXDocumentExpr extends Element {
   embeds: MapLike<Element> = {}
   markdown: string
   state: EditorState
   override consolidate(builer: Builder) {
      for (const key in this.embeds) {
         this.embeds[key] = builer.consolidate(this.embeds[key])
      }
   }
   override read(ctx: IContext): any {
      return <LDXDocumentEditor model={this} />
   }
   override exportAST(gen: ASTGenerator) {
      const result = this.markdown.split(/\x00([0-9]+)\x01/)
      return {
         type: "LDXDocument",
         items: result,
      } as AST.LDXDocument
   }
}

function LDXDocumentEditor(props: {
   model: LDXDocumentExpr,
}) {
   return <></>
}

@ElementClass()
export class DocumentLayer extends Element {
   layout: Element
   override consolidate(builer: Builder) {
      this.layout = builer.consolidate(this.layout)
   }
   override read(ctx: IContext): any {
      return this.layout.read(ctx)
   }
   override exportAST(gen: ASTGenerator) {
      return {
         type: "LDXLayer",
         layout: gen.generate(this, this.layout),
      } as AST.LDXLayer
   }
}

export type DocumentChangeMap = {
   [$key: ElementKey]: ElementJSON | null
}

export type DocumentChangeSet = {
   // Committed changes set
   updates: DocumentChangeMap
}

export type DocumentCheckpoint = DocumentChangeSet & {
   // Patched version
   version: number
   // Backups for rollback
   backups: DocumentChangeMap
}

export class DocumentChangeLog {
   static Revision: number = 0 // Current log revision id (for storage management)
   version: number = 0
   replayables: DocumentCheckpoint[] = []
   checkpoints: DocumentCheckpoint[] = []
   nodes: MapLike<ElementJSON> = {}

   constructor(readonly model: DocumentModel) {
      for (const element of model.nodes.values()) {
         this.nodes[element.$key] = element.serialize()
      }
      createDocumentDraft(this)
   }
   commit(changes: DocumentChangeSet | DocumentCheckpoint) {
      const { model } = this
      let backups: DocumentChangeMap = changes["backups"]
      if (!backups) {
         backups = {}
         for (const key in changes.updates) {
            backups[key] = this.nodes[key]
            this.nodes[key] = changes.updates[key]
         }
         if (this.replayables.length > 0) {
            this.replayables = []
         }
      }
      this.checkpoints.push({
         version: model.version++,
         backups,
         ...changes,
      })
   }
   undo() {
      const ckp = this.checkpoints.pop()
      if (ckp) {
         for (const key in ckp.backups) {
            this.nodes[key] = ckp.backups[key]
         }
         this.replayables.push(ckp)
      }
   }
   redo() {
      const changes = this.replayables.pop()
      if (changes) {
         this.commit(changes)
      }
   }
}

export const DocumentDraftFormatVersion = 1

export function createDocumentDraft(log: DocumentChangeLog): Blob {
   const data = {
      id: log.model.id,
      version: log.version,
      format: DocumentDraftFormatVersion,
      checkpoints: log.checkpoints,
      replayables: log.replayables,
      nodes: log.nodes,
   }
   console.log(data)
   return new Blob([JSON.stringify(data)], { type: "application/ldx.draft" })
}

export class DocumentModel {
   static models = new Map<string, DocumentModel>()
   base: DocumentLayer = null
   nodes = new Map<string, Element>()
   listeners = new Set<() => void>
   log: DocumentChangeLog = null
   builder: Builder = null
   version: number = 0
   constructor(
      readonly id: string,
   ) {
      DocumentModel.models.set(id, this)
   }
   createChangeset(): DocumentChangeSet {
      return {
         updates: {},
      }
   }
   getAST<T extends Element>(element: T): ReturnType<T["exportAST"]> {
      return this.log?.nodes[element.$key] as any
   }
   cloneAST<T extends Element>(element: T): ReturnType<T["exportAST"]> {
      return copyData(this.getAST(element)) as any
   }
   async commit(changeset: DocumentChangeSet) {

      const builder = new Builder(this)
      await builder.update(changeset)

      for (const listener of this.listeners) {
         listener()
      }
   }
   async update<T extends Element>(target: T, updater: (target: T, builder: Builder) => Element | Promise<Element>): Promise<Element> {
      const builder = new Builder(this)
      let result = updater(target, builder)
      if (result instanceof Promise) {
         result = await result
      }
      for (const listener of this.listeners) {
         listener()
      }
      return result
   }
   listen(listener: () => void) {
      this.listeners.add(listener)
      return () => {
         this.unlisten(listener)
      }
   }
   unlisten(listener: () => void) {
      this.listeners.delete(listener)
   }
   dispose() {
      DocumentModel.models.delete(this.id)
   }
}
