import { MapLike } from "core/common"
import { JSONSchema } from "./schema"
import * as Acorn from "acorn"
import * as AcornJsx from "./jsx/nodes"
export * from "acorn"
export * from "./jsx/nodes"

export interface LiveRoutine extends Acorn.Node {
   type: "LiveRoutine"
   flow?: MapLike<Any>
   layout?: Any
}

export interface LiveProgram extends LiveRoutine {
   revision?: number
}

export interface LiveDocument extends Acorn.Node {
   type: "LiveDocument"
   items: (string | Any)[]
}

export type LiveNode = LiveProgram | LiveRoutine | LiveDocument

export type Any = LiveNode | Acorn.AnyNode | AcornJsx.AnyJSX 
