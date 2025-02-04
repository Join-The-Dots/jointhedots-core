import { ModelBuilder } from "./builder"
import { CommonTypes } from "@livedoc/core/ast/schema/helpers"
import { ExpressionTemplate, JSONSchemaTemplate } from "./templates"
import { MapLike } from "typescript"
import { GraphOrderingAlgorithm } from "@livedoc/core/common/GraphOrderingAlgorithm"
import { IContext, ModelContext as LayerContext } from "./execution"
import { trace } from "@livedoc/core/common/trace"
import { AST } from "../ast"
import { DisplayInfos } from "@livedoc/ui/instrumentation"
import { JSONSchema } from "../ast/schema/schema"
import { ComponentEntry } from "../library/components"
import { ObjectClass } from "../common/types"
import { deserialize_element_properties, ElementDeserializers, ElementInstanciers, ElementJSON, ElementSerializers, IDeserializerContext, serialize_element_properties, serializeElement } from "./serde"
import { DocumentChangeLog, DocumentChangeSet } from "./log"

export const InvalidValue = Symbol("$invalid")

export interface IElementGenerator {
   emitIdentifier(target: DXElement): AST.Any
   generate(from: DXElement, target: DXElement): AST.Any
}

export type ElementClass<T extends DXElement = DXElement> = new (layer: DocumentLayer) => T
export type ElementKey = string
export type ElementLocation = { modelId: string, key: ElementKey }

export const ElementTypenames = new Map<ObjectClass, string>()
export const ElementClasses = new Map<string, ObjectClass>()

const ElementMembers = new WeakMap<DXElement, DXElement[]>()
const ElementConsumers = new WeakMap<DXElement, DXPipe[]>()

const EmptyArray = Object.freeze([])

/******************************************************************************
/* 
/*  Element: basic construction part who consume and produce an outcome
/*    - when the element is directly owned by a document it is named operator
/* 
/******************************************************************************/
export abstract class DXElement<T = any> {
   static isMetaMember = false
   $key: ElementKey = null
   owner: DXElement = null
   name: string = null
   typing: JSONSchema = null
   order: number = -1

   constructor(readonly layer: DocumentLayer) {
   }
   get isMetaMember(): boolean {
      return this["constructor"]["isMetaMember"] === true
   }
   serialize(data: ElementJSON): ElementJSON {
      return serialize_element_properties(this, data)
   }
   deserialize(data: ElementJSON, context: IDeserializerContext): Promise<DXElement> {
      return deserialize_element_properties(this, data, this, context)
   }
   update(data: ElementJSON | DXElement) {
      const { model } = this.layer
      const cset = model.createChangeset()
      if (data instanceof DXElement) {
         data = serializeElement(data)
      }
      cset.updates[this.$key] = data
      return model.commit(cset)
   }
   toTitle() {
      return this.constructor.name
   }
   //abstract exportAST(gen: ASTGenerator): AST.Any
   exportAST(gen: IElementGenerator): AST.Any {
      return null
   }

   // Member API
   getMembers(): readonly DXElement[] {
      return ElementMembers.get(this) || EmptyArray
   }
   cleanMembers() {
      ElementMembers.delete(this)
   }
   addMember(member: DXElement) {
      let members = ElementMembers.get(this)
      if (!members) ElementMembers.set(this, members = [])
      members.push(member)
   }
   acquireDataMember(symbol: string, builder: ModelBuilder): DXElement {
      let member = this.findMember(symbol, false)
      if (!member) {
         member = new DXFieldOperator(symbol, this, builder)
         this.addMember(member)
      }
      return member
   }
   acquireMetaMember(name: string, builder: ModelBuilder): DXElement {
      return null
   }
   findMember(symbol: string, meta: boolean): DXElement {
      for (const x of this.getMembers()) {
         if (x.constructor["isMetaMember"] === meta && x.name === symbol) {
            return x
         }
      }
      return null
   }


