import { ComponentEntry, ComponentManifest, ServiceType, ComponentService } from "@jointhedots/core"
import { ViewReactService } from "@jointhedots/core/services"
import { AppDescriptor, ApplicationBoard } from "."

export type ApplicationBoardManifest = ComponentManifest & AppDescriptor

export const ApplicationBoardDriver: ComponentService = {

   // Component runtime
   getAvailableServices(component: ComponentEntry): ServiceType[] {
      return ["view.react"]
   },
   async getService(component: ComponentEntry, type: ServiceType): Promise<any> {
      if (type === "view.react") return ApplicationBoardHOC(component.manifest)
      return null
   },

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

function ApplicationBoardHOC(descriptor: AppDescriptor): ViewReactService {
   return function () {
      return <ApplicationBoard descriptor={descriptor} />
   }
}
