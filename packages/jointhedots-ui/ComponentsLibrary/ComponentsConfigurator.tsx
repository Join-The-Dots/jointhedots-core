import { ComponentFilter, createComponentFilter, acquireComponent, ComponentPublication, createComponentPublication } from "@jointhedots/core"
import { ComponentBrowser, ComponentsFilteredList } from "./ComponentsBrowser"
import { LabelButton } from "../Items"
import { createComponentManifest } from "./ComponentsEditor"
import Icon from "../Icon"

export function CreateComponentSelector(props: {
   service?: string
   onCreate?: (pub: ComponentPublication) => void
}) {
   const { service } = props
   const filter = createComponentFilter({ services: ["component"], tags: service && ["component." + service] })
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
         borderBottom: "solid thin #bbb",
      }}>
         <Icon name="bi:plus-circle" style={{ fontSize: "120%" }} />
         {"New"}
      </div>
      <ComponentsFilteredList
         filter={filter}
         display={{ grouped: false, small: true }}
         onSelect={async function (def) {
            const driver = acquireComponent(def.component_id)
            const manif = await createComponentManifest(driver, service)
            if (manif && props.onCreate) {
               props.onCreate(createComponentPublication(manif))
            }
         }}
      />
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
      <h2 className="slds-tile">
         {title}
         <AddComponentButton />
      </h2>
      <ComponentBrowser filter={filter} />
   </>
}
