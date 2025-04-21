import React, { useCallback, useEffect, useState } from "react"
import { openContextualMenu } from "../Layouts"
import {
   ServicePointSetting, ServicePoint,
   ComponentPublication, ComponentsRegistry, fetchComponentsPublications,
   createComponentFilter, listenServicePoints, unlistenServicePoints,
   failedComponentPublication, ServicePoints, getServicePoint,
   getSettings, listenSettings, unlistenSettings,
   acquireComponent,
} from "@jointhedots/core"
import { ItemIcon, ItemRowShort, LabelDecoration } from "../Items"
import { Button } from "react-lightning-design-system"
import { ErrorDisplayer, useAsyncMemo, useAsyncState } from "@jointhedots/core/react"
import { AddComponentButton, ComponentItem, ComponentItemDisplay, CreateComponentSelector } from "../ComponentsLibrary"
import { IconButton } from "../Icon"

import { blue, cyan, deepOrange, green, pink, purple, deepPurple, orange } from '@mui/material/colors'
import { useNotificationInfos, useNotifications } from "../Notifications"

export const DefaultColorsMap = [green, pink, blue, cyan, deepOrange, purple, deepPurple, orange].map(x => x["A700"])

const service_display: ComponentItemDisplay = {
   grouped: false,
   small: false,
   allowEdit: true,
   allowDelete: true,
}

function ServiceConnexionItem(props: {
   cnx: ComponentPublication
   selected?: boolean
   selectable?: boolean
   onSelect?: (cnx: ComponentPublication) => void
   onActivate?: (cnx: ComponentPublication) => void
}) {
   const { cnx, selected, onSelect, onActivate } = props
   return <ComponentItem
      entry={cnx}
      selected={selected}
      display={service_display}
      onSelect={onSelect && (() => onSelect(cnx))}
      onActivate={onActivate && (() => onActivate(cnx))}
   />
}

function switchServiceConnexion(service: ServicePointSetting, multiple: boolean, id: string): ServicePointSetting {
   let providers = [...service.providers]
   if (multiple) {
      let index = providers.indexOf(id)
      if (index < 0) {
         providers.push(id)
      }
      else {
         providers.splice(index, 1)
      }
   }
   else {
      if (service.providers?.[0] === id) {
         providers = []
      }
      else {
         providers = [id]
      }
   }
   return ({
      ...service,
      providers,
   })
}

function selectServiceConnexion(service: ServicePointSetting, multiple: boolean, id: string): ServicePointSetting {
   let providers = [...service.providers]
   if (multiple) {
      let index = providers.indexOf(id)
      if (index >= 0) providers[index] = providers[0]
      providers[0] = id
   }
   else {
      providers = [id]
   }
   return ({
      ...service,
      providers,
   })
}

function ServiceConnexionSelector(props: {
   servicePoint: ServicePointSetting
   multiple: boolean
   selectable?: boolean
   colormap?: any[]
   onChange: (service: ServicePointSetting) => void
}) {
   const { servicePoint, selectable, multiple, colormap, onChange } = props

   const status = useAsyncState<{
      providers: ComponentPublication[]
      remains: ComponentPublication[]
   }>(async () => {
      const [service, _name] = servicePoint.id.split("/")
      const provider = ComponentsRegistry.components_provider
      const filter = createComponentFilter({ services: [service] })
      const providers = await provider.search_component_publications(filter)

      const remains = []
      for (const cnx of providers) {
         if (cnx && !servicePoint.providers.includes(cnx.component_id) && cnx.services.includes(service)) {
            remains.push(cnx)
         }
      }

      for (const cnx_id of servicePoint.providers) {
         if (!providers.find(cnx => cnx.component_id === cnx_id)) {
            providers.push(failedComponentPublication(cnx_id))
         }
      }

      return { providers, remains }
   }, [servicePoint], null)

   const onSwitch = (data: ComponentPublication) => {
      onChange(switchServiceConnexion(servicePoint, multiple, data.component_id))
   }

   const onActivate = (data: ComponentPublication) => {
      onChange(selectServiceConnexion(servicePoint, multiple, data.component_id))
   }

   return <div>
      {status.waiting(({ providers, remains }) => {
         const [service, _name] = servicePoint.id.split("/")
         if (providers.length === 0 && remains.length === 0) {
            return <CreateComponentSelector
               service={service}
               onCreate={onActivate}
            />
         }
         else {
            return <>
               <div>
                  <AddComponentButton service={service} onCreate={onActivate} />
               </div>
               {servicePoint.providers.map((id, i) => {
                  const cnx = providers.find(cnx => cnx.component_id === id)
                  return cnx && <div key={i}
                     style={colormap && { "--item-shape-color": colormap[i] || "red" } as any}
                  >
                     <ServiceConnexionItem
                        cnx={cnx}
                        selectable={selectable}
                        selected={true}
                        onSelect={onSwitch}
                        onActivate={onActivate}
                     />
                  </div>
               })}
               {remains.map((cnx, i) => {
                  return <div key={i}>
                     <ServiceConnexionItem
                        cnx={cnx}
                        selectable={selectable}
                        selected={false}
                        onSelect={onSwitch}
                        onActivate={onActivate}
                     />
                  </div>
               })}
            </>
         }
      })}
   </div>
}

