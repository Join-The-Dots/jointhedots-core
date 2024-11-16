import React from 'react'
import Icon from '@sf-explorer/core/ui/Icon'
import "./index.scss"

export default function Button(props: {
   name: string
   variant?: "primary" | "secondary" | "watermark"
   onClick: any
}) {
   return (<div className={`LDX-Button ${props.variant || "primary"}`} onClick={props.onClick}>
      <Icon name={props.name} />
   </div>)
}
