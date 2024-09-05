import React from "react"
import { ASTExpression } from "core/ast"

export class Expression<T = any> {
   eval(ctx: FlowContext): any {
      /* To override */
      return undefined
   }
}

export class FlowContext {
}

export interface IEntityResource {
   readonly name: string
   visit?: (desc: ASTExpression) => Generator<ASTExpression>
}

export interface IExpressionResource extends IEntityResource {
   readonly model: new (...args) => Expression
   create(desc: ASTExpression): Promise<Expression>
   update(target: Expression, desc: ASTExpression, prev_desc: ASTExpression): Promise<Expression>
   match?(target: Expression): boolean
   evaluate?(desc: ASTExpression): any
}

export interface IViewResource extends IEntityResource {
   readonly component: React.ComponentType
}
