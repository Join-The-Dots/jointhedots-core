import { AST } from "../ast"
import {
   ArrayAppendElement, DXArray, ArraySpreadElement, DXAssignment,
   DXBinary, DXCall, DXConditional, DXDeleteMember, DocumentLayer, DocumentModel,
   DXElement, ElementClass, DXFunction, DXIdentifier, DXDocumentLayout,
   DXDisplay, DXLogical, DXMember,
   ObjectDynamicProperty,
   DXObject, ObjectNamedProperty, ObjectSpreadProperty, DXThis, DXUnary, DXUpdate,
   DocumentChangeLog,
   DocumentChangeSet,
   ElementInstanciers,
   IDeserializerContext,
   ElementDeserializers,
   ElementClasses,
   DXContent,
} from "./elements"
import { JSONSchema } from "../ast/schema/schema"
import { CommonTypes } from "../ast/schema/helpers"
import { parse_document } from "../ast/serde/parser"

let model_ids = 0

export function createDocumentID(): string {
   return "memory:doc#" + (model_ids++)
}

export class ModelBuilder implements IDeserializerContext {
   unconsolidatedElements = new Set<DXElement>()
   constructor(public model: DocumentModel) {
   }
   New<T extends DXElement>(Cls: ElementClass<T>, owner: DXElement, typing: JSONSchema): T {
      const xpr = new Cls(this.model)
      xpr.$key = createLDXKey()
      xpr.owner = owner
      xpr.typing = typing
      this.model.nodes.set(xpr.$key, xpr)
      this.revise(xpr)
      return xpr
   }
   NewFrom(owner: DXElement, node: AST.Any, typing: JSONSchema = CommonTypes.any): Promise<DXElement> {
      return buildExpression(this, node, owner, typing)
   }
   revise(target: DXElement) {
      this.unconsolidatedElements.add(target)
   }
   consolidate<T extends DXElement>(target: T, typing: JSONSchema): T {
      if (target) {
         target.typing = typing
         if (target.$key) {
            target = this.model.nodes.get(target.$key) as T
         }
         else {
            target.$key = createLDXKey()
            this.model.nodes.set(target.$key, target)
         }
         if (this.unconsolidatedElements.has(target)) {
            this.unconsolidatedElements.add(target)
            target.consolidate(this)
         }
      }
      return target
   }
   resolveReference($ref: string): DXElement {
      return this.model.nodes.get($ref)
   }
   async update(changeset: DocumentChangeSet) {
      const { model } = this
      const { log } = model
      model.builder = this

      for (const key in changeset.updates) {
         const data = changeset.updates[key]
         const prev = model.nodes.get(key)
         if (prev.constructor !== ElementClasses.get(data.$type)) {
            const instancier = ElementInstanciers.get(data.$type)
            if (!instancier) throw new Error(`Unknow $type '${data.$type}' constructor`)
            const element = instancier(this) as DXElement
            element.$key = key
            element.owner = prev.owner
            model.nodes.set(key, element)
         }
      }

      for (const key in changeset.updates) {
         const data = changeset.updates[key]
         const deserializer = ElementDeserializers.get(data.$type)
         if (!deserializer) throw new Error(`Unknow $type '${data.$type}' deserializer`)

         const element = model.nodes.get(key)
         await deserializer(element, data, element.owner, this)
         console.log(element)
      }

      log.commit(changeset)
      for (const key in changeset.updates) {
         const element = model.nodes.get(key)
         element.owner.consolidate(this)
      }

      model.builder = null
   }
   async build(ast: AST.JSXDocument) {
      const { model } = this
      model.builder = this

      const layer = new DocumentLayer(model)
      layer.$key = createLDXKey()
      layer.typing = CommonTypes.display
      layer.items = []
      for (const item of ast.items) {
         const node = await this.NewFrom(layer, item)
         layer.items.push(node)
      }

      model.base = layer
      model.log = new DocumentChangeLog(model)
      model.builder = null
   }
}

async function buildArrayFromElements(builder: ModelBuilder, elements: Array<AST.Expression | AST.SpreadElement | null>, owner: DXElement, typing: JSONSchema) {
   const xpr = owner.New(DXArray)
   for (const item of elements) {
      if (item.type === "SpreadElement") {
         const xitem = new ArraySpreadElement()
         xitem.value = await builder.NewFrom(xpr, item, typing)
         xpr.elements.push(xitem)
      }
      else {
         const xitem = new ArrayAppendElement()
         xitem.value = await builder.NewFrom(xpr, item, typing)
         xpr.elements.push(xitem)
      }
   }
   return xpr
}

