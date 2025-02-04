
import React from 'react'
import { DocumentModel, DocumentLayer, InvalidValue } from '../model'
import { IDocumentFrame, DocumentFrameContext, document, AsDocumentFrame } from './document-frames'
import { ModelContext, IModelFrame } from '@livedoc/core/interpreter/execution'
import { ModelViewModule } from "@livedoc/core/interpreter/registry"
import { ReactClientRect, ReactTools } from '@livedoc/core/react/react-tools'
import { ComponentEntry } from '@livedoc/core/library/components'
import { ModelBuilder } from '../builder'
import { DocumentChangeSet } from '../log'

export type ViewPropsType = {
   [name: string]: any
}

export const EditedPropName = "--edited"

export abstract class LayerView extends AsDocumentFrame(React.Component<ViewPropsType, { result: any }>) implements IModelFrame, IDocumentFrame {
   static contextType = DocumentFrameContext
   executor: ModelContext
   children: IDocumentFrame[] = []
   parent: IDocumentFrame

   constructor(props: ViewPropsType, parent: IDocumentFrame) {
      super(props)
      this.parent = parent

      this.executor = this.createExecutor(props)
      this.executor.execute()

      this.state = { result: this.executor.read() }

      if (parent) parent.addSubLayer(this)
      else document.addSubLayer(this)
   }
   get title(): string {
      return this.executor.title
   }
   getFrameContext(): ModelContext {
      return this.executor
   }
   getFrameRect(): ReactClientRect {
      const node = ReactTools.findNodeFromInstance(this)
      if (node) return ReactTools.getHTMLClientRect(node)
      return null
   }
   componentWillUnmount() {
      this.executor.dispose()
      if (this.parent) this.parent.removeSubLayer(this)
      else document.addSubLayer(this)
   }
   shouldComponentUpdate(nextProps, nextState, nextContext) {

      if (nextProps !== this.props) {
         this.executor.update(nextProps)
      }

      const result = this.executor.read()
      if (result !== nextState.result) {
         nextState.result = result
         return true
      }
      return false
   }
   dispatch(result) {
      if (this.state) {
         this.setState({ result })
         this.forceUpdate()
      }
   }
   render() {
      const { result } = this.state
      if (result === InvalidValue) {
         return "waiting..."
      }
      else {
         return <DocumentFrameContext.Provider value={this}>
            {result}
         </DocumentFrameContext.Provider>
      }
   }
   abstract createExecutor(props): ModelContext
}


export function getLayerView(layer: DocumentLayer, context?: ModelContext): React.ComponentType {
   let component = layer["--component"]
   if (!component) {
      component = class LayerViewHOC extends LayerView {
         static layer: DocumentLayer = layer
         override createExecutor(props): ModelContext {
            const edited = props[EditedPropName] === true
            return new ModelContext(props, LayerViewHOC.layer, this, context, edited)
         }
      }
      layer["--component"] = component
   }
   return component
}

export function getComponentViewSync(module: ComponentEntry): DocumentModel {
   const src = module.getResource("view.document")
   const data = src.get<ModelViewModule>()
   if (data instanceof Object) {
      const { model } = data
      if (model instanceof DocumentModel) {
         return model
      }
   }
   return null
}

export async function fetchComponentView(module: ComponentEntry): Promise<DocumentModel> {
   const src = module.acquireResource("view")
   const data = await src.fetch() as ModelViewModule
   if (data instanceof Object) {
      const { model } = data
      if (model instanceof DocumentModel) {
         return model
      }
   }
   return null
}

export async function setComponentView(module: ComponentEntry, model: DocumentModel) {
   const src = module.acquireResource("view")
   const data = await src.fetch() as ModelViewModule
   if (data instanceof Object) {
      if (data.model instanceof DocumentModel) {
         data.model = model
         const component = data.default.component
         if (component["layer"] instanceof DocumentLayer) {
            component["layer"] = model.main
         }
      }
      else {
         throw new Error("Shall be a flow component view")
      }
   }
}

export async function reinstallComponentView(module: ComponentEntry, payload: DocumentChangeSet) {
   const exports = await module.acquireResource("view").fetch()
   const HMR_loader = exports?.["--HMR-loader"]
   if (HMR_loader) {
      HMR_loader(payload)
   }
   else {
      const model = await fetchComponentView(module)
      if (model) {
         const builder = new ModelBuilder(model)
         await builder.update(payload)
      }
   }
}
