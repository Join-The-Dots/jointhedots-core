import { emitJSXElementFromData, JSXElementData } from '@livedoc/core/ast/evaluate'
import { stringify_node_jsx } from '@livedoc/core/ast/serde/markdown'
import { InvokeView } from '@livedoc/core/library/invokation'
import { DisplayInfos, ElementBoundingBox, ElementController, InstrumentationLayout } from '@livedoc/core/ui/Instrumentation'
import { InstrumentationZone } from '@livedoc/core/ui/Instrumentation/InstrumentationZone'
import type { EditorConfig, LexicalEditor, NodeKey } from 'lexical'
import { DecoratorNode } from 'lexical'

export class ComponentNode extends DecoratorNode<JSX.Element> implements ElementController {
    descriptor: JSXElementData

    static getType(): string {
        return 'component'
    }

    static clone(node: ComponentNode): ComponentNode {
        return new ComponentNode(node.descriptor, node.__key)
    }

    constructor(descriptor: JSXElementData, key?: NodeKey) {
        super(key)
        this.descriptor = descriptor
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const element = document.createElement(this.isInline() ? 'span' : 'div')
        return element
    }

    updateDOM(prevNode: ComponentNode): boolean {
        return this.descriptor !== prevNode.descriptor
    }

    decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
        console.log(editor, config)
        return <InstrumentationZone controller={this}>
            <InvokeView descriptor={{
                name: this.descriptor.tag,
                params: this.descriptor.props,
            }} />
        </InstrumentationZone>
    }

    generateJSX(): string {
        const ast = emitJSXElementFromData(this.descriptor)
        return stringify_node_jsx(ast)
    }

    get layout() {
        return InstrumentationLayout.Inlaid
    }
    get stretch() {
        return ElementBoundingBox.Outer
    }
    getDisplayInfos(): DisplayInfos {
        return {
            title: this.descriptor.tag,
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

