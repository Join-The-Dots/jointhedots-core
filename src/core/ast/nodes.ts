import { MapLike } from "core/common"
import { JSONSchema } from "./schema"
import * as Acorn from "acorn"
import * as AcornJsx from "./jsx/nodes"
export * from "acorn"
export * from "./jsx/nodes"

export interface LDXRoutine extends Acorn.Node {
   type: "LiveRoutine"
   flow?: MapLike<Any>
   layout?: Any
}

export interface LDXProgram extends LDXRoutine {
   revision?: number
}

export interface LDXDocument extends Acorn.Node {
   type: "LiveDocument"
   items: (string | Any)[]
}

export type LDXNode = LDXProgram | LDXRoutine | LDXDocument

export type Any = LDXNode | Acorn.AnyNode | AcornJsx.AnyJSX 
