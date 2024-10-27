import React from 'react'
import Icon from '@sf-explorer/core/ui/Icon'
import "./index.scss"

export default function Button(props: {
   name: string
   secondary?: boolean
   onClick: any
}) {
   return (<div className={props.secondary ? "LDX-Button secondary" : "LDX-Button primary"} onClick={props.onClick}>
      <Icon name={props.name} />
   </div>)
}
