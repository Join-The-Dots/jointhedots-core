import React, { useContext, useEffect, useState } from "react"
import { acquireServicePoint, listenServicePoints, ServicePoint } from "../library/service-points"
import { useAsyncMemo } from "./useAsyncMemo"
import { ViewRequirements } from "../services"

export type IService = unknown
export type ServicePointsMap = Map<ServicePoint, IService[]>

export interface IServicePointsProvider {
   getService<IService>(svc: ServicePoint): IService[]
}

export interface IServicePointsController {
   notifyChange(svc: ServicePoint)
   dispose()
}

export interface IServicePointsSupport extends IServicePointsProvider {
   addController(c: IServicePointsController)
   removeController(c: IServicePointsController)
}

export class MissingServiceError extends Error {
   constructor(
      public missings: ServicePoint[],
      public requireds?: ServicePoint[],
   ) {
      super(`Missing service point: ${missings.map(s => s.id).join(", ")}`)
   }
}

class ServicePointsGlobal implements IServicePointsSupport {
   consumers = new Set<IServicePointsController>
   getService<IService>(svc: ServicePoint): IService[] {
      return svc.services as IService[]
   }
   addController(c: IServicePointsController) {
      this.consumers.add(c)
   }
   removeController(c: IServicePointsController) {
      return this.consumers.delete(c)
   }
   onServiceChangeHandler = (svc: ServicePoint) => {
      for (const c of this.consumers) {
         c.notifyChange(svc)
      }
   }
}

class ServicePointsProxy implements IServicePointsProvider {
   constructor(
      readonly controller: ServicePointsController,
   ) {
   }
   getService<IService>(svc: ServicePoint): IService[] {
      return this.controller.getService<IService>(svc)
   }
}

type NewProviderHanlder = (provider: IServicePointsProvider | MissingServiceError) => void

class ServicePointsController implements IServicePointsController {
   services: ServicePointsMap = new Map<ServicePoint, IService[]>
   constructor(
      public support: IServicePointsSupport,
      public requireds: ServicePoint[],
      public requirements: ViewRequirements,
      public onNewProvider: NewProviderHanlder,
   ) {
      support.addController(this)
   }
   createProvider() {
      return new ServicePointsProxy(this)
   }
   getService<IService>(svc: ServicePoint): IService[] {
      let items = this.services.get(svc)
      if (!items) {
         items = this.support.getService(svc)
         this.services.set(svc, this.support.getService(svc))
      }
      return svc.services as IService[]
   }
   async notifyChange(svc: ServicePoint) {
      if (this.services.has(svc)) {
         await this.setup()
      }
   }
   async setup(): Promise<ServicePointsController> {
      const { requireds, requirements } = this
      let missings = null
      if (requireds) {
         for (const svc of requireds) {
            const items = svc.ready ? svc.services : await svc.fetch()
            if (items.length > 0) {
               this.services.set(svc, items)
            }
            else {
               if (!missings) missings = []
               missings.push(svc)
            }
         }
      }
      if (requirements) {
         const { servicePoints } = requirements
         for (const id in servicePoints) {
            const svc = acquireServicePoint(id)
            const items = svc.ready ? svc.services : await svc.fetch()
            if (items.length > 0) {
               this.services.set(svc, items)
            }
            else {
               if (!missings) missings = []
               missings.push(svc)
            }
            //TODO
         }
      }
      this.onNewProvider(new ServicePointsProxy(this))
      return this
   }
   dispose() {
      if (this.support) {
         this.support.removeController(this)
         this.support = null
         this.services = null
      }
   }
}

const globalSupport = new ServicePointsGlobal()
listenServicePoints(globalSupport.onServiceChangeHandler)

export const ServicePointsSupportContext: React.Context<IServicePointsSupport> = React.createContext(globalSupport)
export const ServicePointsProviderContext: React.Context<IServicePointsProvider> = React.createContext(globalSupport)

export function useServices<IService>(servicePoint: ServicePoint<IService>): IService[] {
   const provider = React.useContext(ServicePointsProviderContext)
   if (!provider) {
      console.error("Wrap in <MountServicePoints> before using service point:", servicePoint.id)
      return null
   }
   const result = provider.getService<IService>(servicePoint)
   if (result.length == 0) {
      throw new MissingServiceError([servicePoint], [servicePoint])
   }
   return result
}

export function useService<IService>(servicePoint: ServicePoint<IService>): IService {
   return useServices(servicePoint)[0]
}

async function createServicesController(
   support: IServicePointsSupport,
   requireds: ServicePoint[],
   requirements: ViewRequirements,
   onNewProvider: (provider: IServicePointsProvider | MissingServiceError) => void
): Promise<IServicePointsController> {
   const ctl = new ServicePointsController(support, requireds, requirements, onNewProvider)
   await ctl.setup()
   return ctl
}

export function useServicesProvider(requireds: ServicePoint[], requirements: ViewRequirements): IServicePointsProvider | MissingServiceError | null {
   const support = useContext(ServicePointsSupportContext)
   const [provider, setProvider] = useState<IServicePointsProvider | MissingServiceError>(null)

   const controller = useAsyncMemo(async () => {
      return createServicesController(support, requireds, requirements, setProvider)
   }, null, [requireds])

   useEffect(() => {
      return () => controller?.dispose()
   }, [controller])

   return provider
}
