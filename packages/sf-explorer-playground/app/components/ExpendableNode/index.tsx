import React from 'react'
import Icon from '@sf-explorer/core/ui/Icon'
import "./index.scss"

export function ExpendableNode(props: {
   title?: string
   label?: React.ReactNode
   init?: boolean
   entire?: boolean
   children?: React.ReactNode | (() => React.ReactNode)
}) {
   const { title, label, entire, children } = props
   const [open, setOpen] = React.useState(props.init || false)
   const swapOpen = children && (() => setOpen(!open))

   let iconName
   if (!children) iconName = "code:tree/empty"
   else if (open) iconName = "code:tree/closable"
   else iconName = "code:tree/openable"

   return (<div className="LDX-ExpendableNode">
      <span className="Label" title={title} onClick={entire && swapOpen}>
         <Icon name={iconName} onClick={swapOpen} />
         {label}
      </span>
      {open && <div className="Content">
         {children instanceof Function ? children() : children}
      </div>}
   </div>)
}
