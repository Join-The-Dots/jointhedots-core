import { ComponentEntry, ComponentManifest, ComponentController } from "@jointhedots/core"
import { AppDescriptor, ApplicationBoard } from "."

export type ApplicationBoardManifest = ComponentManifest & AppDescriptor

export const ApplicationBoardDriver: ComponentController = {

   // Component management
   async createComponent(component: ComponentEntry, descriptor: ComponentManifest) {
      //component.instance = new GithubService(descriptor)
   },
   async updateComponent(component: ComponentEntry, descriptor: ComponentManifest) {
      //return component.instance.update(descriptor)
   },
   async checkDescriptor(descriptor: ComponentManifest) {
      return null
   },
}

export function GetApplicationView(component: ComponentEntry) {
   return function () {
      return <ApplicationBoard descriptor={component.manifest} />
   }
}

