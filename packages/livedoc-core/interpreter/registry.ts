import { DocumentModel } from "./model"
import { getLayerView } from "@livedoc/core/interpreter/display/view"
import { ComponentEntry } from "../library/components"
import { parse_document } from "../ast/serde/parser"
import { AST } from "../ast"
import { ModelBuilder } from "./builder"

export interface ModelViewModule {
   default: any
   model: DocumentModel
}

export async function createDocumentModel(component: ComponentEntry, source: AST.JSXDocument | string): Promise<DocumentModel> {
   if (typeof source === "string") {
      source = parse_document(source)
   }
   const model = new DocumentModel(component)
   const builder = new ModelBuilder(model)
   await builder.build(source)
   return model
}

export async function createDocumentComponent(component: ComponentEntry, source: AST.JSXDocument | string): Promise<React.ComponentType> {
   const model = await createDocumentModel(component, source)
   return getLayerView(model.main)
}

export async function createDocumentModule(component: ComponentEntry, source: AST.JSXDocument | string): Promise<ModelViewModule> {
   const model = await createDocumentModel(component, source)
   return {
      default: {
         name: model.id,
         component: getLayerView(model.main),
      },
      model,
   }
}
