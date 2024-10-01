import { MapLike } from "core/common"
import { JSONSchema } from "./schema"

export type ASTLocation = {
   moduleId: string
   revision: number
   path: string
}

export interface ASTNode {
   type: string
   [prop: string]: any
}

export interface ASTExpression extends ASTNode {
   schema?: JSONSchema
}

export interface ASTRoutine extends ASTNode {
   type: "flow" | "dataflow" | "inline"
   flow?: MapLike<ASTExpression>
   layout?: ASTExpression
}

export interface ASTProgram extends ASTRoutine {
   revision?: number
}
