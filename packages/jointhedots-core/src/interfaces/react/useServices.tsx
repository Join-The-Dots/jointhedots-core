import React, { useContext, useEffect, useMemo, useState } from "react"
import { Spinner } from "react-lightning-design-system"
import { acquireServicePoint, listenServicePoints, ServiceChangeHandler, ServicePoint, unlistenServicePoints } from "../../services/service-points"
import { ErrorDisplayer } from "./ErrorBoundary"
import { ViewRequirements } from "./interface"

export type IService = unknown
export type ServicePointsMap = Map<ServicePoint, IService[]>

export enum ServiceStatus {
   NotReady = 0,
   Loading = 1,
   Ready = 2,
   Failed = 3,
}

export interface IServicePointsProvider {
   getService<IService>(svc: ServicePoint): IService[]
}

export interface IServicePointsController {
   readonly provider: IServicePointsProvider
   readonly error: MissingServiceError
   readonly status: ServiceStatus
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

type ServiceControllerState = MissingServiceError | IServicePointsProvider | Promise<void> | null
type ServiceUpdateHandler = (state: ServiceControllerState, prevState: ServiceControllerState, target: ServicePointsController) => void

class ServicePointsController implements IServicePointsController {
   services: ServicePointsMap = new Map<ServicePoint, IService[]>
   provider: IServicePointsProvider = null
   state: ServiceControllerState = null
   constructor(
      public support: IServicePointsSupport,
      public requireds: ServicePoint[],
      public requirements: ViewRequirements,
      public onUpdate?: ServiceUpdateHandler,
   ) {
      support.addController(this)
   }
   get status(): ServiceStatus {
      if (this.state instanceof Promise) {
         return ServiceStatus.Loading
      }
      if (this.state instanceof MissingServiceError) {
         return ServiceStatus.Failed
      }
      if (this.state === null) {
         return ServiceStatus.NotReady
      }
      return ServiceStatus.Ready
   }
   get error(): MissingServiceError {
      if (this.state instanceof MissingServiceError) {
         return this.state
      }
   }
   getService<IService>(svc: ServicePoint): IService[] {
      let items = this.services.get(svc)
      if (!items && this.support) {
         items = this.support.getService(svc)
         this.services.set(svc, this.support.getService(svc))
      }
      return svc.services as IService[]
   }
   notifyChange(svc: ServicePoint) {
      if (this.services.has(svc)) {
         this.update()
      }
   }
   updateState(state: any) {
      const prevState = this.state
      if (prevState !== state) {
         this.state = state
         this.onUpdate?.(state, prevState, this)
      }
   }
   update(): Promise<void> {
      const { requireds, requirements } = this
      let pendings: Promise<unknown>[] = []

      let error: MissingServiceError = null
      function addMissingError(svc: ServicePoint) {
         if (!error) error = new MissingServiceError([])
         if (!error.missings.includes(svc)) {
            error.missings.push(svc)
         }
      }

      if (requireds) {
         for (const svc of requireds) {
            if (svc.ready) {
               const items = svc.services
               if (items) this.services.set(svc, items)
            }
            else pendings.push(svc.fetch())
         }
      }

      if (requirements) {
         const { servicePoints } = requirements
         for (const id in servicePoints) {
            const svc = acquireServicePoint(id)
            if (svc.ready) {
               const items = svc.services
               const req = servicePoints[id]
               if (req.service && svc.service !== req.service) {
                  addMissingError(svc)
               }
               else if (items.length < (req.cardinality || 1)) {
                  addMissingError(svc)
               }
               else {
                  this.services.set(svc, items)
               }
            }
            else pendings.push(svc.fetch())
         }
      }

      if (pendings.length > 0) {
         const loading = Promise.all(pendings).then(() => this.update())
         this.updateState(loading)
         return loading
      }
      else if (error) {
         this.updateState(error)
      }
      else {
         this.provider = new ServicePointsProxy(this)
         this.updateState(this.provider)
      }
      return null
   }
   dispose() {
      if (this.support) {
         this.support.removeController(this)
         this.support = null
      }
   }
}

const globalSupport = new ServicePointsGlobal()
listenServicePoints(globalSupport.onServiceChangeHandler)

export const ServicePointsSupportContext: React.Context<IServicePointsSupport> = React.createContext(globalSupport)
export const ServicePointsProviderContext: React.Context<IServicePointsProvider> = React.createContext(globalSupport)

export function useServicesListener(listener: ServiceChangeHandler) {
   useEffect(() => {
      const handler = listenServicePoints(listener)
      return () => unlistenServicePoints(handler)
   }, [listener])
}

export function useServices<IService>(servicePoint: ServicePoint<IService>, cardinality?: number): IService[] {
   const provider = React.useContext(ServicePointsProviderContext)
   if (!provider) {
      console.error("Wrap in <MountServicePoints> before using service point:", servicePoint.id)
      return null
   }
   const result = provider.getService<IService>(servicePoint)
   if (result.length < (cardinality === undefined ? 1 : cardinality)) {
      throw new MissingServiceError([servicePoint], [servicePoint])
   }
   return result
}

export function useService<IService>(servicePoint: ServicePoint<IService>, optional?: boolean): IService {
   return useServices<IService>(servicePoint, optional ? 0 : 1)[0]
}

export function useServicesController(requireds: ServicePoint[], requirements: ViewRequirements): IServicePointsController | null {
   const support = useContext(ServicePointsSupportContext)
   const [, setState] = useState(null)

   const controller = useMemo(() => {
      return new ServicePointsController(support, requireds, requirements, setState)
   }, [requireds, requirements])

   useEffect(() => {
      controller.update()
      return () => controller?.dispose()
   }, [controller])

   return controller
}

export type ServiceConfiguratorComponent = React.ComponentType<{
   services: ServicePoint[]
}>

export function UseServicePoints(props: {
   requireds?: ServicePoint[]
   requirements?: ViewRequirements
   configurator: ServiceConfiguratorComponent
   children: any
}) {
   const { requireds, requirements, children } = props
   const controller = useServicesController(requireds, requirements)
   const { provider, error } = controller
   if (error) {
      const ServiceConfigurator = props.configurator
      if (ServiceConfigurator) return <ServiceConfigurator services={error.missings} />
      else return <ErrorDisplayer error={error} />
   }
   else if (provider) {
      return <ServicePointsProviderContext.Provider value={provider}>
         {children}
         {controller.status === ServiceStatus.Loading && <Spinner />}
      </ServicePointsProviderContext.Provider>
   }
   else {
      return <Spinner />
   }
}
