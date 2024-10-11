import { Klass, LexicalEditor, LexicalNode } from 'lexical'
import { useCallback } from 'react'
import { ComponentEntry, ComponentsRegistry } from 'core/library'
import { $insertNodeToNearestRoot } from '@lexical/utils'
import { ComponentNode } from './ComponentNode'
import { PanelNodeCreation } from 'editors/ui/PanelNodeCreation'
import "editors/datas/register"

export async function insertComponentDialog(activeEditor: LexicalEditor, component_id: string, data: any) {
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
        const node = new ComponentNode({
          tag: component.id,
          props: data as any,
        })
        $insertNodeToNearestRoot(node)
      })
    }
  }
}

export function ComponentViewDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor
  onClose: () => void
}): JSX.Element {

  const complete = useCallback(async (component: ComponentEntry, data: any) => {
    await insertComponentDialog(activeEditor, component.id, data)
    onClose()
  }, null)

  return <PanelNodeCreation
    service='view'
    onComplete={complete}
    onCancel={onClose}
  />
}
