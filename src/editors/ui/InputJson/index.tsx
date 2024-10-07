import React from 'react'
import * as monaco from "monaco-editor"
import { JSONSchema } from 'core/AST/schema-helpers'
import Button from 'components/Button'
import "./style.scss"
import { toast } from 'react-toastify'
import { EditionContext, IEditionOperation } from 'editors/ui'
import { stringifyDescriptor } from 'core/serde/json'

type PropsType = {
   typing: JSONSchema
   value: any
   onChange?: (value: string) => void
}

export class JsonInput extends React.Component<PropsType> implements IEditionOperation {
   static contextType = EditionContext
   context: React.ContextType<typeof EditionContext>
   element: HTMLDivElement
   editor: monaco.editor.IStandaloneCodeEditor
   resizer: ResizeObserver
   document: monaco.editor.ITextModel
   state = { edit: false }
   setting = false

   constructor(props) {
      super(props)
      this.resizer = new ResizeObserver(this.onResize)
      this.setDocument(props.value)
   }
   override getSnapshotBeforeUpdate(prevProps) {
      if (prevProps.value !== this.props.value) {
         this.setDocument(this.props.value)
      }
      return null
   }
   override componentDidUpdate() {
   }
   override componentWillUnmount() {
      this.unmountEditor()
      this.resizer.disconnect()
      this.document.dispose()
   }
   setDocument(value: any) {
      const text = stringifyDescriptor(value)
      this.setting = true
      if (this.document) {
         this.document.setValue(text)
      }
      else {
         this.document = monaco.editor.createModel(text, 'json')
      }
      this.setting = false
      if (this.state.edit) {
         this.setState({ edit: false })
         this.context?.unregisterOperation(this)
      }
   }
   validate(): boolean {
      const { onChange, value } = this.props
      if (onChange) {
         let newValue = null
         try {
            newValue = JSON.parse(this.document.getValue())
         }
         catch (e) {
            return false
         }
         if (stringifyDescriptor(newValue) !== stringifyDescriptor(value)) {
            this.context?.unregisterOperation(this)
            onChange(newValue)
         }
      }
      return true
   }
   cancel() {
      this.setDocument(this.props.value)
   }
   useElement = (element: HTMLDivElement) => {
      this.unmountEditor()
      this.mountEditor(element)
   }
   mountEditor(element: HTMLDivElement) {
      if (element) {
         this.element = element
         this.element.style.height = "100%"
         this.element.style.width = "100%"
         this.element.style.overflow = 'hidden'
         this.editor = monaco.editor.create(element, {
            model: this.document,
            theme: "vs-dark",
            minimap: { enabled: false },
            lineNumbersMinChars: 3,
            glyphMargin: false,
            lineNumbers: 'off',
            readOnly: !this.props.onChange,
         })
         this.editor.onDidChangeModelContent(this.onChanging)
         this.resizer.observe(this.element)
      }
   }
   unmountEditor() {
      if (this.element) {
         this.resizer.unobserve(this.element)
         this.editor.dispose()
         this.element = null
         this.editor = null
      }
   }
   onResize = () => {
      this.editor.layout()
   }
   onValidate = () => {
      if (!this.validate()) {
         toast.error("Invalid content")
      }
   }
   onCancel = () => {
      this.cancel()
   }
   onChanging = () => {
      if (this.setting === false) {
         this.setState({ edit: true })
         this.context?.registerOperation(this)
      }
   }
   override render() {
      const { edit } = this.state
      return <div className='json-edit-component'>
         {edit ? <div>
            <Button name="code:action/ok" onClick={this.onValidate} />
            <Button name="code:action/cancel" onClick={this.onCancel} />
         </div> : <div />}
         <div ref={this.useElement} />
      </div>
   }
}
