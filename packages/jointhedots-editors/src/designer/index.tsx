import React from "react"
import Icon from "@jointhedots/ui/Icon"
import { DocumentEditor } from "./DocumentEditor"
import { DocumentViewer } from "./DocumentViewer"
import "./index.scss"

export function DocumentEditable(props: {
   content: string
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
      return <div className="jointhedots-viewer-editable">
         <div className="edit-floating">
            <div onClick={() => setEdition(true)}>
               <Icon name="bi:pencil" />
            </div>
         </div>
         <DocumentViewer content={content} />
      </div>
   }
}
