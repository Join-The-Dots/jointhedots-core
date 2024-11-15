import { EmptyContext } from '@sf-explorer/core'
import { DocumentModel, LDXElementExpr, SubTreeGenerator } from '@sf-explorer/core'
import { InvokeView } from '@sf-explorer/core'
import { DisplayInfos, ElementBoundingBox, ElementController, InstrumentationLayout } from '@sf-explorer/core/ui/Instrumentation'
import { InstrumentationZone } from '@sf-explorer/core/ui/Instrumentation'
import type { EditorConfig, LexicalEditor, NodeKey, SerializedLexicalNode, Spread } from 'lexical'
import { $getEditor, DecoratorNode } from 'lexical'
import * as AST from "@sf-explorer/core"
import React, { createRef, useEffect, useState } from 'react'

export type SerializedComponentNode = Spread<
    {
        document: string
        descriptor: AST.Any
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
        public __layout: AST.LDXDocumentExpr,
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
        return {
            type: 'component',
            version: 1,
            document: this.__layout.model.id,
            descriptor: this.exportAST(),
        }
    }

    static importJSON(serializedNode: SerializedComponentNode): ComponentNode {
        const { document, descriptor } = serializedNode
        const model = DocumentModel.models.get(document)
        const layout = model.base.layout as AST.LDXDocumentExpr

        const node = new ComponentNode(layout, AST.createLDXKey())
        layout.embeds.set(node.__embed, null)

        layout.update(async (self, T) => {
            const embed = await self.NewFrom(descriptor)
            if (embed instanceof LDXElementExpr) {
                self.embeds.set(node.__embed, embed)
                const dock = node.__dock.current
                if (dock) dock.forceUpdate()
            }
            return self
        })

        return null
    }

    decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
        return <ComponentDock ref={this.__dock} node={this} />
    }

    exportAST() {
        const element = this.getElement()
        if (element) {
            const ctx = new SubTreeGenerator()
            return ctx.generateXpr(null, element)
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
        return this.__layout.embeds.get(this.__embed)
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
        const element = node.getElement() as LDXElementExpr
        if (element) {
            const params = element.props.read(EmptyContext)
            return <InstrumentationZone controller={node}>
                <InvokeView descriptor={{
                    name: element.tag,
                    params,
                }} />
            </InstrumentationZone>
        }
        else if (node.__layout.embeds.has(node.__embed)) {
            return "loading..."
        }
        else {
            return "<not found>"
        }
    }
}