import React from "react"
import { AST } from "../ast"
import { MapLike } from "../common/types"
import { IContext, LocalContext, ModelContext } from "./execution"
import { emitASTFromValue } from "../ast/producer"
import { ModelBuilder } from "./builder"
import { CommonTypes } from "../ast/schema/helpers"
import { ComponentEntry, ComponentResource, ComponentsRegistry } from "../library/components"
import { deserializeValue, ElementJSON, IDeserializerContext } from "./serde"
import { addElementConsumer, DeclareElement, DeclareSerializable, DocumentLayer, DXElement, DXInbound, DXSubLayerOperator, IElementGenerator, InvalidValue } from "./model"
import { JSONSchema } from "../ast/schema/schema"
import { DisplayInfos, InstrumentationBoundingBox, InstrumentationController, InstrumentationLayout } from "@livedoc/ui/instrumentation"
import { getLayerView } from "./display/view"
import { InstrumentationZone } from "@livedoc/ui/instrumentation/InstrumentationZone"
import { print } from "../common/console"

@DeclareElement()
export class DXLiteral extends DXElement {
   value: any
   override read(): any {
      return this.value
   }
   override exportAST(gen: IElementGenerator) {
      return emitASTFromValue(this.value)
   }
}

@DeclareElement()
export class DXThis extends DXElement {
   override read(ctx: IContext): any {
      return ctx.getThis()
   }
   override exportAST(gen: IElementGenerator) {
      return {
         type: "ThisExpression",
      } as AST.ThisExpression
   }
}

@DeclareElement()
export class DXIdentifier extends DXElement {
   override read(ctx: IContext): any {
      return ctx.getValue(this.name)
   }
   override write(value: any, ctx: IContext): any {
      return ctx.setValue(this.name, value)
   }
   override exportAST(gen: IElementGenerator) {
      return {
         type: "Identifier",
         name: this.name,
      } as AST.Identifier
   }
}

@DeclareElement()
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
   override exportAST(gen: IElementGenerator) {
      return {
         type: "MemberExpression",
         object: gen.generate(this, this.object),
         property: gen.generate(this, this.property),
      } as AST.MemberExpression
   }
}

@DeclareElement()
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
   override exportAST(gen: IElementGenerator) {
      return {
         type: "BinaryExpression",
         left: gen.generate(this, this.left),
         right: gen.generate(this, this.right),
      } as AST.BinaryExpression
   }
}

@DeclareElement()
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
   override exportAST(gen: IElementGenerator) {
      return {
         type: "ConditionalExpression",
         test: gen.generate(this, this.test),
         consequent: gen.generate(this, this.consequent),
         alternate: gen.generate(this, this.alternate),
      } as AST.ConditionalExpression
   }
}

@DeclareElement()
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
   override exportAST(gen: IElementGenerator) {
      return {
         type: "LogicalExpression",
         left: gen.generate(this, this.left),
         right: gen.generate(this, this.right),
         operator: this.operator,
      } as AST.LogicalExpression
   }
}

@DeclareElement()
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
   override exportAST(gen: IElementGenerator) {
      return {
         type: "UnaryExpression",
         argument: gen.generate(this, this.argument),
         operator: this.operator,
      } as AST.UnaryExpression
   }
}

@DeclareElement()
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
   override exportAST(gen: IElementGenerator) {
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

@DeclareSerializable()
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
   exportAST(gen: IElementGenerator, from: DXElement) {
      return gen.generate(from, this.value)
   }
}

@DeclareSerializable()
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
   exportAST(gen: IElementGenerator, from: DXElement) {
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
   override exportAST(gen: IElementGenerator) {
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
   abstract exportAST(gen: IElementGenerator, from: DXElement)
   consolidate(builder: ModelBuilder) {
      this.value = builder.consolidate(this.value, CommonTypes.any)
      return this
   }
}

@DeclareSerializable()
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
   exportAST(gen: IElementGenerator, from: DXElement) {
      return {
         type: "Property",
         kind: "init",
         key: gen.generate(from, this.key),
         value: gen.generate(from, this.value),
      } as AST.Property
   }
}

@DeclareSerializable()
export class ObjectNamedProperty extends ObjectProperty<DXLiteral> {
   get name(): string {
      return this.key.value
   }
   assign(object: MapLike<any>, ctx: IContext) {
      const value = this.value.read(ctx)
      object[this.key.value] = value
   }
   exportAST(gen: IElementGenerator, from: DXElement) {
      return {
         type: "Property",
         kind: "init",
         key: gen.generate(from, this.key),
         value: gen.generate(from, this.value),
      } as AST.Property
   }
}

@DeclareSerializable()
export class ObjectSpreadProperty extends ObjectProperty<never> {
   assign(object: MapLike<any>, ctx: IContext) {
      const value = this.value.read(ctx)
      Object.assign(object, value)
   }
   exportAST(gen: IElementGenerator, from: DXElement) {
      return {
         type: "SpreadElement",
         argument: gen.generate(from, this.value),
      } as AST.SpreadElement
   }
}

@DeclareElement()
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
   override exportAST(gen: IElementGenerator) {
      return {
         type: "ObjectExpression",
         properties: this.properties.map(x => x.exportAST(gen, this)),
      } as AST.ObjectExpression
   }
}

@DeclareElement()
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
   override exportAST(gen: IElementGenerator) {
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

@DeclareElement()
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
   override exportAST(gen: IElementGenerator) {
      return null
   }
}

