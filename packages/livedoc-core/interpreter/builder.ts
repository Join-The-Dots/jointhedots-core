import { DXElement, DocumentLayer, DXInbound, DXOutbound, DXPipe, ILayerSupport, DocumentModel, LayoutOperatorSymbol, addElementConsumer, ElementClass, LayerNamespace, DXError, ElementClasses } from "./model"
import { JSONSchema } from "@livedoc/core/ast/schema/schema"
import { ModelContext, ModelContextRegistry } from "./execution"
import { AST, Interpreter } from "@livedoc/core"
import { JSONDocument } from "../ast/schema/document"
import { ComponentResource, ComponentsRegistry } from "../library/components"
import { ElementDeserializers, ElementInstanciers, IDeserializerContext } from ".."
import { CommonTypes } from "../ast/schema/helpers"
import { ArrayAppendElement, ArraySpreadElement, DXArray, DXAssignment, DXBinary, DXCall, DXConditional, DXContent, DXDeleteMember, DXDisplay, DXDocumentLayout, DXFunction, DXIdentifier, DXLiteral, DXLogical, DXMember, DXObject, DXThis, DXUnary, DXUpdate, ObjectDynamicProperty, ObjectNamedProperty, ObjectSpreadProperty } from "./elements"
import { trace } from "../common/trace"
import { DocumentChangeLog, DocumentChangeSet } from "./log"

let ldx_keys = 0

class ModelDeserializer implements IDeserializerContext {
   layer: DocumentLayer = null
   constructor(
      readonly builder: ModelBuilder,
   ) {
   }
   get model(): DocumentModel {
      return this.layer.model
   }
   New<T extends DXElement>(Cls: ElementClass<T>, owner: DXElement, typing: JSONSchema): T {
      return this.builder.New(Cls, owner, typing)
   }
   resolveReference($ref: string): DXElement {
      return this.builder.resolveReference(this.layer, splitReferencePath($ref))
   }
   revise(target: DXElement) {
      return this.builder.revise(target)
   }
   use(layer: DocumentLayer): this {
      this.layer = layer
      return this
   }
}

function splitReferencePath($ref: string): string[] {
   return ($ref || "").split(/(\/|:)/g)
}

export class ModelBuilder {
   document: JSONDocument = null
   unconsolidatedElements = new Set<DXElement>()
   migrations = new Map<DocumentLayer, LayerMigrations>()
   retrieveds: DXElement[] = null

   references = new Map<DXInbound, string[]>()

   imports = new Map<string, ComponentResource>()

   pending_contexts: ModelContext[] = null

   constructor(
      readonly model: DocumentModel,
   ) {
   }

   New<T extends DXElement>(Cls: ElementClass<T>, owner: DXElement, typing: JSONSchema = CommonTypes.any): T {
      const xpr = new Cls(owner.layer)
      xpr.$key = this.createLDXKey()
      xpr.typing = typing
      this.model.nodes.set(xpr.$key, xpr)
      this.revise(xpr)
      return xpr
   }
   NewConst(value: any, owner: DXElement, typing: JSONSchema = CommonTypes.any): DXLiteral {
      const node = this.New(DXLiteral, owner, typing)
      node.value = value
      return node
   }
   NewError(issue: string | Error, owner: DXElement, typing: JSONSchema = CommonTypes.any): DXError {
      const error = this.New(DXError, owner, typing)
      error.issue = this.error(issue instanceof Error ? issue : new Error(issue))
      return error
   }

   NewFrom(owner: DXElement, node: AST.Any, typing: JSONSchema = CommonTypes.any): Promise<DXElement> {
      return buildExpression(this, node, owner, typing)
   }
   revise(target: DXElement) {
      this.unconsolidatedElements.add(target)
   }
   consolidate<T extends DXElement>(target: T, typing: JSONSchema) {
      target.consolidate(this)
      return target
   }
   createLDXKey(): string {
      return (ldx_keys++).toString()
   }
   allocateState(user: DXElement): number {
      return user.layer.states++
   }
   notifyNewContext(context: ModelContext) {
      if (!this.pending_contexts) this.pending_contexts = []
      this.pending_contexts.push(context)
   }
   appendOperator(op: DXElement) {
      const { name } = op
      op.layer.operators.push(op)
      if (name) {
         if (op.layer.namespace[name] !== undefined) {
            this.error(new Error(`Operator name '${name}' already used`))
         }
         else {
            op.layer.namespace[name] = op
         }
      }
   }
   retrieveOperator<T extends DXElement>(name: string, ctor: new (layer: DocumentLayer) => T): T {
      return null
   }

