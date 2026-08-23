import { useState } from "react"
import { renderRoot } from "../components/config"
import { CommonTypes, type JSONSchema } from "@jointhedots/core"
import { InputData } from "@jointhedots/input"
import { Button, ButtonIcon } from "@jointhedots/button"

const toolings_1 = [
   {
      icon: "bi:house",
      onClick: () => { }
   },
   {
      icon: "bi:house",
      onClick: () => { }
   },
]

const schema_1: JSONSchema = {
   type: "string",
   enum: ["val_1", "val_2"]
}

function ApplicationRoot() {
   const [data_1, set_data_1] = useState(`{"val1":[42,1,2]}`)
   const [data_2, set_data_2] = useState(false)
   return <>
      <InputData
         icon="bi:house"
         tooling={toolings_1}
         schema={CommonTypes.string}
         value={data_1}
         onChange={set_data_1}
      />
      <InputData
         icon="bi:house"
         tooling={toolings_1}
         schema={schema_1}
         value={data_1}
         onChange={set_data_1}
      />
      <InputData
         icon="bi:house"
         tooling={toolings_1}
         schema={CommonTypes.boolean}
         value={data_2}
         onChange={set_data_2}
      />
      <div>
         <Button icon="bi:house" label="Click here" />
         <Button icon="bi:house" label="Click here" iconPosition="right" variant="destructive" />
         <Button icon="bi:house" label="Click here" variant="brand" />
         <ButtonIcon icon="bi:house" />
         <ButtonIcon icon="bi:house" variant="primary" />
         <ButtonIcon icon="bi:house" variant="secondary" />
         <ButtonIcon icon="bi:house" variant="watermark" />
      </div>
   </>
}

renderRoot(<ApplicationRoot />)
