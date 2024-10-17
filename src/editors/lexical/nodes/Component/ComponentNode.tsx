import { EmptyContext } from '@livedoc/core/interpreter/context'
import { DocumentModel, LDXElementExpr } from '@livedoc/core/interpreter/exprs'
import { InvokeView } from '@livedoc/core/library/invokation'
import { DisplayInfos, ElementBoundingBox, ElementController, InstrumentationLayout } from '@livedoc/core/ui/Instrumentation'
import { InstrumentationZone } from '@livedoc/core/ui/Instrumentation/InstrumentationZone'
import type { EditorConfig, LexicalEditor, NodeKey, SerializedLexicalNode, Spread } from 'lexical'
import { $getEditor, DecoratorNode } from 'lexical'
import * as AST from "@livedoc/core/ast/nodes"

export type SerializedComponentNode = Spread<
    {
        document: string
        descriptor: AST.Any
    },
    SerializedLexicalNode
>

export class ComponentNode extends DecoratorNode<JSX.Element> implements ElementController {
    __descriptor: LDXElementExpr

    static getType(): string {
        return 'component'
    }

    static clone(node: ComponentNode): ComponentNode {
        return new ComponentNode(node.__descriptor, node.__key)
    }

    constructor(descriptor: LDXElementExpr, key?: NodeKey) {
        super(key)
        this.__descriptor = descriptor
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const element = document.createElement(this.isInline() ? 'span' : 'div')
        element.draggable = $getEditor().isEditable()
        return element
    }

    updateDOM(prevNode: ComponentNode): boolean {
        return this.__descriptor !== prevNode.__descriptor
    }

    exportJSON(): SerializedComponentNode {
        return {
            type: 'component',
            version: 1,
            document: this.__descriptor.model.id,
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
        return <InstrumentationZone controller={this}>
            <InvokeView descriptor={{
                name: this.__descriptor.tag,
                params: this.__descriptor.props.read(EmptyContext),
            }} />
        </InstrumentationZone>
    }

    exportAST() {
        return this.__descriptor.exportAST()
    }

    get layout() {
        return InstrumentationLayout.Inlaid
    }
    get stretch() {
        return ElementBoundingBox.Outer
    }
    getDisplayInfos(): DisplayInfos {
        return {
            title: this.__descriptor.tag,
            icon: "bi:puzzle",
        }
    }
    getDescriptor() {
        return null
    }
    setDescriptor(descriptor) {
    }
    getLocation() {
        return null
    }
}

