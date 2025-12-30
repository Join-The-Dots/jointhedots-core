import { useEffect, useState } from "react"
import {
   ServicePointSetting, ServicePoint, fetchComponentsPublications,
   ServicePoints, getServicePoint, getSettings, listenSettings, unlistenSettings,
} from "@jointhedots/core"
import { useAsyncMemo } from "@jointhedots/core/react"

import { blue, cyan, deepOrange, green, pink, purple, deepPurple, orange } from '@mui/material/colors'
import { ServicePointEditable, useServiceDescriptor } from "./internal"

export const DefaultColorsMap = [green, pink, blue, cyan, deepOrange, purple, deepPurple, orange].map(x => x["A700"])

export function ServicePointStatus(props: {
   servicePoint: ServicePoint
}) {
   const { servicePoint } = props
   const descriptor = useServiceDescriptor(servicePoint)

   const providers = useAsyncMemo(() => {
      return fetchComponentsPublications(descriptor?.providers)
   }, [], [descriptor?.providers])

   const onChange = (descriptor: ServicePointSetting) => {
      getSettings().set("service_points", servicePoint.id, descriptor)
   }

   return <ServicePointEditable
      compact
      hasSelectMode
      colormap={providers.length > 1 ? DefaultColorsMap : undefined}
      servicePoint={descriptor}
      providers={providers}
      onChange={onChange}
   />
}


export function ServicePointInput(props: {
   value: ServicePointSetting
   label?: string
   type?: string
   errorMessage?: string
   required?: boolean
   disabled?: boolean
   onChange: (value: ServicePointSetting) => void
}) {
   const { label, value, onChange } = props
   const failure = getServicePoint(value.id)?.failure

   const providers = useAsyncMemo(
      () => fetchComponentsPublications(value.providers)
      , [], [value.providers]
   )

   return <div className={failure ? "slds-form-element slds-has-error" : "slds-form-element"}>
      <label className="slds-form-element__label">
         {label || value.id}
      </label>
      <div className="slds-form-element__control">
         <div className="slds-input">
            <ServicePointEditable
               servicePoint={value}
               providers={providers}
               onChange={onChange}
            />
         </div>
         {failure && <div className="slds-form-element__help" id="error-id">{failure.message}</div>}
      </div>
   </div>
}

export function ServicePointsConfigurator(props: {
   showAll?: boolean
}) {
   const { showAll } = props
   const settings = getSettings()
   const [_, forceUpdate] = useState(null)
   const list = []

   useEffect(() => {
      const handler = listenSettings((group) => {
         if (group === "service_points") {
            forceUpdate({})
         }
      })
      return () => unlistenSettings(handler)
   }, [])

   const onChange = (id: string) => (descriptor: ServicePointSetting) => {
      settings.set("service_points", id, descriptor)
   }

   for (const id of settings.list("service_points")) {
      if (showAll || ServicePoints.has(id)) {
         const desc = settings.get("service_points", id)
         list.push(<ServicePointInput
            key={id}
            label={desc.properties?.title || id}
            value={desc}
            onChange={onChange(id)}
         />)
      }
   }

   return <>
      {list}
   </>
}
