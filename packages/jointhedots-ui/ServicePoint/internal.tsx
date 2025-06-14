import { useCallback, useEffect, useState } from "react"
import {
   ServicePointSetting, ServicePoint,
   ComponentPublication, ComponentsRegistry,
   createComponentFilter, listenServicePoints, unlistenServicePoints,
   failedComponentPublication, acquireComponent,
} from "@jointhedots/core"
import { ItemIcon, ItemRowShort, LabelDecoration, LabelSelected } from "../Items"
import { useAsyncState } from "@jointhedots/core/react"
import { NewComponentButton, ComponentItem, ComponentItemDisplay, CreateComponentSelector } from "../ComponentsLibrary"
import { Button } from "../Inputs"

import { useNotificationInfos, useNotifications } from "../Notifications"
import { openContextualMenu, Stack } from "../Layouts"
import { Popup } from "../Layouts/Popup"
import { ComponentCard } from "../ComponentsLibrary/ComponentsInfos"
import { ButtonGroup } from "@salesforce/design-system-react"

const service_display: ComponentItemDisplay = {
   grouped: false,
   small: false,
   allowEdit: true,
   allowDelete: true,
}

export function ServiceConnexionItem(props: {
   cnx: ComponentPublication
   selected?: LabelSelected
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

export function switchServiceConnexion(service: ServicePointSetting, multiple: boolean, id: string): ServicePointSetting {
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

export function selectServiceConnexion(service: ServicePointSetting, multiple: boolean, id: string): ServicePointSetting {
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

export function ServiceConnexionSelector(props: {
   servicePoint: ServicePointSetting
   multiple: boolean
   colormap?: any[]
   hasSelectMode?: boolean
   onChange: (service: ServicePointSetting) => void
}) {
   const { servicePoint, hasSelectMode, multiple, colormap, onChange } = props
   const [edited, setEdited] = useState(false)

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
            return <Stack vertical>
               {servicePoint.providers.map((id, i) => {
                  const cnx = providers.find(cnx => cnx.component_id === id)
                  return cnx && <div key={i}
                     style={colormap && { "--item-shape-color": colormap[i] || "red" } as any}
                  >
                     <ServiceConnexionItem
                        cnx={cnx}
                        selectable={edited && hasSelectMode}
                        selected={edited ? LabelSelected.EnabledEditable : LabelSelected.Enabled}
                        onSelect={onSwitch}
                        onActivate={onActivate}
                     />
                  </div>
               })}
               {remains.map((cnx, i) => {
                  return <div key={i}>
                     <ServiceConnexionItem
                        cnx={cnx}
                        selectable={edited && hasSelectMode}
                        selected={edited ? LabelSelected.DisabledEditable : LabelSelected.Disabled}
                        onSelect={onSwitch}
                        onActivate={onActivate}
                     />
                  </div>
               })}
               {hasSelectMode
                  ? <ButtonGroup>
                     <NewComponentButton
                        label="New Connexion"
                        service={service}
                        onCreate={onActivate}
                     />
                     <Button
                        style={{ flex: 1 }}
                        icon="bi:pencil-square"
                        label="Selection"
                        variant={edited ? "brand" : undefined}
                        onClick={() => setEdited(!edited)}
                     />
                  </ButtonGroup>
                  : <NewComponentButton
                     label="New Connexion"
                     service={service}
                     onCreate={onActivate}
                  />
               }
            </Stack>
         }
      })}
   </div>
}

export function ServicePointEditable(props: {
   servicePoint: ServicePointSetting
   providers: ComponentPublication[]
   colormap?: any[]
   compact?: boolean
   hasSelectMode?: boolean,
   onChange: (service: ServicePointSetting) => void
}) {
   const { servicePoint, compact, providers, colormap, hasSelectMode, onChange } = props

   const logstats = useNotifications(() => {
      return providers.map((item) => acquireComponent(item.component_id).getLogStats())
   }, [providers])

   const onClick = useCallback((e) => {
      openContextualMenu(e, (close) => {
         return <ServiceConnexionSelector
            servicePoint={servicePoint}
            multiple={true}
            colormap={colormap}
            hasSelectMode={hasSelectMode}
            onChange={(data) => close(onChange(data))}
         />
      })
   }, [servicePoint, colormap])

   const onPopup = useCallback(async (cnx: ComponentPublication) => {
      return <div>
         <ItemRowShort
            key={cnx.component_id}
            name={cnx.title}
            icon={cnx.icon}
         />
         <ComponentCard entry={cnx} />
      </div>
   }, [servicePoint])

   if (!servicePoint) {
      return <Button variant="destructive">
         Invalid service point
      </Button>
   }
   else if (providers.length === 0) {
      return <Button variant="base" onClick={onClick}>
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
            return <Popup content={onPopup} data={cnx}>
               <ItemComp
                  key={cnx.component_id}
                  name={cnx.title}
                  icon={cnx.icon}
                  decorations={deco}
               />
            </Popup>
         })}
         {/* multiple && !compact && <IconButton icon="bi:plus-circle" onClick={onClick} /> */}
      </div>
   }
}

export function useServiceDescriptor(servicePoint: ServicePoint) {
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
