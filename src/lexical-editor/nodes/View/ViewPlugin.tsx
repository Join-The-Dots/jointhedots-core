import { COMMAND_PRIORITY_EDITOR, createCommand, Klass, LexicalCommand, LexicalEditor, LexicalNode } from 'lexical';
import { useCallback, useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ComponentEntry } from 'core/components';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { ViewNode } from './ViewNode';
import { PanelNodeCreation } from 'editors/ui/PanelNodeCreation';
import "editors/datas/register"

export const INSERT_VIEW_COMMAND: LexicalCommand<string> = createCommand(
  'INSERT_VIEW_COMMAND',
)

export function ComponentViewDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {

  const complete = useCallback(async (component: ComponentEntry, data: any) => {
    const view_lexical = await component.fetchResource<Klass<LexicalNode>>("view.lexical")
    if (view_lexical) {
      activeEditor.update(() => {
        const node = view_lexical.importJSON({
          type: component.id,
          ...data,
        });
        $insertNodeToNearestRoot(node);
      })
    }
    else {
      const view_react = await component.fetchResource<Klass<LexicalNode>>("view.react")
      if (view_react) {
        activeEditor.update(() => {
          const node = new ViewNode({
            type: "element",
            version: 0,
            view: component.id,
            props: data
          })
          $insertNodeToNearestRoot(node);
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

export default function ExplorerViewPlugin({
  captionsEnabled,
}: {
  captionsEnabled?: boolean;
}): JSX.Element | null {

  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<string>(
      INSERT_VIEW_COMMAND,
      (payload) => {

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