   // Prepare internal states and invariants
   init(ctx: LayerContext) {
      /* To override */
   }
   // Forward propagate value of expression
   read(ctx: IContext): any {
      /* To override */
      return undefined
   }
   // Back propagate value on expression
   write(value: any, ctx: IContext) {
      /* To override */
   }
   // Execute & Update internal states required by eval
   execute(ctx: LayerContext) {
      /* To override */
   }
   apply(ctx: LayerContext) {
      ctx.scheduleOperator(this)
   }
   consolidate(builder: ModelBuilder) {
      /* To override */
   }
   *getUses(): Generator<DXElement> {
      /* To override */
   }
   getTyping(): JSONSchema {
      /* To override */
      return this.typing || CommonTypes.any
   }
   getTemplate(): ExpressionTemplate {
      /* To override */
      return new JSONSchemaTemplate(this.name, this, this.getTyping(), null)
   }
   getExposedLayer(): DocumentLayer {
      /* To override */
      return null
   }
   getDisplayInfos(): DisplayInfos {
      /* To override */
      return { title: `Expression[${this.constructor.name}]` }
   }
   getElement(): this {
      return this
   }
   getModel(): DocumentModel {
      return this.getLayer().model
   }
   getLayer(): DocumentLayer {
      return this.owner.getLayer()
   }
   getOperator(): DXElement {
      for (let cur = this as DXElement; cur; cur = cur.owner) {
         if (cur.owner instanceof DocumentLayer) {
            return cur
         }
      }
      throw new Error("Bad owner chain")
   }
   getSupport(): DXElement {
      if (this.owner instanceof DocumentLayer) {
         return null
      }
      else {
         return this.getOperator()
      }
   }
   getIdentifier(): string {
      if (this.name !== null) {
         const from = this.getSupport()
         if (from) return `${from.getIdentifier()}/${this.name}`
         return this.name
      }
      return null
   }
   discoverDependents(emitter: DXElement) {
      const { layer } = this
      if (this.order < 0) {
         for (const member of this.getMembers()) {
            member.discoverDependents(emitter)
         }
         for (const consumer of getElementConsumers(this)) {
            consumer.discoverDependents(emitter)
         }
      }
      else {
         let deps = layer.deps[this.order]
         if (!deps) {
            deps = layer.deps[this.order] = []
            for (const member of this.getMembers()) {
               member.discoverDependents(this)
            }
            for (const consumer of getElementConsumers(this)) {
               consumer.discoverDependents(this)
            }
         }
         if (emitter !== null && emitter.order < this.order) {
            const emitter_deps = layer.deps[emitter.order]
            if (emitter_deps.includes(this.order) === false) {
               emitter_deps.push(this.order)
               for (const dep of deps) {
                  if (emitter_deps.includes(dep) === false) {
                     emitter_deps.push(dep)
                  }
               }
            }
         }
      }
   }
   toString() {
      return `${this.constructor.name}[${this.getIdentifier()}]`
   }
}

export function isOperator(target: DXElement): boolean {
   return target && target.owner instanceof DocumentLayer
}

// Consumer API
export function getElementConsumers(target: DXElement): readonly DXPipe[] {
   return ElementConsumers.get(target) || EmptyArray
}

export function cleanElementConsumers(target: DXElement) {
   ElementConsumers.delete(target)
}

export function addElementConsumer(target: DXElement, consumer: DXPipe) {
   let consumers = ElementConsumers.get(target)
   if (!consumers) ElementConsumers.set(target, consumers = [])
   consumers.push(consumer)
}

// Metamodel API
export type ElementDecl = {
   name: string
}

export function DeclareElement(decl?: ElementDecl) {
   return function (constructor: ObjectClass<DXElement>, infos: any) {
      const $type = decl?.name || constructor.name
      console.log("DeclareElement", $type, infos)
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
         return new constructor(context.layer)
      })
   }
}

export function DeclareSerializable() {
   return function (constructor: ObjectClass, infos: any) {
      const $type = constructor.name
      console.log("DeclareSerializable", $type, infos)
      ElementTypenames.set(constructor, $type)
      ElementClasses.set($type, constructor)
      ElementSerializers.set($type, serialize_element_properties)
      ElementDeserializers.set($type, deserialize_element_properties)
      ElementInstanciers.set($type, (context: IDeserializerContext) => {
         return new constructor()
      })
   }
}

