import { useCallback, useEffect, useState } from "react"
import openContextualMenu from "../openContextualMenu"
import { ServicePointDescriptor, ServicePoint, ServicePoints, getServicePoint, } from "../../library/services"
import { ItemIcon, ItemRowRich, ItemRowShort, LabelButton } from "../items"
import { Button } from "react-lightning-design-system"
import { ComponentPublication, ComponentsRegistry, fetchComponentsPublications, gotoURLView, MapLike } from "@sf-explorer/core"
import { useAsyncMemo } from "../useAsyncMemo"
import { AddComponentButton } from "./Components"
import { useAsyncState } from "@sf-explorer/editors/hooks/useAsyncState"
import { ComponentItem, ComponentItemDisplay } from "./ComponentsBrowser"


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
}) {
   const { cnx, selected, onSelect } = props
   return <ComponentItem
      entry={cnx}
      selected={selected}
      display={service_display}
      onSelect={onSelect && (() => onSelect(cnx))}
   />
}

function switchServiceConnexion(service: ServicePointDescriptor, id: string): ServicePointDescriptor {
   if (getServicePoint(service.id)?.multiple) {
      let connexions = [...service.connexions]
      let index = connexions.indexOf(id)
      if (index < 0) {
         connexions.push(id)
      }
      else {
         connexions.splice(index, 1)
      }
      return ({
         ...service,
         connexions,
      })
   }
   else {
      return ({
         ...service,
         connexions: [id],
      })
   }
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
      const connections = await provider.search_component_publications(null, [servicePoint.service])

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

   return <div>
      <div>
         <AddComponentButton />
         <LabelButton icon="bi:person-gear" name="Configuration" onActivate={() => {
            gotoURLView({ name: "sfe.settings" })
         }} />
      </div>
      {status.waiting(({ connections, remains }) => {
         return <>
            {servicePoint.connexions.map((id, i) => {
               const cnx = connections.find(cnx => cnx.component_id === id)
               return cnx && <ServiceConnexionItem
                  key={i}
                  cnx={cnx}
                  selectable={selectable}
                  selected={true}
                  onSelect={onSwitch}
               />
            })}
            {remains.map((cnx, i) => {
               return <ServiceConnexionItem
                  key={i}
                  cnx={cnx}
                  selectable={selectable}
                  selected={false}
                  onSelect={onSwitch}
               />
            })}
         </>
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

   if (servicePoint.connexions.length === 0) {
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
   const [descriptor, setDescriptor] = useState(servicePoint.descriptor)
   useEffect(() => {
      const l = servicePoint.listen(s => setDescriptor(s.descriptor))
      return () => servicePoint.unlisten(l)
   }, [servicePoint])
   return descriptor
}

export function ServicePointStatus(props: {
   servicePoint: ServicePoint
}) {
   const { servicePoint } = props
   const descriptor = useServiceDescriptor(servicePoint)

   const connexions = useAsyncMemo(
      () => fetchComponentsPublications(descriptor.connexions)
      , [], [descriptor.connexions]
   )

   const onChange = (descriptor: ServicePointDescriptor) => {
      servicePoint.dispatch(descriptor)
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
   onChange: (value: ServicePointDescriptor) => void
   disabled?: boolean
}) {
   const { label, value, onChange } = props

   const connexions = useAsyncMemo(
      () => fetchComponentsPublications(value.connexions)
      , [], [value.connexions]
   )

   return <div>
      <div className="slds-form-element">

         {/* Label */}
         <label
            className={"slds-form-element__label"}
         >
            {label || value.id}
         </label>

         {/* Input */}
         <div className="slds-form-element__control">
            <div className="slds-input" >
               <ServicePointEditable
                  servicePoint={value}
                  connexions={connexions}
                  onChange={onChange}
               /></div>
         </div>

      </div>
   </div>
}

export function ServicePointsConfigurator() {
   const list = []
   for (const servicePoint of ServicePoints.values()) {
      const descriptor = useServiceDescriptor(servicePoint)
      const onChange = (descriptor: ServicePointDescriptor) => {
         servicePoint.dispatch(descriptor)
      }
      list.push(<ServicePointInput
         key={servicePoint.id}
         label={servicePoint.id}
         value={descriptor}
         onChange={onChange}
      />)
   }
   return <>
      {list}
   </>
}
