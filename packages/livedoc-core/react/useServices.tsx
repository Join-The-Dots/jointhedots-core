import React, { useEffect, useState } from "react"
import { ServiceInterface, ServicePoint } from "../library/services"
import { useAsyncMemo } from "./useAsyncMemo"

type ServicePointsMap = Map<ServicePoint, ServiceInterface[]>

const ServicePointsContext: React.Context<ServicePointsMap> = React.createContext(null)

export function useServices<IService extends ServiceInterface>(servicePoint: ServicePoint<IService>): IService[] {
   const mapping = React.useContext(ServicePointsContext)
   if (mapping) {
      return mapping.get(servicePoint) as IService[]
   }
   else {
      console.error("Wrap in <MountServicePoints> before using service point:", servicePoint.id)
      return null
   }
}

export function useService<IService extends ServiceInterface>(servicePoint: ServicePoint<IService>): IService {
   return useServices(servicePoint)?.[0]
}

export function MountServicePoints(props: {
   services: ServicePoint[]
   children: React.ReactNode
}) {
   const { services, children } = props
   const [status, forceUpdate] = useState(null)
   const mapping = useAsyncMemo(async () => {
      const mapping = new Map<ServicePoint, ServiceInterface[]>()
      for (const srv of services) {
         mapping.set(srv, await srv.fetch())
      }
      return mapping
   }, null, [services, status])
   useEffect(() => {
      const l = () => {
         forceUpdate({})
      }
      services.forEach(s => s.listen(l))
      return () => services.forEach(s => s.unlisten(l))
   }, [services])
   if (mapping) {
      return <ServicePointsContext.Provider value={mapping}>
         {children}
      </ServicePointsContext.Provider>
   }
   else {
      return null
   }
}
