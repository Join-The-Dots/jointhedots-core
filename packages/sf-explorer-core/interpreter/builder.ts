import * as AST from "../ast/nodes"
import { getSymbolFromNode } from '../ast/evaluate'
import { deserialize_jsx_document } from "../ast/serde/markdown"
import {
   ArrayAppendElement, ArrayExpr, ArraySpreadElement, AssignmentExpr,
   BinaryExpr, CallExpr, ConditionalExpr, DeleteMemberExpr, DocumentLayer, DocumentModel,
   Element, ElementClass, FunctionExpr, IdentifierExpr, LDXDocumentExpr,
   LDXDisplayExpr, LogicalExpr, MemberExpr,
   ObjectDynamicProperty,
   ObjectExpr, ObjectNamedProperty, ObjectSpreadProperty, ThisExpr, UnaryExpr, UpdateExpr,
   DocumentChangeLog,
   DocumentChangeSet,
   ElementInstanciers,
   IDeserializerContext,
   ElementDeserializers,
   ElementClasses,
} from "./elements"
import { ComponentsRegistry } from "../library/components"
import { JSONSchema } from "../ast/schema/schema"
import { CommonTypes } from "../ast/schema/helpers"

let model_ids = 0

export function createDocumentID(): string {
   return "memory:doc#" + (model_ids++)
}

