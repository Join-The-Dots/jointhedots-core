import { MapLike } from "@livedoc/core/common"
import * as Acorn from "acorn"
import * as AcornJsx from "./jsx/nodes"
export * from "acorn"
export * from "./jsx/nodes"

export interface LDXDocument extends Acorn.Node {
   type: "LDXDocument"
   items: (string | Any)[]
}

export interface LDXLayer extends Acorn.Node {
   type: "LDXLayer"
   flow?: MapLike<Any>
   layout?: LDXDocument
}

export interface LDXReference extends Acorn.Node {
   type: undefined
   $ref: string
}

export type LDXNode = LDXLayer | LDXDocument | LDXReference

export type Any = LDXNode | Acorn.AnyNode | AcornJsx.AnyJSX 
