import type { DocumentModel, DXElement, ElementKey } from "@livedoc/core/interpreter/model"

export type DisplayInfos = {
   title: string
   icon?: string
   category?: string
}

export type InstrumentationIcon = { name: string }

export enum InstrumentationLayout {
   Minimal, // when no editor handle displayed
   Inlaid, // when editor handle are shown inside a packing DOM element
   Placeholder, // when zone is just here to show empty fillable zone
}

export enum InstrumentationBoundingBox {
   Inner, // when bounding box shall fit to the DOM children
   Outer, // when bounding box shall fit to the DOM parent
}

export interface InstrumentationController {
   readonly layout: InstrumentationLayout
   readonly stretch: InstrumentationBoundingBox
   getDisplayInfos(): DisplayInfos
   getElement(): DXElement
}

export interface IInstrumentationProvider {
   createInstrumentedView<T extends InstrumentationController>(View: React.ElementType, controller: T): React.ElementType
   updateInstrumentedView<T extends InstrumentationController>(InstrumentedView: React.ElementType, controller: T): React.ElementType
}

