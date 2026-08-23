import React, { useCallback, useEffect, useRef, useState } from "react"
import { ServicePointSetting, ServicePoint, getSettings } from "@jointhedots/core"
import { MissingServiceError, registerErrorDisplayer, useServicesListener } from "@jointhedots/core/react"
import { ServicePointInput } from "./configurator"
import { openDialog } from "@jointhedots/layout"
import { Button } from "@jointhedots/button"


function ServiceConfiguratorForm(props: {
   services: ServicePoint[]
   onApply?: () => void
}) {
   const settings = getSettings()
   const { services, onApply } = props
   const [descriptors, setDescriptors] = useState(() => {
      return services.reduce((prev, svc) => {
         prev[svc.id] = svc.descriptor
         return prev
      }, {})
   })

   onApply && useServicesListener(onApply)

   const list = []
   for (const id in descriptors) {
      const descriptor = descriptors[id]
      const onChange = (descriptor: ServicePointSetting) => {
         setDescriptors({ ...descriptors, [id]: descriptor })
      }
      list.push(<ServicePointInput
         key={id}
         label={descriptor.title || id}
         value={descriptor}
         onChange={onChange}
      />)
   }

   const apply = useCallback(async () => {
      for (const scv of services) {
         settings.set("service_points", scv.id, descriptors[scv.id])
      }
      for (const scv of services) {
         await scv.fetch()
      }
      onApply?.()
   }, [onApply, descriptors])

   return <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 10, maxWidth: 400, margin: "auto" }}>
      <div style={{
         fontSize: "150%",
         borderBottom: "dotted thin #aaaa",
       }}>Following services are required</div>
      {list}
      <Button variant="primary" label="Apply" onClick={apply} />
   </div >
}

export function DefaultServiceConfigurator(props: {
   services: ServicePoint[]
   onApply?: () => void
}) {
   const divRef = useRef<HTMLDivElement>()
   const [sizing, setSizing] = useState(0)
   useEffect(() => {
      const div = divRef.current
      const sizer = new ResizeObserver(() => {
         if (div.clientWidth < 400 && div.clientHeight < 300) setSizing(1)
         else setSizing(2)
      })
      sizer.observe(div)
      return () => sizer.unobserve(div)
   }, [divRef])
   const onSettings = () => {
      openDialog<void>((resolve) => {
         return <ServiceConfiguratorForm {...props} onApply={resolve} />
      }).then(props.onApply)
   }
   return <div ref={divRef} style={{ overflow: "hidden" }}>
      {sizing == 2
         ? <div style={{ borderRadius: 10, maxWidth: 400, border: "solid thin grey", margin: "auto" }}>
            <ServiceConfiguratorForm {...props} />
         </div>
         : sizing == 1
            ? <div style={{ maxWidth: 400, padding: 5, margin: "auto" }}>
               <Button
                  variant="error"
                  icon="bi:exclamation-diamond"
                  label="Settings"
                  onClick={onSettings}
               />
            </div>
            : null
      }
   </div>
}

export class ServiceRequirementBoundary extends React.Component<{
   children: React.ReactNode
}> {
   state: { error?: MissingServiceError } = {}
   componentDidCatch(error: Error) {
      if (error instanceof MissingServiceError) this.setState({ error })
      else throw error
   }
   render() {
      const { error } = this.state
      if (error) {
         return <DefaultServiceConfigurator
            services={error.missings}
            onApply={() => this.setState({ error: undefined })}
         />
      } else {
         return <>{this.props.children}</>
      }
   }
}

export function registerMissingServiceDisplayer() {
   registerErrorDisplayer(MissingServiceError, (props) => {
      const { error, onRetry } = props
      return <DefaultServiceConfigurator
         services={error.missings}
         onApply={onRetry}
      />
   })
}
