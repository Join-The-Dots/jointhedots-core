import { EmptyContext } from '@livedoc/core/interpreter/context'
import { DocumentModel, LDXElementExpr, SubTreeGenerator } from '@livedoc/core/interpreter/exprs'
import { InvokeView } from '@livedoc/core/library/invokation'
import { DisplayInfos, ElementBoundingBox, ElementController, InstrumentationLayout } from '@livedoc/core/ui/Instrumentation'
import { InstrumentationZone } from '@livedoc/core/ui/Instrumentation/InstrumentationZone'
import type { EditorConfig, LexicalEditor, NodeKey, SerializedLexicalNode, Spread } from 'lexical'
import { $getEditor, DecoratorNode } from 'lexical'
import * as AST from "@livedoc/core/ast/nodes"
import { useEffect, useState } from 'react'

export type SerializedComponentNode = Spread<
    {
        document: string
        descriptor: AST.Any
    },
    SerializedLexicalNode
>

export class ComponentNode extends DecoratorNode<JSX.Element> implements ElementController {
    __element: LDXElementExpr

    static getType(): string {
        return 'component'
    }

    static clone(node: ComponentNode): ComponentNode {
        return new ComponentNode(node.__element, node.__key)
    }

    constructor(descriptor: LDXElementExpr, key?: NodeKey) {
        super(key)
        this.__element = descriptor
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const element = document.createElement(this.isInline() ? 'span' : 'div')
        element.draggable = $getEditor().isEditable()
        return element
    }

    updateDOM(prevNode: ComponentNode): boolean {
        return this.__element !== prevNode.__element
    }

    exportJSON(): SerializedComponentNode {
        return {
            type: 'component',
            version: 1,
            document: this.__element.model.id,
            descriptor: this.exportAST(),
        }
    }

    static importJSON(serializedNode: SerializedComponentNode): ComponentNode {
        const { document, descriptor } = serializedNode
        const model = DocumentModel.models.get(document)
        const embed = model.base.layout.NewFrom(descriptor)
        if (embed instanceof LDXElementExpr) {
            const node = new ComponentNode(embed)
            return node
        }
        return null
    }

    decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
        return <ComponentDock node={this} />
    }

    exportAST() {
        const ctx = new SubTreeGenerator()
        return ctx.generateXpr(null, this.__element)
    }

    get layout() {
        return InstrumentationLayout.Inlaid
    }
    get stretch() {
        return ElementBoundingBox.Outer
    }
    getDisplayInfos(): DisplayInfos {
        return {
            title: this.__element.tag,
            icon: "bi:puzzle",
        }
    }
    getElement() {
        return this.__element
    }
    getLocation() {
        return null
    }
}

function ComponentDock(props: { node: ComponentNode }) {
    const { node } = props
    const params = node.__element.props.read(EmptyContext)
    const [, updateState] = useState<never>()

    useEffect(() => {
        return node.__element.model.listen(() => {
            updateState(null)
        })
    }, [node])

    return <InstrumentationZone controller={node}>
        <InvokeView descriptor={{
            name: node.__element.tag,
            params,
        }} />
    </InstrumentationZone>
}
