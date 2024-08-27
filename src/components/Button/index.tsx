import React from 'react'
import Icon from '../Icon'
import "./index.scss"

export default function Button(props: {
   name: string
   secondary?: boolean
   onClick: any
}) {
   return (<div className={props.secondary ? "InSlick-Button secondary" : "InSlick-Button primary"} onClick={props.onClick}>
      <Icon name={props.name} />
   </div>)
}
