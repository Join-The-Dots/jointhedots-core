import { Klass, LexicalEditor, LexicalNode } from 'lexical'
import { useCallback } from 'react'
import { ComponentEntry, ComponentsRegistry } from '@sf-explorer/core'
import { $insertNodeToNearestRoot } from '@lexical/utils'
import { ComponentNode } from './ComponentNode'
import { PanelNodeCreation } from '@sf-explorer/editors/ui/PanelNodeCreation'
import { emitJSXElementFromData } from '@sf-explorer/core'
import { LDXDocumentExpr, LDXElementExpr } from '@sf-explorer/core'
import "@sf-explorer/editors/datas/register"

export async function insertComponentDialog(activeEditor: LexicalEditor, layout: LDXDocumentExpr, component_id: string, data: any) {
  const component = await ComponentsRegistry.acquireComponent(component_id)
  const lexicalNode = await component.fetchResource<Klass<LexicalNode>>("view.lexical")
  if (lexicalNode) {
    activeEditor.update(() => {
      const node = lexicalNode.importJSON({
        type: component.id,
        ...data,
        ...data?.props,
      })
      $insertNodeToNearestRoot(node)
    })
  }
  else {
    const reactView = await component.fetchResource<Klass<LexicalNode>>("view.react")
    if (reactView) {
      activeEditor.update(async () => {
        const expr = layout.NewFrom(emitJSXElementFromData({
          tag: component.id,
          props: data as any,
        }))
        if (expr instanceof LDXElementExpr) {
          const node = new ComponentNode(expr)
          $insertNodeToNearestRoot(node)
        }
      })
    }
  }
}

export function ComponentViewDialog({
  activeEditor,
  layout,
  onClose,
}: {
  activeEditor: LexicalEditor
  layout: LDXDocumentExpr
  onClose: () => void
}): JSX.Element {

  const complete = useCallback(async (component: ComponentEntry, data: any) => {
    await insertComponentDialog(activeEditor, layout, component.id, data)
    onClose()
  }, null)

  return <PanelNodeCreation
    service='view'
    onComplete={complete}
    onCancel={onClose}
  />
}