@DeclareElement()
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
   override exportAST(gen: IElementGenerator) {
      return {
         type: "UpdateExpression",
         argument: gen.generate(this, this.argument),
         operator: this.operator,
         prefix: this.prefix,
      } as AST.UpdateExpression
   }
}

@DeclareElement()
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
   override exportAST(gen: IElementGenerator) {
      return {
         type: "AssignmentExpression",
         left: gen.generate(this, this.left),
         right: gen.generate(this, this.right),
         operator: this.operator,
      } as AST.AssignmentExpression
   }
}

export class DXProperty extends DXElement {
   static type = "property"
   static icon = "code:symbol/property"
   initValue: any = undefined
   state_index: number = 0
   override init(ctx: ModelContext) {
      ctx.states[this.state_index] = ctx.props[this.name]
   }
   override read(ctx: ModelContext): any {
      return ctx.states[this.state_index]
   }
   override execute(ctx: ModelContext) {
      ctx.setState(this, this.state_index, ctx.props[this.name])
   }
   override consolidate(builder: ModelBuilder) {

   }
   override getTyping(): JSONSchema {
      return this.typing
   }
}

export class DXState extends DXElement {
   static type = "state"
   static icon = "code:symbol/state"
   initValue: any = undefined
   input: DXElement = null
   state_index: number = 0
   override init(ctx: ModelContext) {
      ctx.states[this.state_index] = this.initValue
   }
   override read(ctx: ModelContext): any {
      return ctx.states[this.state_index]
   }
   override execute(ctx: ModelContext) {
      if (this.input !== null) {
         try {
            const result = this.input.read(ctx)
            ctx.setState(this, this.state_index, result)
         }
         catch (e) {
            print.error(e)
         }
      }
   }
   override consolidate(builder: ModelBuilder) {
      this.input = builder.consolidate(this.input, CommonTypes.any)
   }
}

export class DXImport extends DXElement<any> {
   data: any = InvalidValue
   imported: ComponentResource = null

   override read(ctx: ModelContext): any {
      return this.data
   }
   override consolidate(builder: ModelBuilder) {
      this.typing = this.imported.descriptor
      this.data = this.imported.get()
   }
   override getDisplayInfos(): DisplayInfos {
      const { title, manifest } = this.imported.component
      return {
         title: title || manifest?.title,
         icon: "code:symbol/element",
      }
   }
   get_data<T extends any = any>(): T {
      if (this.data === InvalidValue) {
         return this.imported.get()
      }
      return this.data
   }
   get_schema(): JSONSchema {
      return this.imported.descriptor
   }
}

export class DXPlaceholder extends DXElement<React.ReactNode> implements InstrumentationController {
   get layout(): InstrumentationLayout {
      return InstrumentationLayout.Placeholder
   }
   get stretch(): InstrumentationBoundingBox {
      return InstrumentationBoundingBox.Outer
   }
   override read(ctx: ModelContext): React.ReactNode {
      return React.createElement(InstrumentationZone, { controller: this })
   }
   override getDisplayInfos(): DisplayInfos {
      return {
         title: "Placeholder",
         icon: "code:symbol/element"
      }
   }
}

export class DXInlineView extends DXInbound {
   static type = "inline"
   static icon = "fa:photo"
   inlined: DXSubLayerOperator = null
   component_index: number = 0
   override init(ctx: ModelContext): any {
      ctx.states[this.component_index] = getLayerView(this.inlined.sublayer, ctx)
   }
   override read(ctx: ModelContext): any {
      const component = ctx.states[this.component_index]
      if (!component) {
         throw new Error()
      }
      return component
   }
   override consolidate(builder: ModelBuilder) {
      this.receiver = this.getOperator()
      this.emitter = this.inlined
      addElementConsumer(this.emitter, this)
      this.inlined = builder.consolidate(this.inlined, this.typing)
   }
   getTyping() {
      return this.inlined.getTyping()
   }
   override getExposedLayer(): DocumentLayer {
      return this.inlined.sublayer
   }
   override getDisplayInfos(): DisplayInfos {
      return this.inlined.getDisplayInfos()
   }
}


export enum DisplayType {
   React,
   WebComponent,
}

@DeclareElement()
export class DXContent extends DXElement {
   format: string
   content: DXElement[] = []

   override consolidate(builder: ModelBuilder) {
   }
   override exportAST(gen: IElementGenerator) {
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

@DeclareElement()
export class DXDisplay extends DXElement {
   tag: string
   type: DisplayType
   entry: ComponentEntry
   component: React.ComponentType | HTMLElement
   props: DXObject
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
   async loadComponent(tag: string) {
      const entry = ComponentsRegistry.acquireComponent(tag)
      const manifest = await entry.fetch()
      this.tag = tag
      this.entry = entry
      if (manifest.attachments["view.react"]) {
         this.type = DisplayType.React
         this.component = await entry.fetchResource("view.react")
      }
      else if (manifest.attachments["view.web"]) {
         this.type = DisplayType.WebComponent
         this.component = await entry.fetchResource("view.web")
      }
   }
   override exportAST(gen: IElementGenerator) {
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

@DeclareElement()
export class DXDocumentLayout extends DXElement {
   embeds: MapLike<DXElement> = {}
   paragraphs: DXElement[]
   markdown: string
   override consolidate(builder: ModelBuilder) {
      for (const key in this.embeds) {
         this.embeds[key] = builder.consolidate(this.embeds[key], CommonTypes.display)
      }
   }
   override read(ctx: IContext): any {
      return <DXDocumentEditor model={this} />
   }
   override exportAST(gen: IElementGenerator) {
      const result = this.markdown.split(/\x00([0-9]+)\x01/)
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
