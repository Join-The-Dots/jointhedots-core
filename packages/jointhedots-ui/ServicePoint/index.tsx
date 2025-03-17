import React, { useCallback, useEffect, useState } from "react"
import openContextualMenu from "../openContextualMenu"
import {
   ServicePointDescriptor, ServicePoint,
   ComponentPublication, ComponentsRegistry, fetchComponentsPublications,
   createComponentFilter, ServiceSettings, dispatchServicePointSetting,
   listenServicePoints, unlistenServicePoints, dispatchServicesSettings,
   listenServiceSettings, unlistenServiceSettings,
} from "@jointhedots/core"
import { ItemIcon, ItemRowShort, LabelDecoration } from "../Items"
import { Button, ModalContent, ModalHeader, Spinner } from "react-lightning-design-system"
import { MissingServiceError, registerErrorDisplayer, ServicePointsProviderContext, useAsyncMemo, useAsyncState, useServicesProvider } from "@jointhedots/core/react"
import { AddComponentButton, ComponentItem, ComponentItemDisplay, CreateComponentSelector } from "../ComponentsLibrary"
import { ViewRequirements } from "@jointhedots/core/services"

import { blue, cyan, deepOrange, green, pink, purple, deepPurple, orange } from '@mui/material/colors'
import { IconButton } from "../Icon"

export const DefaultColorsMap = [green, pink, blue, cyan, deepOrange, purple, deepPurple, orange].map(x => x["A700"])

