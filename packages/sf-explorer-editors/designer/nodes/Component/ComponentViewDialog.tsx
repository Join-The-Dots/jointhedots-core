import { Klass, LexicalEditor, LexicalNode } from 'lexical'
import { useCallback } from 'react'
import { ComponentEntry, ComponentsRegistry, createValueFromTyping, ElementJSON, LDXDisplayExpr, MapLike, ObjectExpr } from '@sf-explorer/core'
import { $insertNodeToNearestRoot } from '@lexical/utils'
import { PanelNodeCreation } from '@sf-explorer/editors/ui/PanelNodeCreation'
import { LDXDocumentExpr } from '@sf-explorer/core'
import { INSERT_COMPONENT_COMMAND } from './ComponentPluginDragDrop'
import "@sf-explorer/editors/elements/register"

export async function insertComponentDialog(activeEditor: LexicalEditor, component_id: string, props?: MapLike<any>) {
  const component = await ComponentsRegistry.acquireComponent(component_id)
  const manifest = await component.fetch()
  if (!props) {
    props = createValueFromTyping(manifest["view"])
  }
  if (component.hasResource("view.react") || component.hasResource("view.web")) {
    activeEditor.dispatchCommand(INSERT_COMPONENT_COMMAND, {
      $type: "LDXDisplayExpr",
      tag: component_id,
    })
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

  const complete = useCallback(async (component: ComponentEntry, data: ElementJSON) => {
    await insertComponentDialog(activeEditor, component.id)
    onClose()
  }, null)

  return <PanelNodeCreation
    service='view'
    onComplete={complete}
    onCancel={onClose}
  />
}
