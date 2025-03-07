import { Tab, Tabs } from "react-lightning-design-system"
import { ServicePointsConfigurator, ServicePointStatus } from "../ServicePoint"
import { ComponentsConfigurator } from "../ComponentsLibrary"

export function ApplicationSettings(): React.ReactElement {
   return <div style={{ margin: 10, display: "grid" }}>
      <Tabs
         defaultActiveKey="0"
         onSelect={function noRefCheck() { }}
         type="default"
      >
         <Tab title="Service Points" eventKey="0" >
            <ServicePointsConfigurator />
         </Tab>
         <Tab title="Components" eventKey="1" >
            <ComponentsConfigurator title={"Components"} />
         </Tab>
      </Tabs>
   </div>
}
