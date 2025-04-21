import React, { useState } from "react"
import { createFloatingDock, usePanel } from "@jointhedots/ui/Layouts"
import { Button, Input } from "react-lightning-design-system"
import { renderRoot } from "../config"

function Input2(props: {
   state?: [string, (value: string) => void]
   value?: string
   onChange?: (value: string) => void
}) {
   const { value, onChange, state, ...others } = props
   return <Input
      {...others}
      value={state?.[0] || value}
      onChange={(e) => {
         (state?.[1] || onChange)?.(e.currentTarget.value)
      }}
   />
}

function ApplicationRoot() {
   const value = useState("hello")
   const panel = usePanel((panel) => {
      return {
         icon: "",
         title: "",
         content: <div>
            {value[0]}
            <Button onClick={() => {
               panel.close()
            }}>Close</Button>
         </div>
      }
   }, [value])
   /* const anchor = usePanelAnchor((props: any) => {
      return <Button onClick={() => {
         //anchor.close()
      }}>Open panel</Button>
   }, []) */
   return <React.StrictMode>
      <Input2 state={value} />
      <Button onClick={() => {
         panel.isOpen ? panel.close() : panel.open("side")
      }}>Open side</Button>
      <Button onClick={() => {
         panel.open("modal")
      }}>Open modal</Button>
      <Button onClick={(e) => {
         panel.open(createFloatingDock(e))
      }}>Open floating</Button>
      <Button onClick={() => {
         panel.close()
      }}>Close</Button>

      {/*     <Button onClick={(e) => {
         panel.open(anchor.stick(e.currentTarget))
         anchor.stick(e.currentTarget).popup((anchor) => {
            return <Button onClick={() => {
               //anchor.close()
            }}>Open panel</Button>
         })
      }}>Open panel</Button> */}

   </React.StrictMode>
}

renderRoot(<ApplicationRoot />)
