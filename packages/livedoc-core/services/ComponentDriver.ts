import { ServiceInterface, ServiceType } from "../library/services"
import { ComponentManifest } from "../library/interfaces"
import { JSONSchema } from "../ast/schema/schema"
import { ComponentEntry } from "../library/components"

export interface ComponentDriverInfos {
   readonly name: ServiceType
   readonly title: string
   readonly icon: string
   readonly services: string[]
   readonly settings: JSONSchema
}

export interface ComponentDriverService {

   // Component infos
   getDefinition(): ComponentEntry

   // Component runtime
   getAvailableServices(component: ComponentEntry): ServiceType[]
   getService(component: ComponentEntry, type: ServiceType): Promise<ServiceInterface>

   // Component management
   create(component: ComponentEntry, descriptor: ComponentManifest): Promise<void>
   update(component: ComponentEntry, descriptor: ComponentManifest): Promise<void>
   check(descriptor: ComponentManifest): Promise<void>
}
