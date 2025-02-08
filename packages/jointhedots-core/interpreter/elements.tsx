import { AST } from "../ast"
import { MapLike, ObjectClass } from "../common/types"
import { IContext, LocalContext } from "./context"
import { EditorState } from 'lexical'
import { emitASTFromValue } from "../ast/emitter"
import { ASTGenerator } from "./generator"
import { ModelBuilder } from "./builder"
import { CommonTypes } from "../ast/schema/helpers"
import { JSONSchema } from "../ast/schema/schema"
import { ComponentEntry, ComponentsRegistry } from "../library/components"
import { copyData } from "../common/datatree"
import React from "react"

export type ElementClass<T extends DXElement = DXElement> = new (model: DocumentModel) => T
export type ElementKey = string

export interface ElementReferenceUpdater {
   update<T extends DXElement>(target: T): T
}

export type ElementJSON = {
   $type: string
   [more: string]: any
}

export interface IElementSerializer {
   generate(target: DXElement): ElementJSON
}

export interface IDeserializerContext {
   readonly model: DocumentModel
   resolveReference($ref: string): DXElement
   New<T extends DXElement>(Cls: ElementClass<T>, owner: DXElement, typing: JSONSchema): T
   revise(target: DXElement)
}

export const ElementTypenames = new Map<ObjectClass, string>()
export const ElementSerializers = new Map<string, (object: Object, data: ElementJSON) => ElementJSON>()
export const ElementDeserializers = new Map<string, (object: Object, data: ElementJSON, owner: DXElement, context: IDeserializerContext) => Promise<Object>>()
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
}

