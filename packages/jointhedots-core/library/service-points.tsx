import { MapLike } from "../common/types"
import { acquireComponent, ComponentsRegistry } from "./manifold"
import { ComponentID, ServiceType } from "./interfaces"

const servicepoints_storekey = "settings://service-points"

export type ServicePointID = string

export type ServicePointDescriptor = {
   id: ServicePointID
   service: ServiceType
   connexions: ComponentID[]
}

export type SettingsDescriptor = {
   servicePoints: MapLike<ServicePointDescriptor>
}

export const ServiceSettings: SettingsDescriptor = initServicesSettings()
export const ServicePoints: Map<string, ServicePoint> = new Map()

export type ServiceChangeHandler = (service: ServicePoint) => void
const ServiceChangeHandlers = new Set<ServiceChangeHandler>()

export type SettingsChangeHandler = (settings: SettingsDescriptor) => void
const SettingsChangeHandlers = new Set<SettingsChangeHandler>()

export class ServicePoint<IService = unknown> {
   services: IService[] = []
   loading: Promise<IService[]> = null
   ready: boolean = false
   constructor(
      public descriptor: ServicePointDescriptor,
      public multiple: boolean,
   ) {
   }
   get id(): string {
      return this.descriptor.id
   }
   async fetch(): Promise<IService[]> {
      if (this.ready) {
         return this.services
      }
      if (!this.loading) {
         this.loading = new Promise(async (resolve) => {
            const { descriptor } = this
            const { id, service, connexions } = this.descriptor
            const services = await fetchComponentsService<IService>(connexions, service, id)
            if (descriptor === this.descriptor) {
               this.services = services
               this.ready = true
               this.loading = null
               resolve(this.services)
            }
            else {
               resolve(this.fetch())
            }
         })
      }
      return this.loading
   }
   reset(descriptor: ServicePointDescriptor) {
      if (this.descriptor !== descriptor) {
         this.descriptor = descriptor
         this.loading = null
         this.ready = false
         ServiceChangeHandlers.forEach(l => l(this))
      }
      return this
   }
}

export function listenServicePoints(handler: ServiceChangeHandler) {
   ServiceChangeHandlers.add(handler)
   return handler
}

export function unlistenServicePoints(handler: ServiceChangeHandler) {
   ServiceChangeHandlers.delete(handler)
}

export function getServicePoint<IService>(id: string): ServicePoint<IService> {
   return ServicePoints.get(id) as ServicePoint<IService>
}

export function dispatchServicePointSetting(id: string, descriptor: ServicePointDescriptor) {
   dispatchServicesSettings({
      ...ServiceSettings,
      servicePoints: {
         ...ServiceSettings?.servicePoints,
         [id]: descriptor,
      }
   })
}

export function dispatchServicesSettings(newSettings: SettingsDescriptor) {
   updateServicesSettings(newSettings)
   localStorage.setItem(servicepoints_storekey, JSON.stringify(newSettings))
}

export function listenServiceSettings(handler: SettingsChangeHandler) {
   SettingsChangeHandlers.add(handler)
   return handler
}

export function unlistenServiceSettings(handler: SettingsChangeHandler) {
   SettingsChangeHandlers.delete(handler)
}

ComponentsRegistry.listen((component) => {
   for (const service of ServicePoints.values()) {
      if (service.descriptor.connexions?.includes(component.id)) {
         ServiceChangeHandlers.forEach(l => l(service))
      }
   }
})

async function fetchComponentsService<IService>(components_ids: string[], service: string, servicepoint: string): Promise<IService[]> {
   const services = []
   if (Array.isArray(components_ids) && components_ids.length > 0) {
      for (const component_id of components_ids) {
         const srv = await acquireComponent(component_id).acquireResource(service).fetch()
         if (srv) {
            if (srv) {
               services.push(srv)
            }
            else {
               console.error(`ServicePoint '${servicepoint}' component '${component_id}' not implement ${service}`)
            }
         }
         else {
            console.error(`ServicePoint '${servicepoint}' component '${component_id}' not found`)
         }
      }
   }
   return services
}

function updateServicesSettings(newSettings: SettingsDescriptor) {
   const newServices = newSettings.servicePoints
   const prevServices = ServiceSettings.servicePoints
   const services = ServiceSettings.servicePoints = {}
   for (const id in newServices) {
      const prevSvc = prevServices[id]
      const newSvc = newServices[id]
      if (JSON.stringify(prevSvc) !== JSON.stringify(newSvc)) {
         const svc = ServicePoints.get(id)
         services[id] = newSvc
         if (svc) {
            svc.reset(newSvc)
            console.log("Update service point:", id)
         }
      }
      else {
         services[id] = prevSvc
      }
   }
   SettingsChangeHandlers.forEach(l => l(newSettings))
}

function initServicesSettings(): SettingsDescriptor {
   window.addEventListener("storage", (evt) => {
      const { key, newValue } = evt
      if (key === servicepoints_storekey) {
         updateServicesSettings(JSON.parse(newValue))
      }
   })
   try {
      const bytes = localStorage.getItem(servicepoints_storekey)
      const data = JSON.parse(bytes) as SettingsDescriptor
      if (false === data.servicePoints instanceof Object) throw null
      return data
   }
   catch (_) {
      return {
         servicePoints: {},
      }
   }
}

export function acquireServicePointDescriptor(id: string, service: string): ServicePointDescriptor {
   let desc = ServiceSettings.servicePoints[id]
   if (desc) {
      if (typeof desc.service !== "string") desc = null
   }
   if (!desc) {
      if (typeof service !== "string") throw new Error()
      desc = ServiceSettings.servicePoints[id] = {
         id,
         service,
         connexions: [],
      }
   }
   return desc
}

export function createServicePoint<IService>(id: string, service: string): ServicePoint<IService> {
   let svc = ServicePoints.get(id) as ServicePoint<IService>
   if (!svc) {
      svc = new ServicePoint<IService>(acquireServicePointDescriptor(id, service), false)
      ServicePoints.set(svc.id, svc)
   }
   return svc
}

export function createServiceGroup<IService>(id: string, service: string): ServicePoint<IService> {
   let svc = ServicePoints.get(id) as ServicePoint<IService>
   if (!svc) {
      if (typeof service !== "string") return null
      svc = new ServicePoint<IService>(acquireServicePointDescriptor(id, service), true)
      ServicePoints.set(svc.id, svc)
   }
   return svc
}

