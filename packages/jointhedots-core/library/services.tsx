import { MapLike } from "../common/types"
import { ComponentsRegistry } from "./components"
import { ComponentID } from "./interfaces"

const servicepoints_storekey = "settings://service-points"

export type ServiceID = string

export type ServiceType = string

export type ServicePointDescriptor = {
   id: ServiceID
   service: ServiceType
   connexions: ComponentID[]
}

export type SettingsDescriptor = {
   servicePoints: MapLike<ServicePointDescriptor>
}

export interface ServiceInterface {
}

export const Settings: SettingsDescriptor = initServicesSettings()

export const ServicePoints: Map<string, ServicePoint> = new Map()

export type ServicePointListener = (target: ServicePoint) => void

export class ServicePoint<IService extends ServiceInterface = ServiceInterface> {
   services: IService[] = []
   listeners = new Set<ServicePointListener>()
   loading: Promise<IService[]> = null
   ready: boolean = false
   constructor(
      public descriptor: ServicePointDescriptor,
      public multiple: boolean,
   ) {
   }
   get id() {
      return this.descriptor.id
   }
   listen(l: ServicePointListener) {
      this.listeners.add(l)
      return l
   }
   unlisten(l: ServicePointListener) {
      this.listeners.delete(l)
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
   dispatch(descriptor: ServicePointDescriptor) {
      dispatchServicesSettings({
         ...Settings,
         servicePoints: {
            ...Settings?.servicePoints,
            [this.id]: descriptor,
         }
      })
   }
   reset(descriptor: ServicePointDescriptor) {
      if (this.descriptor !== descriptor) {
         this.descriptor = descriptor
         this.loading = null
         this.ready = false
         this.listeners.forEach(l => l(this))
      }
      return this
   }
}

export function getServicePoint<IService extends ServiceInterface>(id: string): ServicePoint<IService> {
   return ServicePoints.get(id) as ServicePoint<IService>
}

export function dispatchServicesSettings(newSettings: SettingsDescriptor) {
   updateServicesSettings(newSettings)
   localStorage.setItem(servicepoints_storekey, JSON.stringify(newSettings))
}

ComponentsRegistry.listen((component) => {
   for (const service of ServicePoints.values()) {
      if (service.descriptor.connexions?.includes(component.id)) {
         service.listeners.forEach(l => l(this))
      }
   }
})

async function fetchComponentsService<IService extends ServiceInterface>(components_ids: string[], service: string, servicepoint: string): Promise<IService[]> {
   const services = []
   if (Array.isArray(components_ids) && components_ids.length > 0) {
      for (const component_id of components_ids) {
         const srv = await ComponentsRegistry.acquireComponent(component_id).acquireResource(service).fetch()
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
   const prevServices = Settings.servicePoints
   const services = Settings.servicePoints = {}
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
   let desc = Settings.servicePoints[id]
   if (!desc) {
      desc = Settings.servicePoints[id] = {
         id,
         service,
         connexions: [],
      }
   }
   return desc
}

export function createServicePoint<IService extends ServiceInterface>(id: string, service: string): ServicePoint<IService> {
   const svc = new ServicePoint<IService>(acquireServicePointDescriptor(id, service), false)
   ServicePoints.set(svc.id, svc)
   return svc
}

export function createServiceGroup<IService extends ServiceInterface>(id: string, service: string): ServicePoint<IService> {
   const svc = new ServicePoint<IService>(acquireServicePointDescriptor(id, service), true)
   ServicePoints.set(svc.id, svc)
   return svc
}

