import { useEffect, useMemo, useState } from 'react'
import { ManageSettings } from './context/SettingsContext'
import { SharedHistoryContext } from './context/SharedHistoryContext'
import { LexicalEditor } from 'lexical'
import { InitialConfigType, LexicalComposer } from '@lexical/react/LexicalComposer'
import { SAVE_CONTENT_COMMAND } from './editor/commands'
import PlaygroundNodes from './nodes/PlaygroundNodes'
import { FlashMessageContext } from './context/FlashMessageContext'
import { TableContext } from './nodes/Table/TablePlugin'
import { SharedAutocompleteContext } from './context/SharedAutocompleteContext'
import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme'
import { $updateEditorStateFromModel, transformEditorStateToMarkdown } from '@sf-explorer/editors/designer/markdown/markdown-to-lexical'
import { createDocumentID, createDocumentModel, DocumentModel, LDXDocumentExpr } from '@sf-explorer/core'
import { DocumentContext } from './context/DocumentContext'
import { FeaturesContext, FeaturesMaterializer } from '../ui/FeaturesLayout'
import WindowedContainer, { DisplayLayout } from '../ui/WindowedContainer'
import { ViewEditor } from './editor'
import { CommentStore, CommentStoreContext } from './editor/commenting'
import "./themes/main.scss"
import "./index.css"

export function DocumentEditor(props: {
  content: string
  onChange: (content: string) => void
}): JSX.Element {

  const { content, onChange } = props
  const [editor, setEditor] = useState<LexicalEditor>(null)
  const [model, setModel] = useState<DocumentModel>(null)

  const initialConfig: InitialConfigType = useMemo(() => ({
    editorState: (editor) => {
      editor.registerCommand(SAVE_CONTENT_COMMAND, (_payload, editor) => {
        const value = transformEditorStateToMarkdown(editor.getEditorState())
        onChange(value)
        return true
      }, 0)
      setEditor(editor)
    },
    editable: true,
    namespace: 'Playground',
    toto: true,
    nodes: [...PlaygroundNodes],
    onError: (error: Error) => {
      throw error
    },
    theme: PlaygroundEditorTheme,
  }), [])

  useEffect(() => {
    if (content && editor) {
      createDocumentModel(createDocumentID(), content).then((model) => {
        editor?.update(() => {
          const { layout } = model.base
          if (layout instanceof LDXDocumentExpr) {
            $updateEditorStateFromModel(layout)
            setModel(model)
          }
          else {
            throw new Error()
          }
        })
      })
    }
  }, [content, editor])

  /*
    useEffect(() => {
      if (editor) {
        return mergeRegister(
          editor.registerCommand(
            DRAGSTART_COMMAND,
            EventHandlers.onZoneDragStart as any,
            COMMAND_PRIORITY_LOW,
          ),
          editor.registerCommand(
            DRAGOVER_COMMAND,
            EventHandlers.onZoneDragOver as any,
            COMMAND_PRIORITY_LOW,
          ),
          editor.registerCommand(
            DRAGEND_COMMAND,
            EventHandlers.onZoneDragLeave as any,
            COMMAND_PRIORITY_LOW,
          ),
          editor.registerCommand(
            DROP_COMMAND,
            EventHandlers.onZoneDrop as any,
            COMMAND_PRIORITY_LOW,
          ),
          editor.registerCommand(
            KEY_DELETE_COMMAND,
            (payload: KeyboardEvent) => {
              const deleteSelection = $getSelection();
              if ($isNodeSelection(deleteSelection)) {
                const event: KeyboardEvent = payload;
                event.preventDefault();
                editor.update(() => {
                  deleteSelection.getNodes().forEach((node) => {
                    if (node instanceof ComponentNode) {
                      node.remove();
                    }
                  });
                });
              }
              return false;
            },
            COMMAND_PRIORITY_LOW,
          ),
        )
      }
    }, [editor])*/

  const designer = useMemo(() => {
    if (model) {
      const designer = new FeaturesContext()
      designer.useFeature(ViewEditor, { model })
      return designer
    }
    return null
  }, [model])

  const commentStore = useMemo(() => new CommentStore(editor), [editor])

  const layout = model?.base?.layout as LDXDocumentExpr
  return <DocumentContext.Provider value={layout}>
    <ManageSettings id="settings:lexical-editor">
      <FlashMessageContext>
        <LexicalComposer initialConfig={initialConfig}>
          <SharedHistoryContext>
            <TableContext>
              <SharedAutocompleteContext>
                <CommentStoreContext.Provider value={commentStore}>
                  <FeaturesMaterializer features={designer}>
                    <WindowedContainer displayLayout={displayLayout} />
                  </FeaturesMaterializer>
                </CommentStoreContext.Provider>
              </SharedAutocompleteContext>
            </TableContext>
          </SharedHistoryContext>
        </LexicalComposer>
      </FlashMessageContext>
    </ManageSettings>
  </DocumentContext.Provider >
}

const displayLayout: DisplayLayout = {
  "#": {
    type: "#",
    child: "toolbar",
  },
  "toolbar": {
    type: "toolbar",
    child: "left",
    size: 5,
  },
  "left": {
    type: "side-left",
    child: "right",
    size: 20,
  },
  "right": {
    type: "side-right",
    child: "center",
    size: 25,
  },
  "center": {
    type: "center-top",
    menu: true,
  },
}
