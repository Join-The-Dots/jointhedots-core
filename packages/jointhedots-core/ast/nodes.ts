import { MapLike } from "typescript"
import * as Acorn from "acorn"
export * from "acorn"

type Node = Partial<Acorn.Node>

export interface LDXReference extends Node {
   type: undefined
   $ref: string
}

export type LDXNode =
   LDXReference

export interface JSXAttribute extends Node {
   type: "JSXAttribute"
   ns: string
   name: string // null for spread attributes
   value: Any
}

export interface JSXElement extends Node {
   type: "JSXElement"
   tag: string
   attributes?: JSXAttribute[]
   content?: Any | Any[]
}

export interface JSXFragment extends Node {
   type: "JSXFragment"
   content: Any
}

export type JSXContentChunk = string | Any

export interface JSXContent extends Node {
   type: "JSXContent"
   format?: string // LaanguageID or MIME
   metadata?: string
   content: JSXContentChunk[]
}

export interface JSXDocument extends Node {
   type: "JSXDocument"
   format: string // LanguageID or MIME
   items: Any[]
}

export type JSXNode =
   JSXDocument |
   JSXElement |
   JSXContent |
   JSXAttribute

export type Any = LDXNode | JSXNode | Partial<Acorn.AnyNode>