function ServicePointEditable(props: {
   servicePoint: ServicePointSetting
   providers: ComponentPublication[]
   colormap?: any[]
   compact?: boolean
   onChange: (service: ServicePointSetting) => void
}) {
   const { servicePoint, compact, providers, colormap, onChange } = props
   const multiple = true//servicePoint?.multiple
   useNotificationInfos()

   const logstats = useNotifications(
      () => providers.map((item) => acquireComponent(item.component_id).getLogStats())
      , [providers]
   )

   const onClick = useCallback((e) => {
      openContextualMenu(e, (close) => {
         return <ServiceConnexionSelector
            servicePoint={servicePoint}
            multiple={multiple}
            colormap={colormap}
            onChange={(data) => close(onChange(data))}
         />
      })
   }, [servicePoint, colormap])

   if (!servicePoint) {
      return <Button type="destructive">
         Invalid service point
      </Button>
   }
   else if (servicePoint.providers.length === 0) {
      return <Button onClick={onClick}>
         Connect
      </Button>
   }
   else {
      const ItemComp = compact ? ItemIcon : ItemRowShort
      return <div className="slds-button" onClick={onClick}>
         {providers.map((cnx, i) => {
            const deco: LabelDecoration[] = []
            const error_count = logstats?.[i]?.error_count || 0
            if (colormap) deco.push({ type: "shape", color: colormap[i] })
            if (error_count > 0) deco.push({ type: "badge", name: "bi:exclamation-triangle-fill" })
            return <ItemComp
               key={cnx.component_id}
               name={cnx.title}
               icon={cnx.icon}
               decorations={deco}
            />
         })}
         {multiple && !compact && <IconButton name="bi:plus-circle" onClick={onClick} />}
      </div>
   }
}

function useServiceDescriptor(servicePoint: ServicePoint) {
   const [descriptor, setDescriptor] = useState(servicePoint?.descriptor)
   useEffect(() => {
      if (servicePoint) {
         const handler = listenServicePoints(s => {
            if (s === servicePoint) setDescriptor(s.descriptor)
         })
         return () => unlistenServicePoints(handler)
      }
      return null
   }, [servicePoint])
   return descriptor
}

export function ServicePointStatus(props: {
   servicePoint: ServicePoint
}) {
   const { servicePoint } = props
   const descriptor = useServiceDescriptor(servicePoint)

   const providers = useAsyncMemo(
      () => fetchComponentsPublications(descriptor?.providers)
      , [], [descriptor]
   )

   const onChange = (descriptor: ServicePointSetting) => {
      getSettings().set("service_points", servicePoint.id, descriptor)
   }

   return <ServicePointEditable compact
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

   return <div className="slds-form-element">
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
            {failure && <ErrorDisplayer error={failure} />}
         </div>
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
