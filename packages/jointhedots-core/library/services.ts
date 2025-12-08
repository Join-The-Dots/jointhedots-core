import type { ComponentEntry } from "./manifold"

//-------------------------------------------------------------
// Service: programming resource provided by a component
//-------------------------------------------------------------

export type ServiceType = string

export class ServiceEntry<Instance extends any, Spec extends any> {
   constructor(public resource: string, public definition = null) { }
   defintiion() { return }
   get(entry: ComponentEntry): Instance { return entry.getResource(this.resource)?.get<Instance>() }
   fetch(entry: ComponentEntry): Promise<Instance> { return entry.fetchResource<Instance>(this.resource) }
   spec(entry: ComponentEntry): Spec { return entry.acquireResource(this.resource)?.spec as Spec }
   subservice<T extends any>(name: string) { return new ServiceEntry<T, Spec>(`${this.resource}.${name}`) }
}
