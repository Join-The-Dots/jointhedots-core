import * as Acorn from "acorn"
import type { MapLike } from "typescript"
export * from "acorn"

/******************************************************
// # Primitive
/******************************************************/

export type NodeKey = number

export interface Node extends Partial<Acorn.Node> {
   $id?: NodeKey  // Identifier (used to attach external metadata)
   $owner?: NodeKey,
   annotations?: CompositePrimitive[] // Define other perspectives on this primitive (ex: summary, explaination, ...)
}

export interface Primitive extends Node {
   type: string // Type of primitive
}

export interface Additional extends Node {
   type?: undefined
}

// ## Useful types

export type SourceLink = {
   start: number // Start byte position in source content
   end?: number // End byte position in source content
   fragment?: string // Name of the object part that is linked to source
   src?: number | string
}

export type SourceLocation = SourceLink | SourceLink[]

export type ExpressiveValue =
   | boolean
   | number
   | string
   | AnyPrimitive
   | AnyPrimitive[]

export type AnyPrimitive =
   | Partial<Acorn.AnyNode> & Primitive
   | CompositePrimitive
   | ProceduralPrimitive
   | ElementPrimitive
   | DocumentPrimitive
   | ElementAttribute
   | RefPrimitive

export type Any =
   | AnyPrimitive

interface RefPrimitive extends Additional {
   $ref: string | number
}

/******************************************************
// # Behavior/Procedural primitives
/******************************************************/

// ## Recall: Execute a recall query and inject the primitive as context
export interface RecallPrimitive extends Primitive {
   type: "Recall"
   intend: AnyPrimitive
}

// ## Sampling: Put primitives into model inputs, and provide primitives from the model output
export interface SamplingPrimitive extends Primitive {
   type: "Sampling"
   items: AnyPrimitive
}

// ## Command: Execute a behavior in real world
export interface CommandPrimitive extends Primitive {
   type: "Command"
   cmd: string
}

export type ProceduralPrimitive =
   | SamplingPrimitive
   | CommandPrimitive

/******************************************************
// # Semantic/Information primitives
/******************************************************/

export interface TextPrimitive extends Primitive {
   type: "Text"
   lang?: string
   text: string
}

export interface ImagePrimitive extends Primitive {
   type: "Image"
   name?: string
   pixels: Blob
}

export interface AudioPrimitive extends Primitive {
   type: "Audio"
   name?: string
   data: Blob
}

export interface VideoPrimitive extends Primitive {
   type: "Video"
   name?: string
   data: Blob
}

export enum BlockFormat {
   Paragraph = "paragraph",
   Tip = "tip",
   Quote = "quote",
   Code = "code",
   Section = "section",
   Figure = "figure",
   Association = "pair",// Association: associate a content to a label, ex: **{{label}}**: {{content}}
   Fragment = "fragment",
}

export enum BlockEmphasis {
   Important = "important",
   Information = "info",
   Warning = "warning",
   Danger = "danger",
}

export type BlockContent = AnyPrimitive[]

// ## Block: define a semanticly coherent group
export interface BlockPrimitive extends Primitive {
   type: "Block"
   format: BlockFormat
   lang?: string // Language utilisé: "json", "markdown", ...
   //emphasis?: BlockEmphasis*
   metadata?: string
   label?: BlockContent
   content: BlockContent
}

// ## List: define an enumeration
export interface ListPrimitive extends Primitive {
   type: "List"
   items: AnyPrimitive[]
}

// ## Table: define a table
export interface TablePrimitive extends Primitive {
   type: "Table"
   subjects: AnyPrimitive[]
   items: AnyPrimitive[][]
}

/******************************************************
// # Element: Generic procedural primitives
/******************************************************/

export interface ElementAttribute extends Additional {
   ns?: string
   name: string // null for spread attributes
   value: AnyPrimitive
}

export interface ElementPrimitive extends Primitive {
   type: "Element"
   tag: string
   attributes?: ElementAttribute[]
   content?: BlockContent
}

export interface DocumentPrimitive extends Primitive {
   type: "Document"
   metadata?: Record<string, any>
   content: AnyPrimitive[]
}

export type BasicPrimitive =
   | TextPrimitive
   | ImagePrimitive
   | AudioPrimitive
   | VideoPrimitive

export type CompositePrimitive =
   | BasicPrimitive
   | BlockPrimitive
   | ListPrimitive
   | TablePrimitive

