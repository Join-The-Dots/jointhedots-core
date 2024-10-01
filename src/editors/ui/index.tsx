import React from 'react'
import { JSONSchema } from 'core/AST/schema-helpers'
import { MapLike } from 'core/common'
import { ASTExpression } from 'core/AST'
import { ComponentResource } from 'core/components'


export type ValueProps<T = any> = {
   name?: string
   value: T
   typing: JSONSchema
   onChange?: (value: T) => void
   onExpand?: (content: React.ReactElement) => void
}
export enum EditorValueMatch {
   None = 0,
   Valid = 1,
   Recommended = 2,
   Best = 3,
}

export type EditorPanel = {
   icon?: string
   view: React.ComponentType<ValueProps>
}

export type EditorMenuItem = {
   title: string
   icon?: string
   condition?: (value: any, typing: JSONSchema, context: IEditionContext) => boolean
   execute: (value: any, typing: JSONSchema, context: IEditionContext, onChange: any) => void
}

export type EditorMenu = {
   icon?: string
   sections: {
      title?: string
      condition?: (value: any, typing: JSONSchema) => boolean
      items: EditorMenuItem[]
   }[]
}

export type EditorDescriptor = {
   input?: React.ComponentType<ValueProps>
   heading?: React.ComponentType<ValueProps>
   panels?: MapLike<EditorPanel>
   menu?: EditorMenu
}

export type EditionController = {
   type: string
   kind?: string

   // Handlers
   matchType?: (schema: JSONSchema) => EditorValueMatch
   matchValue?: (value: any, handler?: ComponentResource) => EditorValueMatch
   createValue?: (schema: JSONSchema, prevValue?: any) => any

   // UI
   icon?: string
   editor?: EditorDescriptor
}

export interface IEditionOperation {
   validate()
   cancel()
}

export interface IEditionContext {
   readonly editing: boolean
   getAttachment<T = any>(name: string): T
   registerOperation(op: IEditionOperation)
   unregisterOperation(op: IEditionOperation)
}

export interface IEditorProvider {
   findControllerOf(value: ASTExpression, typing: JSONSchema): Promise<EditionController>
   listControllerOf(value: ASTExpression, typing: JSONSchema): Promise<Map<EditionController, EditorValueMatch>>
}

export const EditionContext = React.createContext<IEditionContext>(null)

export function sortMatchedControllers(matcheds: Map<EditionController, EditorValueMatch>): EditionController[] {
   return Array.from(matcheds.keys()).sort((a, b) => {
      const clvl = matcheds.get(a) - matcheds.get(b)
      if (clvl !== 0) return clvl
      return a.type.localeCompare(b.type)
   })
}

