import { COMMAND_PRIORITY_EDITOR, createCommand, Klass, LexicalCommand, LexicalEditor, LexicalNode } from 'lexical'
import { useCallback, useContext, useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ComponentEntry } from 'core/components'
import { $insertNodeToNearestRoot } from '@lexical/utils'
import { ComponentNode } from './ComponentNode'
import { PanelNodeCreation } from 'editors/ui/PanelNodeCreation'
import "editors/datas/register"
import { emitASTFromValue } from 'core/ast/producer'
import { stringify_node_jsx } from 'core/ast/serde/markdown'

export const INSERT_VIEW_COMMAND: LexicalCommand<string> = createCommand(
  'INSERT_VIEW_COMMAND',
)

export function ComponentViewDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor
  onClose: () => void
}): JSX.Element {

  const complete = useCallback(async (component: ComponentEntry, data: any) => {
    const view_lexical = await component.fetchResource<Klass<LexicalNode>>("view.lexical")
    if (view_lexical) {
      activeEditor.update(() => {
        const node = view_lexical.importJSON({
          type: component.id,
          ...data,
          ...data.props,
        })
        $insertNodeToNearestRoot(node)
      })
    }
    else {
      const view_react = await component.fetchResource<Klass<LexicalNode>>("view.react")
      if (view_react) {
        activeEditor.update(async () => {
          const node = new ComponentNode({
            tag: component.id,
            props: data as any,
          })
          $insertNodeToNearestRoot(node)
        })
      }
    }
    console.log(data)
    onClose()
  }, null)

  return <PanelNodeCreation
    service='view'
    onComplete={complete}
    onCancel={onClose}
  />
}

export default function ComponentPlugin({
  captionsEnabled,
}: {
  captionsEnabled?: boolean
}): JSX.Element | null {

  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand<string>(
      INSERT_VIEW_COMMAND,
      (payload) => {

        return true
      },
      COMMAND_PRIORITY_EDITOR,
    )
  }, [editor])

  return null
}
