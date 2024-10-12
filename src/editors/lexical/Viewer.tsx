import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import ContentEditable from './ui/ContentEditable'
import { SerializedEditorState } from 'lexical'
import { InitialConfigType, LexicalComposer } from '@lexical/react/LexicalComposer'
import PlaygroundNodes from './nodes/PlaygroundNodes'
import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme'
import { useMemo } from 'react'
import "./index.css"
import { $updateEditorStateFromMarkdown } from '@livedoc/editors/lexical/markdown/markdown-to-lexical'

export function DocumentViewer(props: {
   content: string
}): JSX.Element {

   const { content } = props

   const initialConfig = useMemo<InitialConfigType>(() => ({
      editorState: (editor) => {
         if (typeof content === "string") {
            editor.update(() => {
               $updateEditorStateFromMarkdown(content)
            })
         }
         else {
            const state = editor.parseEditorState(content)
            editor.setEditorState(state)
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
