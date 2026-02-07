
import React, { useContext, useEffect, useMemo, useState, type ReactElement } from "react"
import { ErrorDisplayer } from "./ErrorBoundary"
import { evaluateViewInfos, getViewInfosFrom, ViewServiceKey, type ViewInfos } from "../view/interface"
import { useLocationHash } from "./useLocation"
import { UseServicePoints } from "./useServices"
import { ViewReactKey } from "./interface"

const ViewStackContext = React.createContext<ViewInfos>(null)

async function renderViewDescriptor(infos: ViewInfos, origin?: string, fallback?: ReactElement): Promise<ReactElement> {
   if (infos) {
      try {
         const { component, properties } = await evaluateViewInfos(infos, origin)
         const schema = ViewServiceKey.spec(component)
         const View = await ViewReactKey.fetch(component)
         if (!View) throw new Error(`Component '${infos.name}' has no 'view.react' service`)

         // Render view
         let content = <ViewStackContext.Provider value={infos}>
            <View {...properties} />
         </ViewStackContext.Provider>

         // Wrap view with service providing
         if (schema?.requirements) {
            content = <UseServicePoints requirements={schema?.requirements} configurator={null}>
               {content}
            </UseServicePoints>
         }

         return content
      }
      catch (e) {
         return <ErrorDisplayer error={e} />
      }
   }
   return fallback
}

export function useCurrentView() {
   return useContext(ViewStackContext)
}

export function InvokeView(props: {
   view: string | ViewInfos
   origin?: string
   fallback?: ReactElement
}) {
   const { view, origin, fallback } = props
   const [displayed, setDisplayed] = useState<ReactElement>(null)
   const infos = useMemo(() => {
      if (typeof view !== "string") return view
      else return getViewInfosFrom(view)
   }, [view])
   useEffect(() => {
      renderViewDescriptor(infos, origin, fallback).then(setDisplayed)
   }, [infos])
   if (displayed) return displayed
   else return null
}

export function InvokeUrlHashView(props: { hash: string, fallback?: ReactElement }) {
   const { hash, fallback } = props
   const view = useMemo(() => getViewInfosFrom(hash), [hash])
   return <InvokeView view={view} origin="url" fallback={fallback} />
}

export function InvokeURLView(props: { fallback?: ReactElement }) {
   const hash = useLocationHash()
   return <InvokeUrlHashView hash={hash} fallback={props.fallback} />
}

export function InvokeNestedView(props: { fallback?: ReactElement }) {
   const view = useCurrentView()
   if (!view) {
      return <InvokeURLView fallback={props.fallback} />
   }
   else if (view?.nested) {
      return <InvokeView view={view?.nested} origin="url" fallback={props.fallback} />
   }
   else {
      return props.fallback || null
   }
}
