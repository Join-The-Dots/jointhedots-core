import React from 'react'
import { MapLike } from '@sf-explorer/core'
import { ComponentResource } from '@sf-explorer/core'
import { JSONSchema } from '@sf-explorer/core'

export type ValueProps<T = any> = {
   name?: string
   value: T
   typing: JSONSchema
   onChange?: (value: T) => void
   onExpand?: (content: React.ReactElement) => void
   provider?: IEditorProvider
}

export enum EditorValueMatch {
   None = 0,
   Valid = 1,
   Recommended = 2,
   Best = 3,
}

export type EditorPanel<T = any> = {
   icon?: string
   view: React.ComponentType<ValueProps<T>>
}

export type EditorMenuItem<T = any> = {
   title: string
   icon?: string
   condition?: (value: T, typing: JSONSchema, context: IEditionEnvironment) => boolean
   execute: (value: T, typing: JSONSchema, context: IEditionEnvironment, onChange: T) => void
}

export type EditorMenu<T = any> = {
   icon?: string
   sections: {
      title?: string
      condition?: (value: T, typing: JSONSchema) => boolean
      items: EditorMenuItem<T>[]
   }[]
}

export type EditorDescriptor<T = any> = {
   input?: React.ComponentType<ValueProps<T>>
   heading?: React.ComponentType<ValueProps<T>>
   panels?: MapLike<EditorPanel<T>>
   menu?: EditorMenu<T>
}

export type EditionDriver<T = any> = {

   // UI
   name: string
   icon?: string
   editor?: EditorDescriptor

   // Handlers
   matchType?: (schema: JSONSchema) => EditorValueMatch
   matchValue?: (value: T, handler?: ComponentResource) => EditorValueMatch
   createValue?: (schema: JSONSchema, prevValue?: T) => T
}

export interface IEditionOperation {
   validate()
   cancel()
}

export interface IEditionEnvironment {
   readonly editing: boolean
   getAttachment<T = any>(name: string): T
   registerOperation(op: IEditionOperation)
   unregisterOperation(op: IEditionOperation)
}

export interface IEditorProvider<T = any> {
   findControllerOf<Tx extends T>(value: Tx, typing: JSONSchema): Promise<EditionDriver<Tx>>
   listControllerOf<Tx extends T>(value: Tx, typing: JSONSchema): Promise<Map<EditionDriver<Tx>, EditorValueMatch>>
   stringify(value: T): { text: string, lang: string }
}

export class EditionEnvironment implements IEditionEnvironment {
   operations = new Set<IEditionOperation>
   attachements = {}
   get editing(): boolean {
      return this.operations.size > 0
   }
   getAttachment<T = any>(name: string): T {
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

export const EditionContext = React.createContext<IEditionEnvironment>(null)

export function sortMatchedControllers(matcheds: Map<EditionDriver, EditorValueMatch>): EditionDriver[] {
   return Array.from(matcheds.keys()).sort((a, b) => {
      const clvl = matcheds.get(a) - matcheds.get(b)
      if (clvl !== 0) return clvl
      return a.name.localeCompare(b.name)
   })
}

