import { Klass, LexicalEditor, LexicalNode } from 'lexical'
import { useCallback } from 'react'
import { ComponentEntry, ComponentsRegistry } from '@sf-explorer/core'
import { $insertNodeToNearestRoot } from '@lexical/utils'
import { PanelNodeCreation } from '@sf-explorer/editors/ui/PanelNodeCreation'
import { emitJSXElementFromData } from '@sf-explorer/core'
import { LDXDocumentExpr } from '@sf-explorer/core'
import { INSERT_COMPONENT_COMMAND } from './ComponentPluginDragDrop'
import "@sf-explorer/editors/elements/register"

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
    activeEditor.dispatchCommand(INSERT_COMPONENT_COMMAND, emitJSXElementFromData({
      tag: component.id,
      props: data as any,
    }))
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