function ElementClass() {
   return function (constructor: ElementClass<DXElement>) {
      const $type = constructor.name
      ElementTypenames.set(constructor, $type)
      ElementClasses.set($type, constructor)
      ElementSerializers.set($type, (object: DXElement, data: ElementJSON) => {
         return object.serialize(data)
      })
      ElementDeserializers.set($type, (object: DXElement, data: ElementJSON, owner: DXElement, context: IDeserializerContext) => {
         context.revise(object)
         object.owner = owner
         return object.deserialize(data, context)
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
      ElementSerializers.set($type, serialize_element_properties)
      ElementDeserializers.set($type, deserialize_element_properties)
      ElementInstanciers.set($type, (context: IDeserializerContext) => {
         return new constructor()
      })
   }
}

function serialize_element_properties(object: DXElement, data: ElementJSON): ElementJSON {
   for (const key in object) {
      if (["model", "$key", "owner", "typing"].includes(key) === false) {
         const value = serializeValue(object[key])
         if (value !== undefined) data[key] = value
      }
   }
   return data
}

async function deserialize_element_properties(object: DXElement, data: ElementJSON, owner: DXElement, context: IDeserializerContext) {
   for (const key in data) {
      if (key[0] !== "$") {
         object[key] = await deserializeValue(data[key], owner, context)
      }
   }
   return object
}

function serializeValue(value: any): any {
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

async function deserializeValue(data: any, owner: DXElement, context: IDeserializerContext): Promise<any> {
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

export abstract class DXElement {
   $key: ElementKey = null
   typing: JSONSchema = CommonTypes.any
   owner: DXElement = null
   constructor(
      readonly model: DocumentModel,
   ) {
   }
   New<T extends DXElement>(Cls: ElementClass<T>, typing: JSONSchema = CommonTypes.any): T {
      return this.model.builder.New(Cls, this, typing)
   }
   NewConst(value: any, typing: JSONSchema = CommonTypes.any): DXLiteral {
      const node = this.New(DXLiteral, typing)
      node.value = value
      return node
   }
   read(ctx: IContext): any {
      return undefined
   }
   write(value: any, ctx: IContext): any {
      throw new Error(`Cannot be write`)
   }
   consolidate(builder: ModelBuilder) {
   }
   update(data: ElementJSON | DXElement) {
      const { model } = this
      const cset = this.model.createChangeset()
      if (data instanceof DXElement) {
         data = serializeElement(data)
      }
      cset.updates[this.$key] = data
      return model.commit(cset)
   }
   serialize(data: ElementJSON): ElementJSON {
      return serialize_element_properties(this, data)
   }
   deserialize(data: ElementJSON, context: IDeserializerContext): Promise<DXElement> {
      return deserialize_element_properties(this, data, this, context)
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
export class DXLiteral extends DXElement {
   value: any
   override read(): any {
      return this.value
   }
   override exportAST(gen: ASTGenerator) {
      return emitASTFromValue(this.value)
   }
}

@ElementClass()
export class DXThis extends DXElement {
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
export class DXIdentifier extends DXElement {
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
export class DXMember extends DXElement {
   object: DXElement
   property: DXElement
   override consolidate(builder: ModelBuilder) {
      this.object = builder.consolidate(this.object, CommonTypes.any)
      this.property = builder.consolidate(this.property, CommonTypes.string)
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
export class DXBinary extends DXElement {
   left: DXElement
   right: DXElement
   operator: AST.BinaryOperator
   override consolidate(builder: ModelBuilder) {
      this.left = builder.consolidate(this.left, CommonTypes.any)
      this.right = builder.consolidate(this.right, CommonTypes.any)
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
export class DXConditional extends DXElement {
   test: DXElement
   consequent: DXElement
   alternate: DXElement
   override consolidate(builder: ModelBuilder) {
      this.test = builder.consolidate(this.test, CommonTypes.boolean)
      this.consequent = builder.consolidate(this.consequent, CommonTypes.any)
      this.alternate = builder.consolidate(this.alternate, CommonTypes.any)
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
export class DXLogical extends DXElement {
   left: DXElement
   right: DXElement
   operator: AST.LogicalOperator
   override consolidate(builder: ModelBuilder) {
      this.left = builder.consolidate(this.left, CommonTypes.any)
      this.right = builder.consolidate(this.right, CommonTypes.any)
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
export class DXUnary extends DXElement {
   argument: DXElement
   operator: AST.UnaryOperator
   override consolidate(builder: ModelBuilder) {
      this.argument = builder.consolidate(this.argument, CommonTypes.any)
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
export class DXDeleteMember extends DXElement {
   object: DXElement
   property: DXElement
   override consolidate(builder: ModelBuilder) {
      this.object = builder.consolidate(this.object, CommonTypes.any)
      this.property = builder.consolidate(this.property, CommonTypes.string)
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
   value: DXElement
   consolidate(builder: ModelBuilder) {
      this.value = builder.consolidate(this.value, CommonTypes.any)
      return this
   }
   assign(object: any[], ctx: IContext) {
      const value = this.value.read(ctx)
      object.push(value)
   }
   exportAST(gen: ASTGenerator, from: DXElement) {
      return gen.generate(from, this.value)
   }
}

@SerializableClass()
export class ArraySpreadElement {
   value: DXElement
   consolidate(builder: ModelBuilder) {
      this.value = builder.consolidate(this.value, CommonTypes.any)
      return this
   }
   assign(object: any[], ctx: IContext) {
      const value = this.value.read(ctx)
      object.push(...value)
   }
   exportAST(gen: ASTGenerator, from: DXElement) {
      return {
         type: "SpreadElement",
         argument: gen.generate(from, this.value),
      } as AST.SpreadElement
   }
}

export class DXArray extends DXElement {
   elements: (ArrayAppendElement | ArraySpreadElement)[] = []
   override consolidate(builder: ModelBuilder) {
      this.elements = this.elements.map(item => item.consolidate(builder))
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
   value: DXElement = null
   get name(): string { return null }
   abstract assign(object: MapLike<any>, ctx: IContext)
   abstract exportAST(gen: ASTGenerator, from: DXElement)
   consolidate(builder: ModelBuilder) {
      this.value = builder.consolidate(this.value, CommonTypes.any)
      return this
   }
}

@SerializableClass()
export class ObjectDynamicProperty extends ObjectProperty<DXElement> {
   override consolidate(builder: ModelBuilder) {
      this.key = builder.consolidate(this.key, CommonTypes.string)
      this.value = builder.consolidate(this.value, CommonTypes.any)
      return this
   }
   assign(object: MapLike<any>, ctx: IContext) {
      const key = this.key.read(ctx)
      const value = this.value.read(ctx)
      object[key] = value
   }
   exportAST(gen: ASTGenerator, from: DXElement) {
      return {
         type: "Property",
         kind: "init",
         key: gen.generate(from, this.key),
         value: gen.generate(from, this.value),
      } as AST.Property
   }
}

@SerializableClass()
export class ObjectNamedProperty extends ObjectProperty<DXLiteral> {
   get name(): string {
      return this.key.value
   }
   assign(object: MapLike<any>, ctx: IContext) {
      const value = this.value.read(ctx)
      object[this.key.value] = value
   }
   exportAST(gen: ASTGenerator, from: DXElement) {
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
   exportAST(gen: ASTGenerator, from: DXElement) {
      return {
         type: "SpreadElement",
         argument: gen.generate(from, this.value),
      } as AST.SpreadElement
   }
}

@ElementClass()
export class DXObject extends DXElement {
   properties: ObjectProperty[] = []
   override consolidate(builder: ModelBuilder) {
      this.properties = this.properties.map(item => item.consolidate(builder))
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
export class DXCall extends DXElement {
   callee: DXElement
   arguments: DXArray
   override consolidate(builder: ModelBuilder) {
      this.callee = builder.consolidate(this.callee, CommonTypes.any)
      this.arguments = builder.consolidate(this.arguments, CommonTypes.any)
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
export class DXFunction extends DXElement {
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
export class DXUpdate extends DXElement {
   argument: DXElement
   operator: AST.UpdateOperator
   prefix: boolean
   override consolidate(builder: ModelBuilder) {
      this.argument = builder.consolidate(this.argument, CommonTypes.any)
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
export class DXAssignment extends DXElement {
   left: DXElement
   right: DXElement
   operator: AST.AssignmentOperator
   override consolidate(builder: ModelBuilder) {
      this.left = builder.consolidate(this.left, CommonTypes.any)
      this.right = builder.consolidate(this.right, CommonTypes.any)
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

export enum DisplayType {
   React,
   WebComponent,
}

@ElementClass()
export class DXContent extends DXElement {
   format: string
   content: DXElement[] = []

   override consolidate(builder: ModelBuilder) {
   }
   override exportAST(gen: ASTGenerator) {
      const content: AST.JSXContentChunk[] = []
      for (const item of this.content) {
         if (item instanceof DXLiteral) {
            content.push(item.value.toString())
         }
         else {
            content.push(gen.generate(this, item))
         }
      }
      return {
         type: 'JSXContent',
         format: this.format,
         content,
      } as AST.JSXContent
   }
}

@ElementClass()
export class DXDisplay extends DXElement {
   tag: string
   type: DisplayType
   entry: ComponentEntry
   component: React.ComponentType | HTMLElement
   props: DXObject
   content: DXElement[]
   dock: DXObject
   override async deserialize(data: ElementJSON, context: IDeserializerContext): Promise<DXDisplay> {
      await this.loadComponent(data.tag)
      if (data.props) this.props = await deserializeValue(data.props, this, context)
      else this.props = context.New(DXObject, this, CommonTypes.any)
      return this
   }
   override consolidate(builder: ModelBuilder) {
      const propsTyping = this.entry.manifest["view"]
      this.props = builder.consolidate(this.props, propsTyping)
      this.dock = builder.consolidate(this.dock, CommonTypes.any)
   }
   override read(ctx: IContext): any {
      const { type } = this
      if (type === DisplayType.React) {
         const props = this.props.read(ctx)
         return React.createElement(this.component as React.ComponentType, props)
      }
      return null
   }
   override toTitle(): string {
      return this.tag
   }
   async loadComponent(tag: string) {
      const entry = ComponentsRegistry.acquireComponent(tag)
      const manifest = await entry.fetch()
      this.tag = tag
      this.entry = entry
      if (manifest.services["view.react"]) {
         this.type = DisplayType.React
         this.component = await entry.fetchResource("view.react")
      }
      else if (manifest.services["view.web"]) {
         this.type = DisplayType.WebComponent
         this.component = await entry.fetchResource("view.web")
      }
   }
   override exportAST(gen: ASTGenerator) {
      const attributes: AST.JSXAttribute[] = []
      for (const ns in this) {
         const attrs = this[ns]
         if (attrs instanceof DXObject) {
            for (const att of attrs.properties) {
               const name = att.name
               const value = att.value
               attributes.push({
                  type: "JSXAttribute",
                  ns: (ns === "props") ? "" : ns,
                  name: name,
                  value: gen.generate(attrs, value),
               })
            }
         }
      }
      return {
         type: 'JSXElement',
         tag: this.tag,
         attributes,
      } as AST.JSXElement
   }
}

@ElementClass()
export class DXDocumentLayout extends DXElement {
   embeds: MapLike<DXElement> = {}
   markdown: string
   state: EditorState
   override consolidate(builder: ModelBuilder) {
      for (const key in this.embeds) {
         this.embeds[key] = builder.consolidate(this.embeds[key], CommonTypes.display)
      }
   }
   override read(ctx: IContext): any {
      return <DXDocumentEditor model={this} />
   }
   override exportAST(gen: ASTGenerator) {
      const result = this.markdown.split(/\x00([0-9]+)\x01/)
      for (const key in this.embeds) {
         //this.embeds[key] = builder.consolidate(this.embeds[key], CommonTypes.display)
      }
      return {
         type: "JSXDocument",
         format: "markdown",
         items: result,
      } as AST.JSXDocument
   }
}

function DXDocumentEditor(props: {
   model: DXDocumentLayout,
}) {
   return <></>
}

@ElementClass()
export class DocumentLayer extends DXElement {
   items: DXElement[]
   layout: DXDocumentLayout
   override consolidate(builder: ModelBuilder) {
      this.items = this.items.map(item => builder.consolidate(item, CommonTypes.any))
      this.layout = builder.consolidate(this.layout, CommonTypes.any)
   }
   override read(ctx: IContext): any {
      const children = []
      for (const item of this.items) {
         if (item.typing.type === "display") {
            children.push(item.read(ctx))
         }
      }
      return React.createElement(React.Fragment, ...children)
   }
   override exportAST(gen: ASTGenerator): AST.JSXDocument {
      return {
         type: "JSXDocument",
         format: "markdown",
         items: this.items.map(item => gen.generate(this, item)),
      }
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
         this.nodes[element.$key] = serializeElement(element)
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
   nodes = new Map<string, DXElement>()
   listeners = new Set<() => void>
   log: DocumentChangeLog = null
   builder: ModelBuilder = null
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
   getAST<T extends DXElement>(element: T): ReturnType<T["exportAST"]> {
      return this.log?.nodes[element.$key] as any
   }
   cloneAST<T extends DXElement>(element: T): ReturnType<T["exportAST"]> {
      return copyData(this.getAST(element)) as any
   }
   async commit(changeset: DocumentChangeSet) {

      const builder = new ModelBuilder(this)
      await builder.update(changeset)

      for (const listener of this.listeners) {
         listener()
      }
   }
   async update<T extends DXElement>(target: T, updater: (target: T, builder: ModelBuilder) => DXElement | Promise<DXElement>): Promise<DXElement> {
      const builder = new ModelBuilder(this)
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
