import { useMemo } from 'react'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import ContentEditable from './ui/ContentEditable'
import { InitialConfigType, LexicalComposer } from '@lexical/react/LexicalComposer'
import PlaygroundNodes from './nodes/PlaygroundNodes'
import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme'
import { createDocumentID, createDocumentModel, LDXDocumentExpr } from '@jointhedots/core'
import { $updateEditorStateFromModel } from './markdown/markdown-to-lexical'
import "./index.css"

export function DocumentViewer(props: {
   content: string
}): JSX.Element {

   const { content } = props

   const initialConfig = useMemo<InitialConfigType>(() => ({
      editorState: (editor) => {
         if (content && editor) {
            createDocumentModel(createDocumentID(), content).then((model) => {
               editor?.update(() => {
                  const { layout } = model.base
                  if (layout instanceof LDXDocumentExpr) {
                     $updateEditorStateFromModel(layout)
                  }
                  else {
                     throw new Error()
                  }
               })
            })
         }
      },
      editable: false,
      namespace: 'Playground',
      nodes: [...PlaygroundNodes],
      onError: (error: Error) => {
         throw error
      },
      theme: PlaygroundEditorTheme,
   }), [content])

   return <LexicalComposer initialConfig={initialConfig}>
      <div className={`editor-container plain-text`}>
         <PlainTextPlugin
            contentEditable={<ContentEditable placeholder={""} />}
            ErrorBoundary={LexicalErrorBoundary}
         />
      </div>
   </LexicalComposer>
}
