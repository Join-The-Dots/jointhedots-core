import React from "react"
import Stack from "editors/ui/Stack"
import Icon from "core/ui/Icon"

export function Card(props: {
   icon?: string
   title?: React.ReactNode
   action?: React.ReactNode
   children: React.ReactNode
}) {
   const { icon, title, action, children } = props
   return <Stack vertical style={{ border: "solid thin #444", borderRadius: 5, padding: 5 }}>
      {title === undefined ? <></> :
         <Stack gap={5} style={{ padding: 5 }}>
            <Stack.FixedDock><Icon name={icon || "code:none"} /></Stack.FixedDock>
            <Stack.FlexDock>{title}</Stack.FlexDock>
            <Stack.FixedDock>{action}</Stack.FixedDock>
         </Stack>
      }
      <Stack.FixedDock style={{ padding: 5 }}>
         {children}
      </Stack.FixedDock>
   </Stack>
}