export async function buildExpression(builder: ModelBuilder, node: AST.Any, owner: DXElement, typing: JSONSchema): Promise<DXElement> {
   switch (node.type) {
      case 'Literal': {
         const xpr = owner.NewConst(node.value, typing)
         return xpr
      }
      case 'Identifier': {
         const xpr = owner.New(DXIdentifier, typing)
         xpr.name = node.name
         return xpr
      }
      case 'BinaryExpression': {
         const { left, right, operator } = node as AST.BinaryExpression
         const xpr = owner.New(DXBinary, typing)
         xpr.operator = operator
         xpr.left = await builder.NewFrom(xpr, left)
         xpr.right = await builder.NewFrom(xpr, right)
         return xpr
      }
      case 'LogicalExpression': {
         const { left, right, operator } = node as AST.LogicalExpression
         const xpr = owner.New(DXLogical, typing)
         xpr.operator = operator
         xpr.left = await builder.NewFrom(xpr, left)
         xpr.right = await builder.NewFrom(xpr, right)
         return xpr
      }
      case 'UnaryExpression': {
         const { argument, operator, prefix } = node as AST.UnaryExpression
         if (operator === 'delete' && argument.type === 'MemberExpression') {
            const { object, property, computed } = argument as AST.MemberExpression
            const xpr = owner.New(DXDeleteMember, typing)
            xpr.object = await builder.NewFrom(xpr, object)
            xpr.property = computed ? await builder.NewFrom(xpr, property) : owner.NewConst((property as AST.Identifier).name)
            return xpr
         } else {
            const xpr = owner.New(DXUnary, typing)
            xpr.operator = operator
            xpr.argument = await builder.NewFrom(xpr, argument)
            return xpr
         }
      }
      case 'UpdateExpression': {
         const { argument, operator, prefix } = node as AST.UpdateExpression
         const xpr = owner.New(DXUpdate, typing)
         xpr.operator = operator
         xpr.argument = await builder.NewFrom(xpr, argument)
         return xpr
      }
      case 'AssignmentExpression': {
         const { left, right, operator } = node as AST.AssignmentExpression
         const xpr = owner.New(DXAssignment, typing)
         xpr.operator = operator
         xpr.left = await builder.NewFrom(xpr, left)
         xpr.right = await builder.NewFrom(xpr, right)
         return xpr
      }
      case 'MemberExpression': {
         const { object, property, computed } = node as AST.MemberExpression
         const xpr = owner.New(DXMember, typing)
         xpr.object = await builder.NewFrom(xpr, object)
         xpr.property = computed ? await builder.NewFrom(xpr, property) : xpr.NewConst((property as AST.Identifier).name)
         return xpr
      }
      case 'ConditionalExpression': {
         const { test, consequent, alternate } = node as AST.ConditionalExpression
         const xpr = owner.New(DXConditional, typing)
         xpr.test = await builder.NewFrom(xpr, test)
         xpr.consequent = await builder.NewFrom(xpr, consequent)
         xpr.alternate = await builder.NewFrom(xpr, alternate)
         return xpr
      }
      case 'ThisExpression': {
         const xpr = owner.New(DXThis, typing)
         return xpr
      }
      case 'CallExpression': {
         const { callee, arguments: args } = node as AST.CallExpression
         const xpr = owner.New(DXCall, typing)
         xpr.callee = await builder.NewFrom(xpr, callee, CommonTypes.function)
         xpr.arguments = await buildArrayFromElements(builder, args, xpr, CommonTypes.any)
         return xpr
      }
      case 'ArrayExpression': {
         const { elements } = node as AST.ArrayExpression
         const xpr = buildArrayFromElements(builder, elements, owner, typing)
         return xpr
      }
      case 'ObjectExpression': {
         const { properties } = node as AST.ObjectExpression
         const xpr = owner.New(DXObject, typing)
         for (const prop of properties) {
            if (prop.type === "Property") {
               const { key, value } = prop
               if (key.type === "Literal") {
                  const xprop = new ObjectNamedProperty()
                  xprop.key = xpr.NewConst(key.value)
                  xprop.value = await builder.NewFrom(xpr, value)
                  xpr.properties.push(xprop)
               }
               else {
                  const xprop = new ObjectDynamicProperty()
                  xprop.key = await builder.NewFrom(xpr, key)
                  xprop.value = await builder.NewFrom(xpr, value)
                  xpr.properties.push(xprop)
               }
            }
            else {
               const { argument } = prop
               const xprop = new ObjectSpreadProperty()
               xprop.value = await builder.NewFrom(xpr, argument)
               xpr.properties.push(xprop)
            }
         }
         return xpr
      }

      case 'ArrowFunctionExpression':
      case 'FunctionExpression': {
         const { id, params } = node
         const xpr = owner.New(DXFunction)
         xpr.thisRelay = node.type === "ArrowFunctionExpression" ? false : true
         xpr.expression = node.expression
         xpr.generator = node.generator
         xpr.async = node.async
         xpr.params = params
         xpr.body = null
         if (id) {
            //builder.registerInvariant(id, xpr)
         }
         return xpr
      }

      case 'JSXContent': {
         return buildLDXContent(builder, node, owner, typing)
      }
      case 'JSXElement': {
         return buildLDXElement(builder, node, owner, typing)
      }
      case 'JSXDocument': {
         return buildLDXDocument(builder, node, owner, typing)
      }

      default:
         throw new Error(`Unsupported node type: ${node.type}`)
   }
}

