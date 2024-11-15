import React from 'react'
import { CommonTypes, Schema } from '@sf-explorer/core'
import { MapLike } from '@sf-explorer/core'
import { EditorMenu, IEditorProvider } from '@sf-explorer/editors/ui/editor-context'
import { DocumentationSchema, JSONSchema } from '@sf-explorer/core'
import ValueInput from '@sf-explorer/editors/ui/ValueInput'
import "./index.scss"

type SectionsMap = {
   [key: string]: JSONSchema
}[]

function createTypingMap(keys: string[], typings: MapLike<JSONSchema>): MapLike<JSONSchema> {
   return null
}

function createChapterMap(keys: string[], typings: MapLike<JSONSchema>, documentation?: DocumentationSchema): SectionsMap {
   return null
}

export interface PropertyDecoration {
   labeling?: React.ReactNode
   menu?: EditorMenu
}

export function PropertyTitle(props: {
   title: string
   description?: string
}) {
   const { title, description } = props

   return <div className="Line">
      <span className="PropertyTitle" title={description}>
         {title}
      </span>
   </div>
}

export function PropertyRow(props: {
   name?: string
   typing: JSONSchema
   value: any
   provider: IEditorProvider
   above?: boolean
   decoration?: PropertyDecoration
   onChange: (value: any) => void
}) {
   const { name, decoration, typing, value, provider, above, onChange } = props
   const [expanded, setExpanded] = React.useState(null)
   return <>
      <div className={above ? "Line Vertical" : "Line Horizontal"} >
         {name && <span className="PropertyName" title={Schema.generateTypescript(typing)}>
            {name}{decoration?.labeling}
         </span>}
         <span className="PropertyValue">
            <ValueInput
               value={value}
               typing={typing}
               provider={provider}
               menu={decoration?.menu}
               onExpand={setExpanded}
               onChange={onChange}
            />
         </span>
      </div >
      {expanded &&
         <div className="ExpandLine">
            {expanded}
         </div>
      }
   </>
}

export function PropertyRows(props: {
   heading?: React.ReactNode
   values: { [name: string]: any }
   typings: MapLike<JSONSchema>
   additionals?: JSONSchema
   documentation?: DocumentationSchema
   provider: IEditorProvider
   decorator?: (prop: string, value: any) => PropertyDecoration
   onChange?: (values: { [name: string]: any }) => void
}) {
   let { heading, values, additionals: additional, typings, provider, decorator } = props
   if (!values) values = {}

   const onChange = React.useCallback((name) => (value) => {
      props.onChange?.({
         ...props.values,
         [name]: value,
      })
   }, null)

   const rows = []
   for (const name in typings) {
      rows.push(<PropertyRow
         key={rows.length}
         name={name}
         typing={typings[name]}
         value={values[name]}
         provider={provider}
         decoration={decorator && decorator(name, values[name])}
         onChange={onChange(name)}
      />)
   }
   for (const name in values) {
      if (typings?.[name] === undefined) {
         rows.push(<PropertyRow
            key={rows.length}
            name={name}
            typing={additional || CommonTypes.any}
            value={values[name]}
            provider={provider}
            decoration={decorator && decorator(name, values[name])}
            onChange={onChange(name)}
         />)
      }
   }
   //const sections = createSectionMap(Object.keys(values), typings, props.documentation)
   return (<>
      {rows.length > 0 && heading}
      {rows}
   </>)
}

export function PropertyTable(props: {
   children?: any
}) {
   return (<div className="LDX-PropertiesTable">
      {props.children}
   </div>)
}
