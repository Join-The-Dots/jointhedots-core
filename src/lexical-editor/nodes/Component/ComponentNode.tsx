import { emitJSXElementFromData, JSXElementData } from 'core/ast/evaluate'
import { emitASTFromValue } from 'core/ast/producer'
import { stringify_node_jsx } from 'core/ast/serde/markdown'
import { InvokeView } from 'core/components/invokation'
import type { EditorConfig, LexicalEditor, NodeKey, SerializedLexicalNode, Spread } from 'lexical'
import { DecoratorNode, DOMExportOutput } from 'lexical'

export type SerializedComponentNode = Spread<{
    type: "component"
    descriptor?: JSXElementData
}, SerializedLexicalNode>


export class ComponentNode extends DecoratorNode<JSX.Element> {
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

    static importJSON(n: SerializedComponentNode): ComponentNode {
        return new ComponentNode(n.descriptor)
    }

    exportJSON(): SerializedComponentNode {
        return {
            type: "component",
            descriptor: this.descriptor,
            version: 1,
        }
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const element = document.createElement(this.isInline() ? 'span' : 'div')
        return element
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement(this.isInline() ? 'span' : 'div')
        return { element }
    }

    updateDOM(prevNode: ComponentNode): boolean {
        return this.descriptor !== prevNode.descriptor
    }

    decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
        console.log(editor, config)
        return <InvokeView descriptor={{
            name: this.descriptor.tag,
            params: this.descriptor.props,
        }} fallback={<>Error:{JSON.stringify(this.descriptor)}</>} />
    }

    generateJSX(): string {
        const { tag, props } = this.descriptor
        const ast = emitJSXElementFromData(this.descriptor)
        
        console.log(`${tag}:`, stringify_node_jsx(ast))
        return stringify_node_jsx(ast)
    }
}

function RenderComponent(props: { descriptor: JSXElementData }) {
    const { tag } = props.descriptor
    return <div>
        {JSON.stringify(tag)}
    </div>
}
