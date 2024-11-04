import * as AST from "../ast/nodes"
import { IContext } from "./context"
import { getSymbolFromNode } from '../ast/evaluate'
import { deserialize_jsx_document } from "../ast/serde/markdown"
import { IGenerator } from "./generator"
import {
   ArrayAppendElement, ArrayExpr, ArraySpreadElement, AssignmentExpr,
   BinaryExpr, CallExpr, ConditionalExpr, DeleteMemberExpr, DocumentLayer, DocumentModel,
   Expr, ExprClass, FunctionExpr, IdentifierExpr, LDXDocumentExpr,
   LDXElementExpr, LogicalExpr, MemberExpr, ObjectAssignProperty,
   ObjectExpr, ObjectSpreadProperty, ThisExpr, UnaryExpr, UpdateExpr
} from "./exprs"

let model_ids = 0

export function createDocumentID(): string {
   return "memory:doc#" + (model_ids++)
}

export class Builder {
   constructor(public model: DocumentModel) {
   }
   New<T extends Expr>(Cls: ExprClass<T>, owner: Expr): T {
      const key = createLDXKey()
      const xpr = new Cls(this.model, key, owner)
      this.model.nodes.set(key, xpr)
      return xpr
   }
}

function buildArrayFromElements(elements: Array<AST.Expression | AST.SpreadElement | null>, owner: Expr) {
   const xpr = owner.New(ArrayExpr)
   for (const item of elements) {
      if (item.type === "SpreadElement") {
         const xitem = new ArraySpreadElement()
         xitem.value = xpr.NewFrom(item)
         xpr.elements.push(xitem)
      }
      else {
         const xitem = new ArrayAppendElement()
         xitem.value = xpr.NewFrom(item)
         xpr.elements.push(xitem)
      }
   }
   return xpr
}

export function buildExpression(node: AST.Any, owner: Expr): Expr {
   switch (node.type) {
      case 'Literal': {
         const xpr = owner.NewConst(node.value)
         return xpr
      }
      case 'Identifier': {
         const xpr = owner.New(IdentifierExpr)
         xpr.name = node.name
         return xpr
      }
      case 'BinaryExpression': {
         const { left, right, operator } = node as AST.BinaryExpression
         const xpr = owner.New(BinaryExpr)
         xpr.operator = operator
         xpr.left = xpr.NewFrom(left)
         xpr.right = xpr.NewFrom(right)
         return xpr
      }
      case 'LogicalExpression': {
         const { left, right, operator } = node as AST.LogicalExpression
         const xpr = owner.New(LogicalExpr)
         xpr.operator = operator
         xpr.left = xpr.NewFrom(left)
         xpr.right = xpr.NewFrom(right)
         return xpr
      }
      case 'UnaryExpression': {
         const { argument, operator, prefix } = node as AST.UnaryExpression
         if (operator === 'delete' && argument.type === 'MemberExpression') {
            const { object, property, computed } = argument as AST.MemberExpression
            const xpr = owner.New(DeleteMemberExpr)
            xpr.object = xpr.NewFrom(object)
            xpr.property = computed ? xpr.NewFrom(property) : owner.NewConst((property as AST.Identifier).name)
            return xpr
         } else {
            const xpr = owner.New(UnaryExpr)
            xpr.operator = operator
            xpr.argument = xpr.NewFrom(argument)
            return xpr
         }
      }
      case 'UpdateExpression': {
         const { argument, operator, prefix } = node as AST.UpdateExpression
         const xpr = owner.New(UpdateExpr)
         xpr.operator = operator
         xpr.argument = xpr.NewFrom(argument)
         return xpr
      }
      case 'AssignmentExpression': {
         const { left, right, operator } = node as AST.AssignmentExpression
         const xpr = owner.New(AssignmentExpr)
         xpr.operator = operator
         xpr.left = xpr.NewFrom(left)
         xpr.right = xpr.NewFrom(right)
         return xpr
      }
      case 'MemberExpression': {
         const { object, property, computed } = node as AST.MemberExpression
         const xpr = owner.New(MemberExpr)
         xpr.object = xpr.NewFrom(object)
         xpr.property = computed ? xpr.NewFrom(property) : xpr.NewConst((property as AST.Identifier).name)
         return xpr
      }
      case 'ConditionalExpression': {
         const { test, consequent, alternate } = node as AST.ConditionalExpression
         const xpr = owner.New(ConditionalExpr)
         xpr.test = xpr.NewFrom(test)
         xpr.consequent = xpr.NewFrom(consequent)
         xpr.alternate = xpr.NewFrom(alternate)
         return xpr
      }
      case 'ThisExpression': {
         const xpr = owner.New(ThisExpr)
         return xpr
      }
      case 'CallExpression': {
         const { callee, arguments: args } = node as AST.CallExpression
         const xpr = owner.New(CallExpr)
         xpr.callee = xpr.NewFrom(callee)
         xpr.arguments = buildArrayFromElements(args, xpr)
         return xpr
      }
      case 'ArrayExpression': {
         const { elements } = node as AST.ArrayExpression
         const xpr = buildArrayFromElements(elements, owner)
         return xpr
      }
      case 'ObjectExpression': {
         const { properties } = node as AST.ObjectExpression
         const xpr = owner.New(ObjectExpr)
         for (const prop of properties) {
            if (prop.type === "Property") {
               const { key, value } = prop
               const xprop = new ObjectAssignProperty()
               xprop.key = xpr.NewFrom(key)
               xprop.value = xpr.NewFrom(value)
               xpr.properties.push(xprop)
            }
            else {
               const { argument } = prop
               const xprop = new ObjectSpreadProperty()
               xprop.value = xpr.NewFrom(argument)
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
         return buildExpression(node.expression, owner)
      }
      case 'JSXElement': {
         return buildLDXElement(node, owner)
      }
      case 'LDXDocument': {
         return buildLDXDocument(node, owner)
      }

      default:
         throw new Error(`Unsupported node type: ${node.type}`)
   }
}

let ldx_keys = 0

export function createLDXKey(): string {
   return (ldx_keys++).toString()
}

export function buildLDXElement(node: AST.JSXElement, owner: Expr): LDXElementExpr {
   const { name, attributes } = node.openingElement
   const xpr = owner.New(LDXElementExpr)
   xpr.tag = getSymbolFromNode(name)
   xpr.props = xpr.New(ObjectExpr)
   xpr.dock = xpr.New(ObjectExpr)
   //xpr.children = null
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
            const xprop = new ObjectAssignProperty()
            xprop.key = target.NewConst(key)
            xprop.value = target.NewFrom(attr.value)
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

export function buildLDXDocument(node: AST.LDXDocument, owner: Expr): LDXDocumentExpr {
   const { items } = node
   const xpr = owner.New(LDXDocumentExpr)
   const chunks: string[] = []
   for (const item of items) {
      if (item instanceof Object) {
         const key = createLDXKey()
         const value = xpr.NewFrom(item)
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

   const layer = new DocumentLayer(model, createLDXKey(), null)
   layer.layout = layer.NewFrom(ast.layout)

   model.base = layer
   return model
}
