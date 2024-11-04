import React from 'react'
import * as Monaco from "monaco-editor"
import { editor as Editor, languages as Lang, Uri } from "monaco-editor"
import "./index.scss"

export interface MonacoLanguageProvider<T> {
   readonly language: string
   readonly uri?: Uri
   getContext(model: Editor.ITextModel): T
   attachContext(model: Editor.ITextModel, context: T)
   dettachContext(model: Editor.ITextModel)
   checkModel(model: Editor.ITextModel): Promise<Editor.IMarkerData[]>
}

export type MonacoPropsType<T = any> = {
   value: string
   context?: T
   className?: string
   adjustHeightMax?: number
   uri?: Uri
   onChange?: (model: Editor.ITextModel) => void
}

export class StandardLanguageProvider<T> implements MonacoLanguageProvider<T> {
   protected contexts = new WeakMap<Editor.ITextModel, T>
   constructor(
      readonly language: string,
      readonly uri?: Uri,
   ) {
   }
   getContext(model: Editor.ITextModel): T {
      return this.contexts.get(model)
   }
   attachContext(model: Editor.ITextModel, context: T) {
      if (!this.contexts.has(model)) {
         model.onWillDispose(() => {
            this.contexts.delete(model)
         })
      }
      this.contexts.set(model, context)
   }
   dettachContext(model: Editor.ITextModel) {
      if (this.contexts.has(model)) {
         this.contexts.set(model, null)
      }
   }
   async checkModel(model: Editor.ITextModel): Promise<Editor.IMarkerData[]> {
      return []
   }
}

export function MonacoEditorHOC<T>(provider: MonacoLanguageProvider<T>) {
   return class MonacoEditor extends React.Component<MonacoPropsType<T>> {
      element: HTMLDivElement
      editor: Editor.IStandaloneCodeEditor
      model: Editor.ITextModel
      setting = false

      constructor(props) {
         super(props)
         this.getSnapshotBeforeUpdate({})
      }
      override getSnapshotBeforeUpdate(prevProps) {
         const { value } = this.props
         if (value !== this.model?.getValue()) {
            this.setValue(value)
         }
         return null
      }
      override componentDidUpdate() {
      }
      override componentWillUnmount() {
         this.unmountEditor()
         //this.model?.dispose()
      }
      setValue(value: string) {
         if (this.model) {
            this.setting = true
            this.model.setValue(value || '')
            this.setting = false
         }
         else {
            const { value, context } = this.props
            const models = Editor.getModels()
            const model = provider.uri && models.find(item => item.uri.toString() === provider.uri.toString())
               || Editor.createModel(value, provider.language, provider.uri)
            provider.attachContext(model, context)
            this.setDocument(model)

         }
      }
      setDocument(model: Editor.ITextModel) {
         if (this.model !== model) {
            this.setting = true
            this.model = model
            if (this.editor) this.editor.setModel(model)
            this.setting = false
         }
      }
      useElement = (element: HTMLDivElement) => {
         this.unmountEditor()
         this.mountEditor(element)
      }
      mountEditor(element: HTMLDivElement) {
         if (element) {
            this.element = element
            this.element.style.height = "auto"
            this.element.style.width = "100%"
            this.element.style.overflow = 'hidden'


            this.editor = Editor.create(element, {
               model: this.model,
               theme: "vs-light",
               minimap: { enabled: false },
               lineNumbersMinChars: 3,
               glyphMargin: false,
               lineNumbers: 'off',
               wordWrap: 'on',
               readOnly: !this.props.onChange,
               automaticLayout: true,
               fixedOverflowWidgets: true,
               scrollBeyondLastLine: false,
               stickyScroll: { enabled: false },
            })
            this.editor.onDidChangeModel(this.onModelChange)
            this.editor.onDidChangeModelContent(this.onContentChange)
            this.adjustHeight()

         }
      }
      unmountEditor() {
         if (this.element) {
            this.editor?.dispose()
            this.element = null
            this.editor = null
         }
      }
      adjustHeight() {
         const { adjustHeightMax } = this.props
         if (adjustHeightMax) {
            const contentHeight = this.editor.getContentHeight()
            const editorHeight = `${Math.min(contentHeight, adjustHeightMax)}px`
            this.element.style.height = editorHeight
            if (contentHeight <= adjustHeightMax) {
               this.editor.setScrollTop(0)
            }
         }
      }
      onModelChange = async (e) => {
         this.adjustHeight()
      }
      onContentChange = async (e) => {
         const { onChange } = this.props

         // Adjust editor height to content
         this.adjustHeight()

         // Check content
         const markers = await provider.checkModel(this.model)
         Editor.setModelMarkers(this.model, 'owner', markers || [])

         // Dispatch when not in props update
         if (this.setting === false) {
            onChange?.(this.model)
         }
      }
      override render() {
         return <div className={this.props.className || "MonacoEditorHOC"} ref={this.useElement} />
      }
   }
}

export async function GetLanguageInfos(langId: string): Promise<{
   conf: Lang.LanguageConfiguration
   language: Lang.IMonarchLanguage
}> {
   return Monaco?.languages.getLanguages().find(x => x.id === langId)["loader"]()
}
