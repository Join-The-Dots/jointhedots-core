import * as AST from "@livedoc/core/ast/nodes"
import { MapLike } from "../common"
import { IContext, LocalContext } from "./context"
import { EditorState } from 'lexical'
import { getSymbolFromNode } from '@livedoc/core/ast/evaluate'
import { deserialize_jsx_document } from "../ast/serde/markdown"
import { emitASTFromValue } from "../ast/producer"

export abstract class Expr {
   constructor(readonly model: DocumentModel, public owner: Expr) { }
   abstract exportAST(): AST.Any
   abstract read(ctx: IContext): any
   write(value: any, ctx: IContext): any {
      throw new Error(`Cannot be write`)
   }
   New<T extends Expr>(Cls: new (model: DocumentModel, owner: Expr, key?: string) => T): T {
      return this.model.builder.New(Cls, this)
   }
   NewFrom(node: AST.Any): Expr {
      return buildExpression(node, this)
   }
   NewConst(value: any): Expr {
      const xpr = this.New(LiteralExpr)
      xpr.value = value
      return xpr
   }
}

export class LiteralExpr extends Expr {
   value: any
   override read(): any {
      return this.value
   }
   override exportAST() {
      return emitASTFromValue(this.value)
   }
}

export class ThisExpr extends Expr {
   override read(ctx: IContext): any {
      return ctx.getThis()
   }
   override exportAST() {
      return {
         type: "ThisExpression",
      } as AST.ThisExpression
   }
}

export class IdentifierExpr extends Expr {
   name: string
   override read(ctx: IContext): any {
      return ctx.getValue(this.name)
   }
   write(value: any, ctx: IContext): any {
      return ctx.setValue(this.name, value)
   }
   override exportAST() {
      return {
         type: "Identifier",
         name: this.name,
      } as AST.Identifier
   }
}

export class MemberExpr extends Expr {
   object: Expr
   property: Expr
   override read(ctx: IContext): any {
      const base = this.object.read(ctx)
      const key = this.property.read(ctx)
      return base[key]
   }
   write(value: any, ctx: IContext): any {
      const base = this.object.read(ctx)
      const key = this.property.read(ctx)
      return base[key] = value
   }
   override exportAST() {
      return {
         type: "MemberExpression",
         object: this.object.exportAST(),
         property: this.property.exportAST(),
      } as AST.MemberExpression
   }
}

export class BinaryExpr extends Expr {
   left: Expr
   right: Expr
   operator: AST.BinaryOperator
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
   override exportAST() {
      return {
         type: "BinaryExpression",
         left: this.left.exportAST(),
         right: this.right.exportAST(),
      } as AST.BinaryExpression
   }
}

export class ConditionalExpr extends Expr {
   test: Expr
   consequent: Expr
   alternate: Expr
   override read(ctx: IContext): any {
      const { test, consequent, alternate } = this
      return test.read(ctx) ? consequent.read(ctx) : alternate.read(ctx)
   }
   override exportAST() {
      return {
         type: "ConditionalExpression",
         test: this.test.exportAST(),
         consequent: this.consequent.exportAST(),
         alternate: this.alternate.exportAST(),
      } as AST.ConditionalExpression
   }
}

export class LogicalExpr extends Expr {
   left: Expr
   right: Expr
   operator: AST.LogicalOperator
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
   override exportAST() {
      return {
         type: "LogicalExpression",
         left: this.left.exportAST(),
         right: this.right.exportAST(),
         operator: this.operator,
      } as AST.LogicalExpression
   }
}

export class UnaryExpr extends Expr {
   argument: Expr
   operator: AST.UnaryOperator
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
   override exportAST() {
      return {
         type: "UnaryExpression",
         argument: this.argument.exportAST(),
         operator: this.operator,
      } as AST.UnaryExpression
   }
}

export class DeleteMemberExpr extends Expr {
   object: Expr
   property: Expr
   override read(ctx: IContext): any {
      const object = this.object.read(ctx)
      const property = this.property.read(ctx)
      return delete object[property]
   }
   override exportAST() {
      return {
         type: "UnaryExpression",
         operator: "delete",
         argument: {
            type: "MemberExpression",
            object: this.object.exportAST(),
            property: this.property.exportAST(),
         } as AST.MemberExpression,
      } as AST.UnaryExpression
   }
}

export class ArrayAppendElement {
   value: Expr
   assign(object: any[], ctx: IContext) {
      const value = this.value.read(ctx)
      object.push(value)
   }
   exportAST() {
      return this.value.exportAST()
   }
}

export class ArraySpreadElement {
   value: Expr
   assign(object: any[], ctx: IContext) {
      const value = this.value.read(ctx)
      object.push(...value)
   }
   exportAST() {
      return {
         type: "SpreadElement",
         argument: this.value.exportAST(),
      } as AST.SpreadElement
   }
}

export class ArrayExpr extends Expr {
   elements: (ArrayAppendElement | ArraySpreadElement)[] = []
   override read(ctx: IContext): any {
      const object: any[] = []
      for (const element of this.elements) {
         element.assign(object, ctx)
      }
      return object
   }
   override exportAST() {
      return {
         type: "ArrayExpression",
         elements: this.elements.map(x => x.exportAST()),
      } as AST.ArrayExpression
   }
}

export class ObjectAssignProperty {
   key: Expr
   value: Expr
   assign(object: MapLike<any>, ctx: IContext) {
      const key = this.key.read(ctx)
      const value = this.value.read(ctx)
      object[key] = value
   }
   exportAST() {
      return {
         type: "Property",
         key: this.key.exportAST(),
         value: this.value.exportAST(),
      } as AST.Property
   }
}