const service_display: ComponentItemDisplay = {
   grouped: false,
   small: false,
   allowEdit: true,
   allowDelete: false,
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

function switchServiceConnexion(service: ServicePointDescriptor, multiple: boolean, id: string): ServicePointDescriptor {
   let connexions = [...service.connexions]
   if (multiple) {
      let index = connexions.indexOf(id)
      if (index < 0) {
         connexions.push(id)
      }
      else {
         connexions.splice(index, 1)
      }
   }
   else {
      if (service.connexions?.[0] === id) {
         connexions = []
      }
      else {
         connexions = [id]
      }
   }
   return ({
      ...service,
      connexions,
   })
}

function selectServiceConnexion(service: ServicePointDescriptor, multiple: boolean, id: string): ServicePointDescriptor {
   let connexions = [...service.connexions]
   if (multiple) {
      let index = connexions.indexOf(id)
      if (index >= 0) {
         connexions.splice(index, 1)
      }
      connexions.unshift(id)
   }
   else {
      connexions = [id]
   }
   return ({
      ...service,
      connexions,
   })
}

function ServiceConnexionSelector(props: {
   servicePoint: ServicePointDescriptor
   multiple: boolean
   selectable?: boolean
   colormap?: any[]
   onChange: (service: ServicePointDescriptor) => void
}) {
   const { servicePoint, selectable, multiple, colormap, onChange } = props

   const status = useAsyncState<{
      connections: ComponentPublication[]
      remains: ComponentPublication[]
   }>(async () => {
      const [service, _name] = servicePoint.id.split("/")
      const provider = ComponentsRegistry.components_provider
      const filter = createComponentFilter({ services: [service] })
      const connections = await provider.search_component_publications(filter)

      const remains = []
      for (const cnx of connections) {
         if (cnx && !servicePoint.connexions.includes(cnx.component_id) && cnx.services.includes(service)) {
            remains.push(cnx)
         }
      }

      return { connections, remains }
   }, [servicePoint], null)

   const onSwitch = (data: ComponentPublication) => {
      onChange(switchServiceConnexion(servicePoint, multiple, data.component_id))
   }

   const onActivate = (data: ComponentPublication) => {
      onChange(selectServiceConnexion(servicePoint, multiple, data.component_id))
   }

   return <div>
      {status.waiting(({ connections, remains }) => {
         const [service, _name] = servicePoint.id.split("/")
         if (connections.length === 0 && remains.length === 0) {
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
               {servicePoint.connexions.map((id, i) => {
                  const cnx = connections.find(cnx => cnx.component_id === id)
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
   servicePoint: ServicePointDescriptor
   connexions: ComponentPublication[]
   colormap?: any[]
   compact?: boolean
   onChange: (service: ServicePointDescriptor) => void
}) {
   const { servicePoint, compact, connexions, colormap, onChange } = props
   const multiple = true//servicePoint?.multiple

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
   else if (servicePoint.connexions.length === 0) {
      return <Button onClick={onClick}>
         Connect
      </Button>
   }
   else {
      const ItemComp = compact ? ItemIcon : ItemRowShort
      return <Button onClick={onClick}>
         {connexions.map((cnx, i) => {
            const deco: LabelDecoration[] = colormap && [{ type: "shape", color: colormap[i] }]
            return <ItemComp key={cnx.component_id} name={cnx.title} icon={cnx.icon} decorations={deco} />
         })}
         {multiple && !compact && <IconButton name="bi:plus-circle" onClick={onClick} />}
      </Button>
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

   const connexions = useAsyncMemo(
      () => fetchComponentsPublications(descriptor?.connexions)
      , [], [descriptor]
   )

   const onChange = (descriptor: ServicePointDescriptor) => {
      dispatchServicePointSetting(servicePoint.id, descriptor)
   }

   return <ServicePointEditable compact
      colormap={connexions.length > 1 ? DefaultColorsMap : undefined}
      servicePoint={descriptor}
      connexions={connexions}
      onChange={onChange}
   />
}


export function ServicePointInput(props: {
   value: ServicePointDescriptor
   label?: string
   type?: string
   errorMessage?: string
   required?: boolean
   disabled?: boolean
   onChange: (value: ServicePointDescriptor) => void
}) {
   const { label, value, onChange } = props

   const connexions = useAsyncMemo(
      () => fetchComponentsPublications(value.connexions)
      , [], [value.connexions]
   )

   return <div className="slds-form-element">
      <label className="slds-form-element__label">
         {label || value.id}
      </label>
      <div className="slds-form-element__control">
         <div className="slds-input">
            <ServicePointEditable
               servicePoint={value}
               connexions={connexions}
               onChange={onChange}
            />
         </div>
      </div>
   </div>
}

export function ServicePointsConfigurator() {
   const [servicePoints, setServicePoints] = useState(ServiceSettings.servicePoints)
   useEffect(() => {
      const handler = listenServiceSettings((settings) => {
         setServicePoints(settings.servicePoints)
      })
      return () => unlistenServiceSettings(handler)
   }, [])
   const list = []
   for (const id in ServiceSettings.servicePoints) {
      const descriptor = ServiceSettings.servicePoints[id]
      const onChange = (descriptor: ServicePointDescriptor) => {
         dispatchServicePointSetting(id, descriptor)
      }
      list.push(<ServicePointInput
         key={id}
         label={id}
         value={descriptor}
         onChange={onChange}
      />)
   }
   return <>
      {list}
   </>
}

export type ServiceConfiguratorComponent = React.ComponentType<{
   services: ServicePoint[]
}>

export function UseServicePoints(props: {
   requireds?: ServicePoint[]
   requirements?: ViewRequirements
   configurator?: ServiceConfiguratorComponent
   children: any
}) {
   const { requireds, requirements, children } = props
   const result = useServicesProvider(requireds, requirements)
   if (!result) {
      return <Spinner />
   }
   else if (result instanceof MissingServiceError) {
      const ServiceConfigurator = props.configurator || DefaultServiceConfigurator
      return <ServiceConfigurator services={result.missings} />
   }
   else {
      return <ServicePointsProviderContext.Provider value={result}>
         {children}
      </ServicePointsProviderContext.Provider>
   }
}

function DefaultServiceConfigurator(props: {
   services: ServicePoint[]
   onApply?: () => void
}) {
   const { services, onApply } = props
   const [descriptors, setDescriptors] = useState(() => {
      return services.reduce((prev, svc) => {
         prev[svc.id] = svc.descriptor
         return prev
      }, {})
   })
   const list = []
   for (const id in descriptors) {
      const descriptor = descriptors[id]
      const onChange = (descriptor: ServicePointDescriptor) => {
         setDescriptors({ ...descriptors, [id]: descriptor })
      }
      list.push(<ServicePointInput
         key={id}
         label={id}
         value={descriptor}
         onChange={onChange}
      />)
   }
   const apply = useCallback(async () => {
      dispatchServicesSettings({
         ...ServiceSettings,
         servicePoints: {
            ...ServiceSettings?.servicePoints,
            ...descriptors,
         }
      })
      for (const scv of services) {
         await scv.fetch()
      }
      onApply?.()
   }, [onApply, descriptors])
   return <div style={{ padding: 10, maxWidth: 400, margin: "auto" }}>
      <ModalHeader title="Following services are required" />
      <ModalContent className="slds-p-around_large">
         {list}
      </ModalContent>
      {<Button type="brand" onClick={apply}>
         {"Apply"}
      </Button>}
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