/******************************************************************************
/* 
/*  Pipe
/* 
/******************************************************************************/

export abstract class DXPipe<T = any> extends DXElement<T> {
   emitter: DXElement = null
   override exportAST(gen: IElementGenerator): AST.Any {
      return gen.emitIdentifier(this.emitter)
   }
}

export class DXInbound extends DXPipe {
   receiver: DXElement = null
   constructor(
      public domain: DocumentLayer,
      parent: DXElement,
   ) {
      super(parent.layer)
   }
   override getSupport(): DXElement {
      return this.receiver
   }
   override apply(ctx: LayerContext) {
      ctx.scheduleOperator(this.receiver)
   }
   override read(ctx: LayerContext): any {
      return this.emitter.read(ctx)
   }
   override discoverDependents(emitter: DXElement) {
      this.receiver.discoverDependents(emitter)
   }
}

export class DXOutbound extends DXPipe {
   override apply(ctx: LayerContext) {
      const result = this.emitter.read(ctx)
      ctx.frame.dispatch(result)
   }
   override read(ctx: LayerContext): any {
      return this.emitter.read(ctx)
   }
   override getSupport(): DXElement {
      return this.emitter.getSupport()
   }
}

/******************************************************************************
/* 
/*  Operator: Memo
/* 
/******************************************************************************/

export class DXMemo extends DXElement {
   value: DXElement = null
   index: number = 0
   override init(ctx: LayerContext) {
      ctx.states[this.index] = undefined
   }
   override read(ctx: LayerContext): any {
      return ctx.states[this.index]
   }
   override execute(ctx: LayerContext) {
      if (this.value !== null) {
         const result = this.value.read(ctx)
         ctx.setState(this, this.index, result)
      }
   }
   override consolidate(builder: ModelBuilder) {
      builder.consolidate(this.value, this.typing)
   }
   override exportAST(gen: IElementGenerator): AST.Any {
      return this.value.exportAST(gen)
   }
}


/******************************************************************************
/* 
/*  Operator: Field
/* 
/******************************************************************************/

export class DXFieldOperator extends DXElement {
   declare owner: DXElement
   state_index: number = 0
   constructor(
      name: string, parent: DXElement, builder: ModelBuilder
   ) {
      super(parent.layer)
      this.name = name
      this.owner = parent
      this.state_index = builder.allocateState(this)
   }
   override init(ctx: LayerContext) {
      ctx.states[this.state_index] = undefined
   }
   override read(ctx: LayerContext): any {
      return ctx.states[this.state_index]
   }
   override execute(ctx: LayerContext) {
      const owner = this.owner.read(ctx)
      const newValue = owner?.[this.name]
      ctx.setState(this, this.state_index, newValue)
   }
   override acquireMetaMember(name: string, builder: ModelBuilder): DXElement {
      switch (name) {
         case "change": return new DXChangeCallback(this, builder)
      }
      return null
   }
   override write(value: any, ctx: LayerContext) {
      const owner = this.owner
      let owner_value = owner.read(ctx)
      if (Array.isArray(owner_value)) {
         owner_value = owner_value.slice()
         owner_value[this.name] = value
      }
      else {
         owner_value = {
            ...owner_value,
            [this.name]: value,
         }
      }
      owner.write(owner_value, ctx)
   }
   override exportAST(gen: IElementGenerator): AST.Any {
      return gen.emitIdentifier(this)
   }
}

/******************************************************************************
/* 
/*  Member 'change': value changing callback
/* 
/******************************************************************************/

export type ChangeHandler<T = any> = (value: T) => void

export class DXChangeCallback<T = any> extends DXElement<ChangeHandler<T>> {
   static isMetaMember = true
   declare owner: DXElement<T>
   index: number = 0
   constructor(parent: DXElement<T>, builder: ModelBuilder) {
      super(parent.layer)
      this.name = "change"
      this.owner = parent
      this.index = builder.allocateState(this)
      this.layer.initiates.push(this)
   }
   override init(ctx: LayerContext) {
      ctx.states[this.index] = (value) => {
         this.owner.write(value, ctx)
      }
   }
   override read(ctx: LayerContext): ChangeHandler<T> {
      if (!ctx.states[this.index]) {
         this.init(ctx) // TODO: fix registration bug when update without constructor use
      }
      return ctx.states[this.index]
   }
   override exportAST(gen: IElementGenerator): AST.Any {
      throw new Error("TODO")
   }
}

