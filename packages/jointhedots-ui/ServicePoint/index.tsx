import React, { useCallback, useEffect, useState } from "react"
import openContextualMenu from "../openContextualMenu"
import {
   ServicePointDescriptor, ServicePoint, getServicePoint,
   ComponentPublication, ComponentsRegistry, fetchComponentsPublications,
   createComponentFilter, ServiceSettings, dispatchServicePointSetting,
   listenServicePoints, unlistenServicePoints, dispatchServicesSettings,
   listenServiceSettings, unlistenServiceSettings,
} from "@jointhedots/core"
import { ItemIcon, ItemRowShort } from "../Items"
import { Button, ModalContent, ModalHeader, Spinner } from "react-lightning-design-system"
import { MissingServiceError, registerErrorDisplayer, ServicePointsProviderContext, useAsyncMemo, useAsyncState, useServicesProvider } from "@jointhedots/core/react"
import { AddComponentButton, ComponentItem, ComponentItemDisplay, CreateComponentSelector } from "../ComponentsLibrary"
import { ViewRequirements } from "@jointhedots/core/services"

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

function switchServiceConnexion(service: ServicePointDescriptor, id: string): ServicePointDescriptor {
   const servicePoint = getServicePoint(service.id)
   let connexions = [...service.connexions]
   if (servicePoint?.multiple) {
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

function selectServiceConnexion(service: ServicePointDescriptor, id: string): ServicePointDescriptor {
   const servicePoint = getServicePoint(service.id)
   let connexions = [...service.connexions]
   if (servicePoint?.multiple) {
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
   selectable?: boolean
   onChange: (service: ServicePointDescriptor) => void
}) {
   const { servicePoint, selectable, onChange } = props

   const status = useAsyncState<{
      connections: ComponentPublication[]
      remains: ComponentPublication[]
   }>(async () => {
      const provider = ComponentsRegistry.components_provider
      const filter = createComponentFilter({ services: [servicePoint.service] })
      const connections = await provider.search_component_publications(filter)

      const remains = []
      for (const cnx of connections) {
         if (cnx && !servicePoint.connexions.includes(cnx.component_id) && cnx.services.includes(servicePoint.service)) {
            remains.push(cnx)
         }
      }

      return { connections, remains }
   }, [servicePoint], null)

   const onSwitch = (data: ComponentPublication) => {
      onChange(switchServiceConnexion(servicePoint, data.component_id))
   }

   const onActivate = (data: ComponentPublication) => {
      onChange(selectServiceConnexion(servicePoint, data.component_id))
   }

   return <div>
      {status.waiting(({ connections, remains }) => {
         const { service } = servicePoint
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
                  return cnx && <ServiceConnexionItem
                     key={i}
                     cnx={cnx}
                     selectable={selectable}
                     selected={true}
                     onSelect={onSwitch}
                     onActivate={onActivate}
                  />
               })}
               {remains.map((cnx, i) => {
                  return <ServiceConnexionItem
                     key={i}
                     cnx={cnx}
                     selectable={selectable}
                     selected={false}
                     onSelect={onSwitch}
                     onActivate={onActivate}
                  />
               })}
            </>
         }
      })}
   </div>
}

function ServicePointEditable(props: {
   servicePoint: ServicePointDescriptor
   connexions: ComponentPublication[]
   compact?: boolean
   onChange: (service: ServicePointDescriptor) => void
}) {
   const { servicePoint, compact, connexions, onChange } = props

   const onClick = useCallback((e) => {
      openContextualMenu(e, (close) => {
         return <>
            <ServiceConnexionSelector
               servicePoint={servicePoint}
               onChange={(data) => close(onChange(data))}
            />
         </>
      })
   }, [servicePoint])

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
   else if (compact) {
      return <Button onClick={onClick}>
         {connexions.map((cnx) => {
            return <ItemIcon key={cnx.component_id} name={cnx.title} icon={cnx.icon} />
         })}
      </Button>
   }
   else {
      return <Button onClick={onClick}>
         {connexions.map((cnx) => {
            return <ItemRowShort key={cnx.component_id} name={cnx.title} icon={cnx.icon} />
         })}
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
