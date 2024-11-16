import { EmptyContext, AST, InvokeView, LDXDocumentExpr, createLDXKey, ASTGenerator, ElementJSON } from '@sf-explorer/core'
import { DocumentModel, LDXDisplayExpr } from '@sf-explorer/core'
import { DisplayInfos, ElementBoundingBox, ElementController, InstrumentationLayout } from '@sf-explorer/core/ui/Instrumentation'
import { InstrumentationZone } from '@sf-explorer/core/ui/Instrumentation'
import type { EditorConfig, LexicalEditor, NodeKey, SerializedLexicalNode, Spread } from 'lexical'
import { $getEditor, DecoratorNode } from 'lexical'
import React, { createRef } from 'react'

export type SerializedComponentNode = Spread<
    {
        document: string
        descriptor: ElementJSON
    },
    SerializedLexicalNode
>

export class ComponentNode extends DecoratorNode<JSX.Element> implements ElementController {
    __dock = createRef<ComponentDock>()

    static getType(): string {
        return 'component'
    }

    static clone(node: ComponentNode): ComponentNode {
        return new ComponentNode(node.__layout, node.__embed, node.__key)
    }

    constructor(
        public __layout: LDXDocumentExpr,
        public __embed: string,
        key?: NodeKey
    ) {
        super(key)
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const element = document.createElement(this.isInline() ? 'span' : 'div')
        element.draggable = $getEditor().isEditable()
        return element
    }

    updateDOM(prevNode: ComponentNode): boolean {
        return this.__layout !== prevNode.__layout || this.__embed !== prevNode.__embed
    }

    exportJSON(): SerializedComponentNode {
        const element = this.getElement()
        if (element) {
            return {
                type: 'component',
                version: 1,
                document: this.__layout.model.id,
                descriptor: element.serialize(),
            }
        }
        return null
    }

    static importJSON(serializedNode: SerializedComponentNode): ComponentNode {
        const { document, descriptor } = serializedNode
        const model = DocumentModel.models.get(document)
        const layout = model.base.layout as LDXDocumentExpr

        const node = new ComponentNode(layout, createLDXKey())
        layout.embeds[node.__embed] = null

        async function update(layout) {
            const data = layout.serialize()
            data.embeds.inner[node.__embed] = descriptor
            await layout.update(data)
            const dock = node.__dock.current
            if (dock) dock.forceUpdate()
        }
        update(layout)

        return null
    }

    decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
        return <ComponentDock ref={this.__dock} node={this} />
    }

    exportAST() {
        const element = this.getElement()
        if (element) {
            const ctx = new ASTGenerator()
            return ctx.generate(null, element)
        }
        return null
    }

    get layout() {
        return InstrumentationLayout.Inlaid
    }
    get stretch() {
        return ElementBoundingBox.Outer
    }
    getDisplayInfos(): DisplayInfos {
        const element = this.getElement()
        return {
            title: element?.["tag"] || "?",
            icon: "bi:puzzle",
        }
    }
    getElement() {
        return this.__layout.embeds[this.__embed]
    }
    getLocation() {
        return null
    }
}

class ComponentDock extends React.Component<{ node: ComponentNode }> {
    unregister: any
    componentDidMount(): void {
        const { node } = this.props
        this.unregister = node.__layout.model.listen(() => {
            this.forceUpdate()
        })
    }
    componentWillMount(): void {
        this.unregister?.()
    }
    render() {
        const { node } = this.props
        const element = node.getElement() as LDXDisplayExpr
        if (element) {
            const params = element.props.read(EmptyContext)
            return <InstrumentationZone controller={node}>
                <InvokeView descriptor={{
                    name: element.tag,
                    params,
                }} />
            </InstrumentationZone>
        }
        else if (node.__layout.embeds[node.__embed] !== undefined) {
            return "loading..."
        }
        else {
            return "<not found>"
        }
    }
}