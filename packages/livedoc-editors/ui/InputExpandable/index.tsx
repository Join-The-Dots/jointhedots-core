import React from 'react'
import { ValueProps } from "@livedoc/editors/ui"
import ExpandedZone from './ExpandedZone'

export function StaticInputHOC(title: string) {
   return function ExpandableInput(props: ValueProps) {
      return (<div className="Clickable">
         {title}
      </div>)
   }
}

export function ExpandableInputHOC(title: string, ExpandedComponent: React.ComponentType<ValueProps>) {
   return function ExpandableInput(props: ValueProps) {
      const { onExpand } = props
      const [open, setOpen] = React.useState(false)
      const swapOpen = React.useCallback(() => setOpen(!open), [open])
      return (<div className="Clickable" onClick={onExpand && swapOpen}>
         {title}
         {open && <ExpandedZone onExpand={onExpand}>
            <ExpandedComponent {...props} />
         </ExpandedZone>}
      </div>)
   }
}