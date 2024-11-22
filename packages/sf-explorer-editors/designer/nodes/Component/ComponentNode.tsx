import { EmptyContext, AST, InvokeView, LDXDocumentExpr, createLDXKey, ASTGenerator, ElementJSON, LDXElementExpr, DisplayType, serializeElement, stringify_node_jsx } from '@sf-explorer/core'
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
    __element: LDXElementExpr
    __dom: HTMLElement

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

    createDOM(_config: EditorConfig): HTMLElement {
        const element = this.getElement() as LDXDisplayExpr
        if (element.type === DisplayType.React) {
            const root = document.createElement(this.isInline() ? 'span' : 'div')
            root.draggable = $getEditor().isEditable()
            return root
        }
        if (element.type === DisplayType.WebComponent) {
            return new (element.component as any)()
        }
        return null
    }

    updateDOM(prevNode: ComponentNode): boolean {
        return this.__layout !== prevNode.__layout ||
            this.__embed !== prevNode.__embed ||
            this.__element !== prevNode.__element
    }

    exportJSON(): SerializedComponentNode {
        const element = this.getElement()
        if (element) {
            return {
                type: 'component',
                version: 1,
                document: this.__layout.model.id,
                descriptor: serializeElement(element),
            }
        }
        return null
    }

    setSize(width: string | number, height: string | number) {
        console.log("setSize", width, height)
    }

    setProperty(name: string, value: string | number) {
        console.log("setProperty", name, value)
        const element = this.getElement() as LDXDisplayExpr
        const xprops = serializeElement(element.props)
        xprops.properties[0].value = {
            $type: "LiteralExpr",
            value,
        }
        element.props.update(xprops)
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
            node.markDirty()
        }
        update(layout)

        return null
    }

    exportAST() {
        const element = this.getElement()
        if (element) {
            const ctx = new ASTGenerator()
            return ctx.generate(null, element)
        }
        return null
    }

    getTextContent(
        _includeInert?: boolean | undefined,
        _includeDirectionless?: false | undefined,
    ): string {
        try {
            const element = this.getElement()
            if (element) {
                const ctx = new ASTGenerator()
                const ast = ctx.generate(null, element)
                return stringify_node_jsx(ast)
            }
        }
        catch (_) {
        }
        return null
    }

    decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
        return <ComponentDock ref={this.__dock} node={this} />
    }

    refresh() {
        const dock = this.__dock.current
        if (dock) dock.forceUpdate()
    }
}

class ComponentDock extends React.Component<{ node: ComponentNode }> {
    unregister: any
    componentDidMount(): void {
        const { node } = this.props
        this.unregister = node.__layout.model.listen(() => {
            node.refresh()
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