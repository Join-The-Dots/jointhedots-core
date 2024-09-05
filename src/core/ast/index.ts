import { MapLike } from "core/common"
import { JSONSchema } from "core/types/json-schema"

export interface ASTNode {
   type: string
   [prop: string]: any
}

export interface ASTExpression extends ASTNode {
   schema?: JSONSchema
}

export interface ASTFlow extends ASTNode {
   type: "flow" | "dataflow" | "inline"
   flow?: MapLike<ASTExpression>
   layout?: ASTExpression
}

export interface ASTProgram extends ASTFlow {
   revision?: number
}