export class Builder implements IDeserializerContext {
   constructor(public model: DocumentModel) {
   }
   New<T extends Element>(Cls: ElementClass<T>, owner: Element, typing: JSONSchema): T {
      const xpr = new Cls(this.model)
      xpr.$key = createLDXKey()
      xpr.owner = owner
      xpr.typing = typing
      this.model.nodes.set(xpr.$key, xpr)
      return xpr
   }
   NewFrom(owner: Element, node: AST.Any, typing: JSONSchema = CommonTypes.any): Promise<Element> {
      return buildExpression(this, node, owner, typing)
   }
   consolidate<T extends Element>(target: T, typing?: JSONSchema): T {
      if (target.$key) {
         target = this.model.nodes.get(target.$key) as T
      }
      else {
         target.$key = createLDXKey()
         this.model.nodes.set(target.$key, target)
      }
      return target
   }
   resolveReference($ref: string): Element {
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
            const element = instancier(this) as Element
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
   async build(ast: AST.LDXLayer) {
      const { model } = this
      model.builder = this

      const layer = new DocumentLayer(model)
      layer.$key = createLDXKey()
      layer.typing = CommonTypes.display
      layer.layout = await this.NewFrom(layer, ast.layout)

      model.base = layer
      model.log = new DocumentChangeLog(model)
      model.builder = null
   }
}

async function buildArrayFromElements(builder: Builder, elements: Array<AST.Expression | AST.SpreadElement | null>, owner: Element, typing: JSONSchema) {
   const xpr = owner.New(ArrayExpr)
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

export async function buildExpression(builder: Builder, node: AST.Any, owner: Element, typing: JSONSchema): Promise<Element> {
   switch (node.type) {
      case 'Literal': {
         const xpr = owner.NewConst(node.value, typing)
         return xpr
      }
      case 'Identifier': {
         const xpr = owner.New(IdentifierExpr, typing)
         xpr.name = node.name
         return xpr
      }
      case 'BinaryExpression': {
         const { left, right, operator } = node as AST.BinaryExpression
         const xpr = owner.New(BinaryExpr, typing)
         xpr.operator = operator
         xpr.left = await builder.NewFrom(xpr, left)
         xpr.right = await builder.NewFrom(xpr, right)
         return xpr
      }
      case 'LogicalExpression': {
         const { left, right, operator } = node as AST.LogicalExpression
         const xpr = owner.New(LogicalExpr, typing)
         xpr.operator = operator
         xpr.left = await builder.NewFrom(xpr, left)
         xpr.right = await builder.NewFrom(xpr, right)
         return xpr
      }
      case 'UnaryExpression': {
         const { argument, operator, prefix } = node as AST.UnaryExpression
         if (operator === 'delete' && argument.type === 'MemberExpression') {
            const { object, property, computed } = argument as AST.MemberExpression
            const xpr = owner.New(DeleteMemberExpr, typing)
            xpr.object = await builder.NewFrom(xpr, object)
            xpr.property = computed ? await builder.NewFrom(xpr, property) : owner.NewConst((property as AST.Identifier).name)
            return xpr
         } else {
            const xpr = owner.New(UnaryExpr, typing)
            xpr.operator = operator
            xpr.argument = await builder.NewFrom(xpr, argument)
            return xpr
         }
      }
      case 'UpdateExpression': {
         const { argument, operator, prefix } = node as AST.UpdateExpression
         const xpr = owner.New(UpdateExpr, typing)
         xpr.operator = operator
         xpr.argument = await builder.NewFrom(xpr, argument)
         return xpr
      }
      case 'AssignmentExpression': {
         const { left, right, operator } = node as AST.AssignmentExpression
         const xpr = owner.New(AssignmentExpr, typing)
         xpr.operator = operator
         xpr.left = await builder.NewFrom(xpr, left)
         xpr.right = await builder.NewFrom(xpr, right)
         return xpr
      }
      case 'MemberExpression': {
         const { object, property, computed } = node as AST.MemberExpression
         const xpr = owner.New(MemberExpr, typing)
         xpr.object = await builder.NewFrom(xpr, object)
         xpr.property = computed ? await builder.NewFrom(xpr, property) : xpr.NewConst((property as AST.Identifier).name)
         return xpr
      }
      case 'ConditionalExpression': {
         const { test, consequent, alternate } = node as AST.ConditionalExpression
         const xpr = owner.New(ConditionalExpr, typing)
         xpr.test = await builder.NewFrom(xpr, test)
         xpr.consequent = await builder.NewFrom(xpr, consequent)
         xpr.alternate = await builder.NewFrom(xpr, alternate)
         return xpr
      }
      case 'ThisExpression': {
         const xpr = owner.New(ThisExpr, typing)
         return xpr
      }
      case 'CallExpression': {
         const { callee, arguments: args } = node as AST.CallExpression
         const xpr = owner.New(CallExpr, typing)
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
         const xpr = owner.New(ObjectExpr, typing)
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
         const xpr = owner.New(FunctionExpr)
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

      case 'JSXExpressionContainer': {
         return buildExpression(builder, node.expression, owner, typing)
      }
      case 'JSXElement': {
         return buildLDXElement(builder, node, owner, typing)
      }
      case 'LDXDocument': {
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

export async function buildLDXElement(builder: Builder, node: AST.JSXElement, owner: Element, typing: JSONSchema): Promise<LDXDisplayExpr> {
   const { name, attributes } = node.openingElement
   const component_id = getSymbolFromNode(name)
   const entry = ComponentsRegistry.acquireComponent(component_id)
   const manifest = await entry.fetch()

   const xpr = owner.New(LDXDisplayExpr, typing)
   xpr.typing = typing
   xpr.tag = component_id
   xpr.props = xpr.New(ObjectExpr, manifest["view"])
   xpr.dock = xpr.New(ObjectExpr)
   xpr.entry = entry

   for (const attr of attributes) {
      if (attr.type === "JSXAttribute") {
         const { name } = attr
         let key: string, ns: string
         if (name.type === "JSXIdentifier") {
            ns = "props"
            key = name.name
         }
         else {
            ns = name.namespace.name
            key = name.name.name
         }
         let target = xpr[ns]
         if (target instanceof ObjectExpr) {
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
   return xpr
}

export async function buildLDXDocument(builder: Builder, node: AST.LDXDocument, owner: Element, typing: JSONSchema): Promise<LDXDocumentExpr> {
   const { items } = node
   const xpr = owner.New(LDXDocumentExpr)
   const chunks: string[] = []
   for (const item of items) {
      if (item instanceof Object) {
         const key = createLDXKey()
         const value = await builder.NewFrom(xpr, item)
         xpr.embeds[key] = value
         chunks.push(`\x00${key}\x01`)
      }
      else {
         chunks.push(item)
      }
   }
   xpr.markdown = chunks.join("\n")
   return xpr
}

export async function createDocumentModel(id: string, ast: AST.LDXLayer | string) {
   if (typeof ast === "string") {
      ast = deserialize_jsx_document(ast)
   }
   const model = new DocumentModel(id)
   const builder = new Builder(model)
   await builder.build(ast)
   return model
}
