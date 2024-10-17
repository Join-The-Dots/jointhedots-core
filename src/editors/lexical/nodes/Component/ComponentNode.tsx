import { emitJSXElementFromData, JSXElementData } from '@livedoc/core/ast/evaluate'
import { stringify_node_jsx } from '@livedoc/core/ast/serde/markdown'
import { InvokeView } from '@livedoc/core/library/invokation'
import { DisplayInfos, ElementBoundingBox, ElementController, InstrumentationLayout } from '@livedoc/core/ui/Instrumentation'
import { InstrumentationZone } from '@livedoc/core/ui/Instrumentation/InstrumentationZone'
import type { EditorConfig, LexicalEditor, NodeKey, SerializedEditor, SerializedLexicalNode, Spread } from 'lexical'
import { $getEditor, DecoratorNode } from 'lexical'

export type SerializedComponentNode = Spread<
    {
        descriptor: JSXElementData
    },
    SerializedLexicalNode
>

export class ComponentNode extends DecoratorNode<JSX.Element> implements ElementController {
    __descriptor: JSXElementData

    static getType(): string {
        return 'component'
    }

    static clone(node: ComponentNode): ComponentNode {
        return new ComponentNode(node.__descriptor, node.__key)
    }

    constructor(descriptor: JSXElementData, key?: NodeKey) {
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
            descriptor: this.__descriptor,
        }
    }

    static importJSON(serializedNode: SerializedComponentNode): ComponentNode {
        const { descriptor } = serializedNode
        const node = new ComponentNode(descriptor)
        return node
    }

    decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
        console.log(editor, config)
        return <InstrumentationZone controller={this}>
            <InvokeView descriptor={{
                name: this.__descriptor.tag,
                params: this.__descriptor.props,
            }} />
        </InstrumentationZone>
    }

    exportAST() {
        return emitJSXElementFromData(this.__descriptor)
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

