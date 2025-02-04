import React, { useCallback, useEffect, useState } from 'react'
import { DeviceAttribute, DeviceRemote } from "@livedoc/core/remote"
import { AttributeEditors } from "."
import "./register"
import Icon from '@livedoc/ui/Icon'
import { CommonTypes } from '@livedoc/core'
import { Tabs } from '@livedoc/editor/ui/Tabs'
import { JsonInput } from '@livedoc/editor/ui/InputJson'

export function DeviceAttributeEditor(props: {
   device: DeviceRemote
   attribut: DeviceAttribute
}) {
   const { device, attribut } = props
   const [content, setContent] = useState(undefined)
   const [selection, setSelection] = React.useState("editor")

   useEffect(() => {
      device.getAttributeContent(attribut).then(content => {
         setContent(content)
      })
   }, [device, attribut])

   const onChange = useCallback((content) => {
      device.setAttributeContent(attribut, content)
      setContent(content)
   }, [device, attribut])

   if (content !== undefined) {
      const desc = AttributeEditors[attribut.norm]
      const tabs = {
         "editor": {
            tab: <Icon name="code:/editor" />,
            content: <desc.editor
               device={device}
               content={content}
               onChange={onChange}
            />
         },
         "code": {
            tab: <Icon name="code:/code" />,
            content: <JsonInput
               value={content}
               typing={CommonTypes.any}
               onChange={onChange}
            />,
         }
      }
      return (<div className="InSlick-ElementPanel">
         <div>Device: {attribut.name}</div>
         <Tabs
            // atBottom
            items={tabs}
            selection={selection}
            onSelect={setSelection}
         />
      </div>)
   }
   return null
}

export function DeviceConfigurationEditor(props: {
   device: DeviceRemote
}) {
   const { device } = props
   const [attributes, setAttributes] = useState(undefined)

   useEffect(() => {
      device.getAttributes().then(attrs => {
         setAttributes(attrs)
      })
   }, [device])

   if (Array.isArray(attributes)) {
      return attributes.map((attr) => {
         return <React.Fragment key={attr.name}>
            <DeviceAttributeEditor device={device} attribut={attr} />
         </React.Fragment>
      })
   }
   return null
}