let ldx_keys = 0

export function createLDXKey(): string {
   return (ldx_keys++).toString()
}

function getContentProperty(xpr: DXObject): JSONSchema {
   const { properties } = xpr.typing
   for (const key in properties) {
      if (properties[key]?.binding?.source === "content") {
         return properties[key]
      }
   }
   return CommonTypes.any
}

export async function buildLDXElement(builder: ModelBuilder, node: AST.JSXElement, owner: DXElement, typing: JSONSchema): Promise<DXDisplay> {
   const { tag, attributes, content } = node
   const xpr = owner.New(DXDisplay, typing)

   await xpr.loadComponent(tag)
   xpr.typing = typing
   xpr.props = xpr.New(DXObject, xpr.entry.manifest["view"])
   xpr.dock = xpr.New(DXObject)
   if (attributes) {
      for (const attr of attributes) {
         if (attr.type === "JSXAttribute") {
            const ns = attr.ns || "props"
            const key = attr.name
            let target = xpr[ns]
            if (target instanceof DXObject) {
               const xprop = new ObjectNamedProperty()
               const xtyping = xpr.props?.properties?.[key] || CommonTypes.any
               xprop.key = target.NewConst(key)
               xprop.value = await builder.NewFrom(target, attr.value, xtyping)
               target.properties.push(xprop)
            }
            else {
               console.error(`Unsupported JSX attributes namespace '${ns}'`)
            }
         }
         else {
            console.error(`Unsupported JSX additionnals attributes`)
         }
      }
   }
   if (content) {
      const contentType = getContentProperty(xpr.props)
      const children = Array.isArray(content) ? content : [content]
      const result = []
      for (const child of children) {
         result.push(await buildExpression(builder, child, xpr, CommonTypes.any))
      }
      xpr.content = result
   }
   return xpr
}

export async function buildLDXContent(builder: ModelBuilder, node: AST.JSXContent, owner: DXElement, typing: JSONSchema): Promise<DXElement> {
   const { content, format } = node
   const xpr = owner.New(DXContent, typing)
   xpr.format = format
   for (const item of content) {
      if (typeof item === "string") {
         xpr.content.push(xpr.NewConst(item, CommonTypes.string))
      }
      else {
         const value = await builder.NewFrom(xpr, item, CommonTypes.string)
         xpr.content.push(value)
      }
   }
   return xpr
}

export async function buildLDXDocument(builder: ModelBuilder, node: AST.JSXDocument, owner: DXElement, typing: JSONSchema): Promise<DXDocumentLayout> {
   const { items } = node
   const xpr = owner.New(DXDocumentLayout)
   const chunks: string[] = []
   for (const item of items) {
      if (item instanceof Object) {
         const key = createLDXKey()
         xpr.paragraphs.push(await builder.NewFrom(xpr, item))
      }
      else {
         chunks.push(item)
      }
   }
   return xpr
}

export async function createDocumentModel(id: string, ast: AST.JSXDocument | string) {
   if (typeof ast === "string") {
      ast = parse_document(ast)
   }
   const model = new DocumentModel(id)
   const builder = new ModelBuilder(model)
   await builder.build(ast)
   return model
}
