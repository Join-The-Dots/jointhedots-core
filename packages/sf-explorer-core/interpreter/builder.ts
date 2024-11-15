import * as AST from "../ast/nodes"
import { IContext } from "./context"
import { getSymbolFromNode } from '../ast/evaluate'
import { deserialize_jsx_document } from "../ast/serde/markdown"
import { IGenerator } from "./generator"
import {
   ArrayAppendElement, ArrayExpr, ArraySpreadElement, AssignmentExpr,
   BinaryExpr, CallExpr, ConditionalExpr, DeleteMemberExpr, DocumentLayer, DocumentModel,
   Expr, ExprClass, FunctionExpr, IdentifierExpr, LDXDocumentExpr,
   LDXElementExpr, LogicalExpr, MemberExpr,
   ObjectDynamicProperty,
   ObjectExpr, ObjectNamedProperty, ObjectSpreadProperty, ThisExpr, UnaryExpr, UpdateExpr
} from "./exprs"
import { ComponentsRegistry } from "../library/components"
import { JSONSchema } from "../ast/schema/schema"
import { CommonTypes } from "../ast/schema/helpers"

let model_ids = 0

export function createDocumentID(): string {
   return "memory:doc#" + (model_ids++)
}

export class Builder {
   constructor(public model: DocumentModel) {
   }
   New<T extends Expr>(Cls: ExprClass<T>, owner: Expr, typing: JSONSchema): T {
      const key = createLDXKey()
      const xpr = new Cls(this.model, key, owner, typing)
      this.model.nodes.set(key, xpr)
      return xpr
   }
}

async function buildArrayFromElements(elements: Array<AST.Expression | AST.SpreadElement | null>, owner: Expr, typing: JSONSchema) {
   const xpr = owner.New(ArrayExpr)
   for (const item of elements) {
      if (item.type === "SpreadElement") {
         const xitem = new ArraySpreadElement()
         xitem.value = await xpr.NewFrom(item, typing)
         xpr.elements.push(xitem)
      }
      else {
         const xitem = new ArrayAppendElement()
         xitem.value = await xpr.NewFrom(item, typing)
         xpr.elements.push(xitem)
      }
   }
   return xpr
}

export async function buildExpression(node: AST.Any, owner: Expr, typing: JSONSchema): Promise<Expr> {
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
         xpr.left = await xpr.NewFrom(left)
         xpr.right = await xpr.NewFrom(right)
         return xpr
      }
      case 'LogicalExpression': {
         const { left, right, operator } = node as AST.LogicalExpression
         const xpr = owner.New(LogicalExpr, typing)
         xpr.operator = operator
         xpr.left = await xpr.NewFrom(left)
         xpr.right = await xpr.NewFrom(right)
         return xpr
      }
      case 'UnaryExpression': {
         const { argument, operator, prefix } = node as AST.UnaryExpression
         if (operator === 'delete' && argument.type === 'MemberExpression') {
            const { object, property, computed } = argument as AST.MemberExpression
            const xpr = owner.New(DeleteMemberExpr, typing)
            xpr.object = await xpr.NewFrom(object)
            xpr.property = computed ? await xpr.NewFrom(property) : owner.NewConst((property as AST.Identifier).name)
            return xpr
         } else {
            const xpr = owner.New(UnaryExpr, typing)
            xpr.operator = operator
            xpr.argument = await xpr.NewFrom(argument)
            return xpr
         }
      }
      case 'UpdateExpression': {
         const { argument, operator, prefix } = node as AST.UpdateExpression
         const xpr = owner.New(UpdateExpr, typing)
         xpr.operator = operator
         xpr.argument = await xpr.NewFrom(argument)
         return xpr
      }
      case 'AssignmentExpression': {
         const { left, right, operator } = node as AST.AssignmentExpression
         const xpr = owner.New(AssignmentExpr, typing)
         xpr.operator = operator
         xpr.left = await xpr.NewFrom(left)
         xpr.right = await xpr.NewFrom(right)
         return xpr
      }
      case 'MemberExpression': {
         const { object, property, computed } = node as AST.MemberExpression
         const xpr = owner.New(MemberExpr, typing)
         xpr.object = await xpr.NewFrom(object)
         xpr.property = computed ? await xpr.NewFrom(property) : xpr.NewConst((property as AST.Identifier).name)
         return xpr
      }
      case 'ConditionalExpression': {
         const { test, consequent, alternate } = node as AST.ConditionalExpression
         const xpr = owner.New(ConditionalExpr, typing)
         xpr.test = await xpr.NewFrom(test)
         xpr.consequent = await xpr.NewFrom(consequent)
         xpr.alternate = await xpr.NewFrom(alternate)
         return xpr
      }
      case 'ThisExpression': {
         const xpr = owner.New(ThisExpr, typing)
         return xpr
      }
      case 'CallExpression': {
         const { callee, arguments: args } = node as AST.CallExpression
         const xpr = owner.New(CallExpr, typing)
         xpr.callee = await xpr.NewFrom(callee, CommonTypes.function)
         xpr.arguments = await buildArrayFromElements(args, xpr, CommonTypes.any)
         return xpr
      }
      case 'ArrayExpression': {
         const { elements } = node as AST.ArrayExpression
         const xpr = buildArrayFromElements(elements, owner, typing)
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
                  xprop.value = await xpr.NewFrom(value)
                  xpr.properties.push(xprop)
               }
               else {
                  const xprop = new ObjectDynamicProperty()
                  xprop.key = await xpr.NewFrom(key)
                  xprop.value = await xpr.NewFrom(value)
                  xpr.properties.push(xprop)
               }
            }
            else {
               const { argument } = prop
               const xprop = new ObjectSpreadProperty()
               xprop.value = await xpr.NewFrom(argument)
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
         return buildExpression(node.expression, owner, typing)
      }
      case 'JSXElement': {
         return buildLDXElement(node, owner, typing)
      }
      case 'LDXDocument': {
         return buildLDXDocument(node, owner, typing)
      }

      default:
         throw new Error(`Unsupported node type: ${node.type}`)
   }
}

let ldx_keys = 0

export function createLDXKey(): string {
   return (ldx_keys++).toString()
}

export async function buildLDXElement(node: AST.JSXElement, owner: Expr, typing: JSONSchema): Promise<LDXElementExpr> {
   const { name, attributes } = node.openingElement
   const component_id = getSymbolFromNode(name)
   const entry = ComponentsRegistry.acquireComponent(component_id)
   const manifest = await entry.fetch()

   const xpr = owner.New(LDXElementExpr, typing)
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
            xprop.value = await target.NewFrom(attr.value, xtyping)
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

export async function buildLDXDocument(node: AST.LDXDocument, owner: Expr, typing: JSONSchema): Promise<LDXDocumentExpr> {
   const { items } = node
   const xpr = owner.New(LDXDocumentExpr)
   const chunks: string[] = []
   for (const item of items) {
      if (item instanceof Object) {
         const key = createLDXKey()
         const value = await xpr.NewFrom(item)
         xpr.embeds.set(key, value)
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
   model.builder = new Builder(model)

   const layer = new DocumentLayer(model, createLDXKey(), null, CommonTypes.display)
   layer.layout = await layer.NewFrom(ast.layout)

   model.base = layer
   return model
}