/******************************************************************************
/* 
/*  Error
/* 
/******************************************************************************/

export class DXError extends DXElement {
   issue: Error = null
   override init(ctx: LayerContext) {
   }
   override read(ctx: LayerContext): any {
      return undefined
   }
   override execute(ctx: LayerContext) {
   }
   override exportAST(gen: IElementGenerator): AST.Any {
      throw new Error("TODO")
   }
}

/******************************************************************************
/* 
/*  Inner layer operator
/* 
/******************************************************************************/

export class DXSubLayerBridge extends DXInbound {
   constructor(
      domain: DocumentLayer,
      receiver: DXSubLayerOperator,
      public target: DXPipe,
   ) {
      super(domain, receiver)
   }
   override apply(ctx: LayerContext) {
      const { contexts_index: instances_index } = this.receiver as DXSubLayerOperator
      const contexts = ctx.states[instances_index]
      if (contexts) {
         for (const tctx of contexts) {
            this.target.apply(tctx)
         }
      }
   }
   override read(ctx: LayerContext): any {
      if (this.emitter) {
         return this.emitter.read(ctx.context)
      }
      else {
         console.error("Bad SubLayerBridge emitter")
      }
   }
   override consolidate(builder: ModelBuilder) {
      this.receiver = this.getOperator()
   }
   override discoverDependents(emitter: DXElement) {
      this.target.discoverDependents(emitter)
   }
}

export class DXSubLayerOperator extends DXElement implements ILayerSupport {
   static type = "[flow]"
   static icon = "fa:share-alt"
   sublayer: DocumentLayer = null
   contexts_index: number = -1
   bridges: DXInbound[] = null
   createBridge(layer: DocumentLayer, target: DXPipe): DXPipe {
      const bridge = new DXSubLayerBridge(layer.layer, this, target)
      if (!this.bridges) {
         this.bridges = []
         layer.hasBridges = true
      }
      this.bridges.push(bridge)
      return bridge
   }
   attachContext(attached: LayerContext, ctx: LayerContext): void {
      let contexts = ctx.states[this.contexts_index]
      if (!contexts) {
         contexts = []
         ctx.states[this.contexts_index] = contexts
      }
      contexts.push(attached)
   }
   dettachContext(dettached: LayerContext, ctx: LayerContext): void {
      let contexts = ctx.states[this.contexts_index]
      if (contexts) {
         const index = contexts.indexOf(dettached)
         const last = contexts.pop()
         if (index < contexts.length) contexts[index] = last
         console.assert(index >= 0)
      }
   }
   override getTyping(): JSONSchema {
      return this.sublayer.getTyping()
   }
   override getExposedLayer(): DocumentLayer {
      return this.sublayer
   }
   override getDisplayInfos(): DisplayInfos {
      return this.sublayer.getDisplayInfos()
   }
   override getIdentifier() {
      return super.getIdentifier()
   }
   override execute(ctx: LayerContext) {
      const instances = ctx.states[this.contexts_index]
      trace("flow", "execute flow update for bridges", instances)
   }
   override exportAST(gen: IElementGenerator): AST.Any {
      throw new Error("TODO")
   }
}

/******************************************************************************
/* 
/*  Flow
/* 
/******************************************************************************/

export const LayoutOperatorSymbol = "[layout]"

export type LayerNamespace = {
   [name: string]: DXElement
}

export interface ILayerSupport {
   createBridge(parent: DocumentLayer, target: DXPipe): DXPipe
   attachContext(attached: LayerContext, ctx: LayerContext): void
   dettachContext(dettached: LayerContext, ctx: LayerContext): void
}

export class DocumentLayer extends DXElement {
   initiates: DXElement[] = []
   schedules: DXElement[] = []
   states: number = 0
   hasBridges: boolean = false
   deps: number[][] = []

