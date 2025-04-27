import { ComponentFilter, createComponentFilter, acquireComponent, ComponentPublication, createComponentPublication, ComponentsRegistry } from "@jointhedots/core"
import { ComponentBrowser, ComponentsFilteredList, ComponentsList } from "./ComponentsBrowser"
import { LabelButton } from "../Items"
import { createComponentManifest } from "./ComponentsEditor"
import { useAsyncState } from "@jointhedots/core/react"


export function CreateComponentSelector(props: {
   entries?: ComponentPublication[]
   service?: string
   onCreate?: (pub: ComponentPublication) => void
}) {
   const { service } = props

   const entries = useAsyncState<ComponentPublication[]>(async () => {
      let { entries } = props
      if (!entries) {
         const provider = ComponentsRegistry.components_provider
         const filter = createComponentFilter({ services: ["component"], tags: service && ["component." + service] })
         entries = await provider.search_component_publications(filter)
      }
      return entries
   }, [service, props.entries])

   const create = async function (pub: ComponentPublication) {
      const driver = acquireComponent(pub.component_id)
      const manif = await createComponentManifest(driver, service)
      if (manif && props.onCreate) {
         props.onCreate(await createComponentPublication(manif))
      }
   }

   return <>
      <div style={{
         display: "flex",
         justifyContent: "center",
         alignItems: "center",
         margin: 5,
         paddingBottom: 5,
         fontSize: "110%",
         gap: 8,
         color: "grey",
      }}>
         {"New"}
      </div>
      {entries.waiting((entries) => {
         return <ComponentsList
            entries={entries}
            display={{ grouped: false, small: true }}
            onSelect={create}
         />
      })}
   </>
}

export function AddComponentButton(props: {
   service?: string
   onCreate?: (pub: ComponentPublication) => void
}) {
   const { service, onCreate } = props
   return <LabelButton
      icon="bi:plus"
      name="Add Connexion"
      content={() => <CreateComponentSelector service={service} onCreate={onCreate} />}
   />
}

export function ComponentsConfigurator(props: {
   title: string
   filter?: ComponentFilter
}) {
   const { title, filter } = props
   return <>
      <h2 className="slds-tile" style={{ display: "flex" }}>
         {title}
         <AddComponentButton />
      </h2>
      <ComponentBrowser filter={filter} />
   </>
}