export class ObjectSpreadProperty {
   value: Expr
   assign(object: MapLike<any>, ctx: IContext) {
      const value = this.value.read(ctx)
      Object.assign(object, value)
   }
   exportAST() {
      return {
         type: "SpreadElement",
         argument: this.value.exportAST(),
      } as AST.SpreadElement
   }
}

export class ObjectExpr extends Expr {
   properties: (ObjectAssignProperty | ObjectSpreadProperty)[] = []
   override read(ctx: IContext): any {
      const object: MapLike<any> = {}
      for (const prop of this.properties) {
         prop.assign(object, ctx)
      }
      return object
   }
   override exportAST() {
      return {
         type: "ObjectExpression",
         properties: this.properties.map(x => x.exportAST()),
      } as AST.ObjectExpression
   }
}

export class CallExpr extends Expr {
   callee: Expr
   arguments: ArrayExpr
   override read(ctx: IContext): any {
      const callee = this.callee.read(ctx)
      const args = this.arguments.read(ctx)
      return callee.apply(ctx.getThis(), args)
   }
   override exportAST() {
      return {
         type: "CallExpression",
         callee: this.callee.exportAST(),
         arguments: this.arguments.exportAST().elements,
      } as AST.CallExpression
   }
}

export class Script {
   execute(ctx: IContext) {
   }
}

export class FunctionExpr extends Expr {
   thisRelay: boolean = false
   expression: boolean = false
   generator: boolean = false
   async: boolean = false

   params: AST.Pattern[] = null
   body: Script = null
   override read(ctx: IContext): any {
      const xpr = this
      return function (...args: any[]) {
         const scope = new LocalContext(ctx, xpr.thisRelay ? ctx.getThis() : this)
         scope.setArguments(args, xpr.params)
         xpr.body.execute(scope)
         return scope.getValue("$result")
      }
   }
   override exportAST() {
      return null
   }
}

export class UpdateExpr extends Expr {
   argument: Expr
   operator: AST.UpdateOperator
   prefix: boolean
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
   override exportAST() {
      return {
         type: "UpdateExpression",
         argument: this.argument.exportAST(),
         operator: this.operator,
         prefix: this.prefix,
      } as AST.UpdateExpression
   }
}

export class AssignmentExpr extends Expr {
   left: Expr
   right: Expr
   operator: AST.AssignmentOperator
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
   override exportAST() {
      return {
         type: "AssignmentExpression",
         left: this.left.exportAST(),
         right: this.right.exportAST(),
         operator: this.operator,
      } as AST.AssignmentExpression
   }
}

export class Builder {
   constructor(public model: DocumentModel) {
   }
   New<T extends Expr>(Cls: new (model: DocumentModel, owner: Expr, key?: string) => T, owner: Expr): T {
      const xpr = new Cls(this.model, owner)
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

export class LDXElementExpr extends Expr {
   tag: string
   props: ObjectExpr
   dock: ObjectExpr
   override read(ctx: IContext): any {
   }
   override exportAST() {
      const attributes: AST.JSXAttribute[] = []
      for (const ns in this) {
         const attrs = this[ns]
         if (attrs instanceof ObjectExpr) {
            for (const prop of attrs.properties) {
               const key = ((prop as ObjectAssignProperty).key as IdentifierExpr).name
               const value = prop.value
               attributes.push({
                  type: "JSXAttribute",
                  name: (ns === "props") ? {
                     type: "JSXIdentifier",
                     name: key,
                  } : {
                     type: "JSXNamespacedName",
                     namespace: {
                        type: "JSXIdentifier",
                        name: ns,
                     },
                     name: {
                        type: "JSXIdentifier",
                        name: key,
                     }
                  },
                  value: {
                     type: "JSXExpressionContainer",
                     expression: value.exportAST(),
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

export class LDXDocumentExpr extends Expr {
   embeds = new Map<string, Expr>()
   markdown: string
   state: EditorState
   override read(ctx: IContext): any {
      return <LDXDocumentEditor model={this} />
   }
   override exportAST() {
      const result = this.markdown.split(/\x00([0-9]+)\x01/)
      return {
         type: "LDXDocument",
         items: result,
      } as AST.LDXDocument
   }
}

function LDXDocumentEditor(props: { model: LDXDocumentExpr }) {
   return <></>
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
            xprop.key = xpr.NewConst(key)
            xprop.value = xpr.NewFrom(attr.value)
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

export class DocumentLayer extends Expr {
   layout: Expr
   override read(ctx: IContext): any {
      return this.layout.read(ctx)
   }
   override exportAST() {
      return {
         type: "LDXLayer",
         layout: this.layout.exportAST(),
      } as AST.LDXLayer
   }
}

export class DocumentModel {
   static models = new Map<string, DocumentModel>()
   base: DocumentLayer
   builder?: Builder

   constructor(readonly id: string) {
      DocumentModel.models.set(id, this)
   }
   dispose() {
      DocumentModel.models.delete(this.id)
   }
}

let model_ids = 0

export function createDocumentID(): string {
   return "memory:doc#" + (model_ids++)
}

export async function createDocumentModel(id: string, ast: AST.LDXLayer | string) {
   if (typeof ast === "string") {
      ast = deserialize_jsx_document(ast)
   }
   const model = new DocumentModel(id)
   model.builder = new Builder(model)

   const layer = new DocumentLayer(model, null)
   layer.layout = layer.NewFrom(ast.layout)

   model.base = layer
   return model
}
