import React from 'react'
import { JSONSchema, Element, MapLike, ComponentResource, ElementClass, ElementJSON } from '@sf-explorer/core'

export type ValueProps<T extends Element = Element> = {
   name?: string
   value: T
   typing: JSONSchema
   onChange?: (value: ElementJSON) => void
   onExpand?: (content: React.ReactElement) => void
}

export enum EditorValueMatch {
   None = 0,
   Valid = 1,
   Recommended = 2,
   Best = 3,
}

export type EditorPanel<T extends Element = Element> = {
   icon?: string
   view: React.ComponentType<ValueProps<T>>
}

export type EditorMenuItem<T extends Element = Element> = {
   title: string
   icon?: string
   condition?: (value: T, typing: JSONSchema, context: EditionEnvironment) => boolean
   execute: (value: T, typing: JSONSchema, context: EditionEnvironment, onChange: (value: ElementJSON) => void) => void
}

export type EditorMenu<T extends Element = Element> = {
   icon?: string
   sections: {
      title?: string
      condition?: (value: T, typing: JSONSchema) => boolean
      items: EditorMenuItem<T>[]
   }[]
}

export type EditorDescriptor<T extends Element = Element> = {
   input?: React.ComponentType<ValueProps<T>>
   heading?: React.ComponentType<ValueProps<T>>
   panels?: MapLike<EditorPanel<T>>
   menu?: EditorMenu<T>
}

export type EditionDriver<T extends Element = Element> = {

   // UI
   name: string
   icon?: string
   editor?: EditorDescriptor
   cls: ElementClass<T>

   // Handlers
   matchType?: (schema: JSONSchema) => EditorValueMatch
   matchValue?: (value: T, handler?: ComponentResource) => EditorValueMatch
   createValue?: (schema: JSONSchema, prevValue?: T) => ElementJSON
}

export interface IEditionOperation {
   validate()
   cancel()
}

export class EditionEnvironment {
   operations = new Set<IEditionOperation>
   attachements = {}
   get editing(): boolean {
      return this.operations.size > 0
   }
   getAttachment<T extends Element = Element>(name: string): T {
      return this.attachements[name]
   }
   registerOperation(op: IEditionOperation) {
      this.operations.add(op)
   }
   unregisterOperation(op: IEditionOperation) {
      this.operations.delete(op)
   }
   validate() {
      for (const op of this.operations.values()) {
         op.validate()
      }
   }
   cancel() {
      for (const op of this.operations.values()) {
         op.cancel()
      }
   }
}

export const EditionContext = React.createContext<EditionEnvironment>(null)

export function sortMatchedControllers(matcheds: Map<EditionDriver, EditorValueMatch>): EditionDriver[] {
   return Array.from(matcheds.keys()).sort((a, b) => {
      const clvl = matcheds.get(a) - matcheds.get(b)
      if (clvl !== 0) return clvl
      return a.name.localeCompare(b.name)
   })
}

