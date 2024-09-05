import React from "react"
import Accordion from '@salesforce/design-system-react/components/accordion'
import AccordionPanel from '@salesforce/design-system-react/components/accordion/panel'
import '@salesforce-ux/design-system/assets/styles/salesforce-lightning-design-system.min.css'
import { MapLike } from "core/common"
import { Expression, FlowContext, IExpressionResource } from "core/components/interfaces"
import { ASTExpression } from "core/ast"
import { MermaidDisplay } from "./view"

export type Props = {
    code: string
}

export function MermaidGraph(props: Props) {
    const { code } = props
    return <div>
        <div>Mermaid</div>
        <div>{code}</div>
    </div>
}

interface ASTMermaid extends ASTExpression {
    code: string
}

class MermaidExpression extends Expression {
    constructor(public code: string) {
        super()
    }
    eval(ctx: FlowContext): any {
        /* To override */
        return <MermaidDisplay code={this.code} />
    }
}

export default {
    name: "std:mermaid",
    model: MermaidExpression,
    async create(desc: ASTMermaid): Promise<MermaidExpression> {
        return new MermaidExpression(desc.code)
    },
    async update(target: MermaidExpression, desc: ASTMermaid, prev_desc: ASTMermaid): Promise<MermaidExpression> {
        return new MermaidExpression(desc.code)
    },
} as IExpressionResource
