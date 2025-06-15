import { acquireComponent, createComponentFilter, createComponentPublication, createServicePoint, saveComponentManifest, searchComponentsPublications, ServicePoint } from "@jointhedots/core"
import { StorageServiceKey } from "@jointhedots/core/services"
import { GithubServiceManifest } from "../components/GithubComponent/component"
import { createComponent } from "@jointhedots/ui/ComponentsLibrary"
import { getLocationQuery, useAsyncMemo, UseServicePoints, useServices } from "@jointhedots/core/react"
import { renderRoot } from "../components/config"
import { DefaultServiceConfigurator, ServicePointsConfigurator, ServicePointStatus, ServiceRequirementBoundary } from "@jointhedots/ui/ServicePoint"
import { NotificationsBell } from "@jointhedots/ui/Notifications"

await saveComponentManifest({
   "$id": "config:main-repo",
   "type": "jtd:github.service",
   "title": "github main repo 4",
   //"icon": "fa:git",
   "settings": {
      "url": "https://github.com/jointhedots/jointhedots-app",
      "password": "******",
      "org": "jointhedots",
      "branch": "main",
   }
} as GithubServiceManifest)

await saveComponentManifest({
   "$id": "config:second-repo",
   "type": "jtd:github.service",
   "title": "Github second repo",
   //"icon": "fa:git",
   "settings": {
      "url": "https://github.com/jointhedots/jointhedots-app",
      "password": "******",
      "org": "jointhedots",
      "branch": "main",
   }
} as GithubServiceManifest)

export const SourceOrgsPoint = createServicePoint(StorageServiceKey, "sources", {
   title: "Orgs code source",
   multiple: true,
})


async function connectGitService(servicePoint: ServicePoint, driver_id: string, url: string) {
   const filter = createComponentFilter({
      services: ["storage"],
      keywords: [url],
   })
   for (const found of await searchComponentsPublications(filter)) {
      const manifest = await acquireComponent(found.component_id).fetch<GithubServiceManifest>()
      if (manifest.url === url) {
         servicePoint.override([found.component_id])
         return found
      }
   }
   servicePoint.override([])

   const driver = acquireComponent(driver_id)
   const component = await createComponent(driver, servicePoint.service)
   if (component) {
      const found = await createComponentPublication(component.manifest)
      servicePoint.override([found.component_id])
      return found
   }
}

function AutoConnect(props: { target: string, children: React.ReactNode }) {
   const { target, children } = props
   const auto_setup = useAsyncMemo(async () => {
      const domain = target.includes("://") ? new URL(target).host : target
      await connectGitService(SourceOrgsPoint, "", domain)
      return true
   }, false, [])
   return <>{auto_setup ? children : null}</>
}

function ApplicationContent() {
   const svc = useServices(SourceOrgsPoint)
   return <div>
      <div>Services:</div>
      <ul>
         {svc.map(x => <>
            <li>{x.location}</li>
         </>)}
      </ul>
   </div>
}

function ApplicationRoot() {
   return <div>
      <NotificationsBell />
      <ServicePointStatus servicePoint={SourceOrgsPoint} />
      <ServicePointsConfigurator />
      <ServiceRequirementBoundary>
         <UseServicePoints requireds={[SourceOrgsPoint]} configurator={DefaultServiceConfigurator}>
            <ApplicationContent />
         </UseServicePoints>
      </ServiceRequirementBoundary>
   </div>
}

const { "--connect-url": connect_url } = getLocationQuery()
if (connect_url) {
   renderRoot(<AutoConnect target={connect_url}>
      <ApplicationRoot />
   </AutoConnect>)
}
else {
   renderRoot(<ApplicationRoot />)
}

