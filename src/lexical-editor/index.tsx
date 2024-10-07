import React from "react"
import { Button } from "react-bootstrap"
import Icon from "components/Icon"
import { SerializedEditorState } from "lexical"
import { DocumentEditor } from "./Editor"
import { DocumentViewer } from "./Viewer"
import "./index.scss"

export function DocumentEditable(props: {
   content: SerializedEditorState | string
   onChange: (content: string) => void
}): JSX.Element {
   const { content, onChange } = props
   const [edition, setEdition] = React.useState(true)
   if (edition) {
      return <DocumentEditor
         content={content}
         onChange={(content) => {
            onChange(content)
            setEdition(false)
         }}
      />
   }
   else {
      return <div className="livedoc-viewer-editable">
         <div className="edit-floating">
            <div onClick={() => setEdition(true)}>
               <Icon name="bi:pencil" />
            </div>
         </div>
         <DocumentViewer content={content} />
      </div>
   }
}