   requireSchema(schema: JSONSchema): JSONSchema {
      return this.document.useSchema(schema)
   }

   resolveIndirectImport(ref: string, identifier: string): ComponentResource {
      let imp = this.imports.get(ref)
      if (!imp) {
         imp = ComponentsRegistry.acquireComponent(ref).acquireResource(identifier)
         this.imports.set(ref, imp)
      }
      return imp
   }

   resolveSimulableImport(ref: string, identifier: string): ComponentResource {
      let imp = this.imports.get(ref)
      if (!imp) {
         imp = ComponentsRegistry.acquireComponent(ref).acquireResource(identifier)
         if (Interpreter.simulation === false) {
            this.imports.set(ref, imp)
         }
      }
      return imp
   }

   private createRecursiveInbound(domainName: string, path: string[], parent: DXElement, layer: DocumentLayer): DXPipe {
      if (layer.name === domainName) {
         const ref = new DXInbound(layer, parent)
         this.references.set(ref, path)
         return ref
      }
      else if (layer.support) {
         const from = this.createRecursiveInbound(domainName, path, parent, layer.layer)
         if (from) {
            return layer.support.createBridge(layer, from)
         }
      }
      return null
   }
   createReference($ref: string, parent: DXElement): DXPipe {
      const { layer } = parent
      const path = splitReferencePath($ref)
      if (!parent) console.error("Cannot create Reference without receiver")

      // Create reference based on the reference domain
      let ref = this.createRecursiveInbound(path[0], path, parent, layer)
      if (!ref) {
         ref = new DXInbound(layer, parent)
         ref.emitter = this.NewError(`Invalid namespace name in reference: ${$ref}`, ref)
      }
      return ref
   }
   resolveMember(owner: DXElement, name: string, meta: boolean) {
      let found = owner.findMember(name, meta)
      if (!found) {
         if (meta) found = owner.acquireMetaMember(name, this)
         else found = owner.acquireDataMember(name, this)
      }
      return found
   }
   resolveReference(domain: DocumentLayer, path: string[]): DXElement {
      if (path.length >= 3 && path[1] === "/") {

         // Get root element of path
         const baseName = path[2]
         let value: DXElement = domain && domain.namespace[baseName]

         // Find value from namespace
         if (path.length > 3) {
            for (let i = 3; value && i < path.length; i += 2) {
               if (path[i] === ":") {
                  value = this.resolveMember(value, path[i + 1], true)
               }
               else {
                  value = this.resolveMember(value, path[i + 1], false)
               }
            }
         }

         // Stub with error operator when not found
         if (!value) {
            value = this.NewError(`Cannot resolve reference: ${path.join("")}`, domain)
         }
         return value
      }
      else {
         return this.NewError(`Invalid reference: ${path.join("")}`, domain)
      }
   }
   createLayer() {

   }
   error(err: Error): Error {
      console.warn(err)
      return err
   }
   complete(): DocumentModel {

      for (const [ref, path] of this.references) {
         ref.receiver = ref.getOperator()
         ref.emitter = this.resolveReference(ref.domain, path)
         addElementConsumer(ref.emitter, ref)
      }

      for (const layer of this.model.layers) {
         layer.consolidate(this)
         // TODO: improve to avoid multiple consolidate on sub layers
      }

      this.model.builder = null
      if (this.pending_contexts) {
         for (const ctx of this.pending_contexts) {
            ctx.initiate()
         }
         this.pending_contexts = null
      }
      return this.model
   }
   async update(changeset: DocumentChangeSet) {
      const { model } = this
      const { log } = model
      model.builder = this

      const deserial = new ModelDeserializer(this)
      for (const key in changeset.updates) {
         const data = changeset.updates[key]
         const prev = model.nodes.get(key)
         if (prev.constructor !== ElementClasses.get(data.$type)) {
            const instancier = ElementInstanciers.get(data.$type)
            if (!instancier) throw new Error(`Unknow $type '${data.$type}' constructor`)
            const element = instancier(deserial.use(prev.owner.layer)) as DXElement
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
         await deserializer(element, data, element.owner, deserial.use(element.owner.layer))
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

      const layer = new DocumentLayer("", null, model)
      layer.$key = this.createLDXKey()
      layer.typing = CommonTypes.display
      for (const item of ast.items) {
         const node = await this.NewFrom(layer, item)
         layer.items.push(node)
      }

      model.main = layer
      model.log = new DocumentChangeLog(model)
      model.builder = null
   }
}

type MigratedInstance = {
   context: ModelContext
   next_states: any[]
   prev_states: any[]
}

class LayerMigrations {
   changes = new Set<DXElement>()
   prev_schedules = new Set<DXElement>()
   prev_initiates = new Set<DXElement>()
   prev_namespace = null as LayerNamespace
   constructor(
      readonly layer: DocumentLayer,
      readonly migrateds: MigratedInstance[],
   ) {
      this.prev_namespace = layer.namespace
      for (const op of this.layer.schedules) {
         this.prev_schedules.add(op)
      }
      for (const xpr of this.layer.initiates) {
         this.prev_initiates.add(xpr)
      }
   }
   resume(updater: ModelBuilder) {
      const { layer, changes, prev_initiates, prev_schedules, migrateds } = this
      trace("!build", `Migrate '${layer.getIdentifier()}' of '${layer.model.title}'`)

      // Collect changed operators
      const changed_operators = new Set<DXElement>()
      for (const xpr of changes) {
         changed_operators.add(xpr.getOperator())
      }
      for (const op of layer.schedules) {
         if (prev_schedules.has(op) === false) {
            changed_operators.add(op)
         }
      }

      // Migrate context states
      for (const migrated of migrateds) {
         const { context } = migrated
         if (context.ops_statuses.length < layer.schedules.length) {
            context.ops_statuses.fill(0, context.ops_statuses.length, layer.schedules.length)
         }
         if (context.states.length < layer.states) {
            context.states.fill(undefined, context.states.length, layer.states)
         }
         for (const xpr of layer.initiates) {
            if (prev_initiates.has(xpr) === false) {
               xpr.init(context)
               trace("build", `  > init '${xpr}'`)
            }
         }
         for (const op of changed_operators) {
            context.scheduleOperator(op)
            trace("build", `  > refresh '${op}'`)
         }
         context.execute()
      }
   }
}

function suspendModelInstances(model: DocumentModel) {
   const migrateds = new Map<DocumentLayer, LayerMigrations>()

   for (const context of ModelContextRegistry.values()) {
      if (context.layer.model === model) {
         const { states } = context
         let plan = migrateds.get(context.layer)
         if (!plan) {
            plan = new LayerMigrations(context.layer, [])
            migrateds.set(context.layer, plan)
         }
         plan.migrateds.push({
            context: context,
            next_states: null,
            prev_states: states,
         })
      }
   }

   return migrateds
}

export async function buildExpression(builder: ModelBuilder, node: AST.Any, owner: DXElement, typing: JSONSchema): Promise<DXElement> {
   switch (node.type) {
      case 'Literal': {
         const xpr = builder.NewConst(node.value, owner, typing)
         return xpr
      }
      case 'Identifier': {
         const xpr = builder.New(DXIdentifier, owner, typing)
         xpr.name = node.name
         return xpr
      }
      case 'BinaryExpression': {
         const { left, right, operator } = node as AST.BinaryExpression
         const xpr = builder.New(DXBinary, owner, typing)
         xpr.operator = operator
         xpr.left = await builder.NewFrom(xpr, left)
         xpr.right = await builder.NewFrom(xpr, right)
         return xpr
      }
      case 'LogicalExpression': {
         const { left, right, operator } = node as AST.LogicalExpression
         const xpr = builder.New(DXLogical, owner, typing)
         xpr.operator = operator
         xpr.left = await builder.NewFrom(xpr, left)
         xpr.right = await builder.NewFrom(xpr, right)
         return xpr
      }
      case 'UnaryExpression': {
         const { argument, operator, prefix } = node as AST.UnaryExpression
         if (operator === 'delete' && argument.type === 'MemberExpression') {
            const { object, property, computed } = argument as AST.MemberExpression
            const xpr = builder.New(DXDeleteMember, owner, typing)
            xpr.object = await builder.NewFrom(xpr, object)
            xpr.property = computed ? await builder.NewFrom(xpr, property) : builder.NewConst((property as AST.Identifier).name, owner)
            return xpr
         } else {
            const xpr = builder.New(DXUnary, owner, typing)
            xpr.operator = operator
            xpr.argument = await builder.NewFrom(xpr, argument)
            return xpr
         }
      }
      case 'UpdateExpression': {
         const { argument, operator, prefix } = node as AST.UpdateExpression
         const xpr = builder.New(DXUpdate, owner, typing)
         xpr.operator = operator
         xpr.argument = await builder.NewFrom(xpr, argument)
         return xpr
      }
      case 'AssignmentExpression': {
         const { left, right, operator } = node as AST.AssignmentExpression
         const xpr = builder.New(DXAssignment, owner, typing)
         xpr.operator = operator
         xpr.left = await builder.NewFrom(xpr, left)
         xpr.right = await builder.NewFrom(xpr, right)
         return xpr
      }
      case 'MemberExpression': {
         const { object, property, computed } = node as AST.MemberExpression
         const xpr = builder.New(DXMember, owner, typing)
         xpr.object = await builder.NewFrom(xpr, object)
         xpr.property = computed ? await builder.NewFrom(xpr, property) : builder.NewConst((property as AST.Identifier).name, xpr)
         return xpr
      }
      case 'ConditionalExpression': {
         const { test, consequent, alternate } = node as AST.ConditionalExpression
         const xpr = builder.New(DXConditional, owner, typing)
         xpr.test = await builder.NewFrom(xpr, test)
         xpr.consequent = await builder.NewFrom(xpr, consequent)
         xpr.alternate = await builder.NewFrom(xpr, alternate)
         return xpr
      }
      case 'ThisExpression': {
         const xpr = builder.New(DXThis, owner, typing)
         return xpr
      }
      case 'CallExpression': {
         const { callee, arguments: args } = node as AST.CallExpression
         const xpr = builder.New(DXCall, owner, typing)
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
         const xpr = builder.New(DXObject, owner, typing)
         for (const prop of properties) {
            if (prop.type === "Property") {
               const { key, value } = prop
               if (key.type === "Literal") {
                  const xprop = new ObjectNamedProperty()
                  xprop.key = builder.NewConst(key.value, xpr)
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
         const xpr = builder.New(DXFunction, owner)
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


async function buildArrayFromElements(builder: ModelBuilder, elements: Array<AST.Expression | AST.SpreadElement | null>, owner: DXElement, typing: JSONSchema) {
   const xpr = builder.New(DXArray, owner)
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

async function buildLDXElement(builder: ModelBuilder, node: AST.JSXElement, owner: DXElement, typing: JSONSchema): Promise<DXDisplay> {
   const { tag, attributes } = node
   const xpr = builder.New(DXDisplay, owner, typing)

   await xpr.loadComponent(tag)
   xpr.typing = typing
   xpr.props = builder.New(DXObject, xpr, xpr.entry.manifest["view"])
   xpr.dock = builder.New(DXObject, xpr)

   for (const attr of attributes) {
      if (attr.type === "JSXAttribute") {
         const ns = attr.ns || "props"
         const key = attr.name
         let target = xpr[ns]
         if (target instanceof DXObject) {
            const xprop = new ObjectNamedProperty()
            const xtyping = xpr.props?.properties?.[key] || CommonTypes.any
            xprop.key = builder.NewConst(key, target)
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
   if (xpr.name) {
      xpr.layer.namespace[xpr.name] = xpr
   }
   return xpr
}

async function buildLDXContent(builder: ModelBuilder, node: AST.JSXContent, owner: DXElement, typing: JSONSchema): Promise<DXElement> {
   const { content, format } = node
   const xpr = builder.New(DXContent, owner, typing)
   xpr.format = format
   for (const item of content) {
      if (typeof item === "string") {
         xpr.content.push(builder.NewConst(item, xpr, CommonTypes.string))
      }
      else {
         const value = await builder.NewFrom(xpr, item, CommonTypes.string)
         xpr.content.push(value)
      }
   }
   return xpr
}

async function buildLDXDocument(builder: ModelBuilder, node: AST.JSXDocument, owner: DXElement, typing: JSONSchema): Promise<DXDocumentLayout> {
   const { items } = node
   const xpr = builder.New(DXDocumentLayout, owner)
   const chunks: string[] = []
   for (const item of items) {
      if (item instanceof Object) {
         const key = builder.createLDXKey()
         xpr.paragraphs.push(await builder.NewFrom(xpr, item))
      }
      else {
         chunks.push(item)
      }
   }
   return xpr
}

async function buildLDXLayer(builder: ModelBuilder, name: string, desc: AST.JSXDocument, support: DXElement & ILayerSupport): Promise<DocumentLayer> {
   const { model } = builder
   const parent = this.layer

   const layer = new DocumentLayer(name || "", parent, model)
   layer.support = support
   model.layers.push(layer)

   // Build layer operators
   {
      // Create layer operators
      for (const item of desc.items) {
         await builder.NewFrom(layer, item)
      }

      // Create output pipe
      const layout = layer.namespace[LayoutOperatorSymbol]
      if (layout) {
         const output = new DXOutbound(layer)
         output.emitter = layout
         addElementConsumer(layout, output)
         layer.output = output
      }

   }
   return layer
}