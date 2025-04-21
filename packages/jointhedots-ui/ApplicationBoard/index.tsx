import { getViewReferenceFrom, getViewInfosFrom, gotoURLView, MapLike, ServicePoint, ViewInfos, createComponentFilter, ComponentPublication, acquireServicePoint } from "@jointhedots/core"
import { NavBar } from './NavBar'
import { Button } from 'react-lightning-design-system'
import { Box, Grid, NavigationBeacon, SLDSPage } from './Utils'
import { InvokeView, useAsyncMemo, useCurrentView, useLocationHash, UseServicePoints } from '@jointhedots/core/react'
import "@salesforce-ux/design-system/assets/styles/salesforce-lightning-design-system.min.css"
import { ApplicationSettings } from "./Settings"
import { ViewRequirements } from "@jointhedots/core/services"
import { useMemo } from "react"
import { ComponentsFilteredList } from "../ComponentsLibrary"

export type AppPage = {
   icon?: string
   view?: string | ViewInfos
   description?: string
   pages?: MapLike<AppPage>
}

export type BaseTooling = {
   type: string
   anchor: "status" | "menu"
   icon?: string
}

export type ServicePointTooling = BaseTooling & {
   type: "servicePoint"
   id: string
}

export type LinkTooling = BaseTooling & {
   type: "link"
   title?: string
   url?: string
   view?: string | ViewInfos
}

export type NotificationsTooling = BaseTooling & {
   type: "notifications"
}

export type AppTooling = ServicePointTooling | LinkTooling | NotificationsTooling

export type AppDescriptor = {
   title?: string
   pages?: MapLike<AppPage>
   landingPage?: AppPage
   toolings?: AppTooling[]
   requirements?: ViewRequirements
}

export function ApplicationPage(props: {
   title?: string
   page: AppPage
   origin: ViewInfos
}) {
   const { title, page, origin } = props
   if (page.view) {
      return <Box sx={{ backgroundColor: 'white', minHeight: '90vh', mt: 1 }}>
         <InvokeView view={page.view} />
      </Box>
   }
   if (page.pages) {
      return <Box className='container'>
         {title}
         <Box sx={{ height: "400px", m: 2, textAlign: 'center' }} >
            <Grid container spacing={2}>
               {Object.keys(page.pages).map((title) => {
                  const entry = page.pages[title]
                  return <Grid item md={4}>
                     <SLDSPage title={title} minHeight="150px">
                        <p>{page.description}</p>
                        {entry.view && <Button type='brand' onClick={() => gotoURLView(entry.view, origin)}>
                           Try it
                        </Button>}
                     </SLDSPage>
                  </Grid>
               })}
            </Grid>
         </Box>
      </Box>
   }
   return <div className='container'>
      {title}
   </div>
}


export function ApplicationBoard(props: {
   descriptor: AppDescriptor
   placeholder?: React.ReactNode
}) {
   const { placeholder, descriptor } = props
   const { landingPage, requirements } = descriptor
   const hash = useLocationHash()
   const origin = useCurrentView()
   const displayed = origin?.nested || getViewInfosFrom(landingPage?.view) || getViewInfosFrom(hash)
   const active = getViewReferenceFrom(displayed)
   const services = useAsyncMemo(async () => {
      const services = [] as ServicePoint[]
      for (const id in requirements?.servicePoints) {
         services.push(acquireServicePoint(id))
      }
      return services
   }, [], [requirements])

   let content = null
   if (!displayed) {
      content = <>{placeholder}</>
   }
   else if (displayed.name === "settings") {
      content = <ApplicationSettings />
   }
   else {
      content = <NavigationBeacon component_id={displayed.name}>
         <Box sx={{ backgroundColor: 'white', minHeight: '90vh', mt: 1 }}>
            <UseServicePoints requirements={requirements} configurator={null}>
               <InvokeView view={displayed} />
            </UseServicePoints>
         </Box>
      </NavigationBeacon>
   }

   return (<UseServicePoints requireds={services} configurator={null}>
      <NavBar descriptor={props.descriptor} active={active} origin={origin} />
      {content}
   </UseServicePoints>)
}

export function ApplicationSelector() {
   const filter = useMemo(() => createComponentFilter({
      services: ["view.react"],
      types: ["jtd:application.board.component"]
   }), [])
   const onGoto = (infos: ComponentPublication) => {
      gotoURLView({ name: infos.component_id })
   }
   return <div className="slds-grid slds-grid_vertical-align-center slds-grid_align-center" style={{ minWidth: "100vw", minHeight: "100vh" }}>
      <div className="slds-box">
         <div style={{ fontSize: "130%", paddingLeft: 5, marginBottom: 10, borderBottom: "solid thin #0005" }}>
            <span>Choose an application</span>
            {/*  <LabelButton icon="bi:person-gear" name="Configuration" onActivate={() => {
               gotoURLView({ name: "settings" }, origin)
            }} /> */}
         </div>
         <ComponentsFilteredList filter={filter} onSelect={onGoto} />
      </div>
   </div>
}