   // Layer model
   namespace: LayerNamespace = {}
   items: DXElement[] = []

   // Layer flow
   inputs: { [name: string]: DXElement } = {}
   operators: DXElement[] = []
   output: DXOutbound = null

   support: DXElement & ILayerSupport = null

   constructor(
      name: string,
      layer: DocumentLayer,
      readonly model: DocumentModel,
   ) {
      super(layer)
      this.name = name
   }
   override getTyping(): JSONSchema {
      const properties: MapLike<JSONSchema> = {}
      for (const name in this.inputs) {
         properties[name] = this.inputs[name].getTyping() || CommonTypes.any
      }
      return {
         type: "view",
         properties,
      }
   }
   override getLayer(): DocumentLayer {
      return this
   }
   override getDisplayInfos(): DisplayInfos {
      return {
         title: this.layer ? `View '${this.name}'` : "View",
         icon: "code:symbol/view"
      }
   }
   override getIdentifier() {
      return this.layer ? `${this.layer.getIdentifier()}/${this.name}` : this.name
   }
   override consolidate(builder: ModelBuilder) {
      consolidateModel(this, builder)
   }
   override exportAST(gen: IElementGenerator): AST.Any {
      throw new Error("TODO")
   }
   getRootModel() {
      return this.layer ? this.layer.getRootModel() : this
   }
}

export class DocumentModel {
   static models = new Map<string, DocumentModel>()
   layers: DocumentLayer[] = []
   main: DocumentLayer = null
   nodes = new Map<string, DXElement>()
   log: DocumentChangeLog = null
   builder: ModelBuilder = null
   edited: boolean = false
   version: number = 0
   listeners = new Set<() => void>

   constructor(
      readonly component: ComponentEntry,
   ) {
      DocumentModel.models.set(component.id, this)
   }
   get id() {
      return this.component.id
   }
   get title() {
      return this.component.title
   }
   getLayerById(identifier: string) {
      let result = this.main
      if (identifier && identifier.length > 0) {
         const parts = identifier.split("/")
         for (const name of parts) {
            if (name) {
               const found = result.namespace[name]
               if (!found) return null
               result = found.getExposedLayer()
               if (!result) return null
            }
         }
      }
      return result
   }
   createChangeset(): DocumentChangeSet {
      return {
         updates: {},
      }
   }
   async commit(changeset: DocumentChangeSet) {

      const builder = new ModelBuilder(this)
      await builder.update(changeset)

      for (const listener of this.listeners) {
         listener()
      }
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
      //DocumentModel.models.delete(this.id)
   }
}

function appendScheduledOperator(from: DXElement, schedules: DXElement[]) {
   from.order = schedules.length
   schedules.push(from)
   appendScheduledMembers(from, schedules)
}

function appendScheduledMembers(from: DXElement, schedules: DXElement[]) {
   for (const member of from.getMembers()) {
      if (isOperator(member)) {
         appendScheduledOperator(member, schedules)
      }
      else {
         appendScheduledMembers(member, schedules)
      }
   }
}

export function consolidateModel(layer: DocumentLayer, builder: ModelBuilder) {

   function visit_member(node: DXElement, visitor: (target: DXElement<any>) => void) {
      for (const member of node.getMembers()) {
         visit_member(member, visitor)
      }
      for (const consumer of getElementConsumers(node)) {
         visitor(consumer.getSupport())
      }
   }

   const algo = new GraphOrderingAlgorithm<DXElement>(visit_member)
   for (const op of layer.operators) {
      algo.addNode(op)
   }
   algo.process()

   for (const comp of algo.components.reverse()) {
      for (let node = comp.connecteds; node; node = node.connected) {
         appendScheduledOperator(node.data, layer.schedules)
      }
   }

   for (const node of layer.operators) {
      node.discoverDependents(null)
   }

   for (const name in layer.namespace) {
      const oper = layer.namespace[name]
      oper.consolidate(builder)
   }
}

export function createDocumentID(): string {
   const id = createDocumentID["model_ids"] = (createDocumentID["model_ids"] || 0) + 1
   return "memory:doc#" + id
}
