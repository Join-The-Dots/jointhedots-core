import { openDialog } from "../openDialog"
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import { JSONSchema } from "@jointhedots/core"
import { Button, Modal, ModalContent, ModalHeader } from "react-lightning-design-system"

export function askQuestion(question: string): Promise<boolean> {
   return openDialog((resolve) => {
      return <div className="slds-m-around_small">
         <div className="slds-m-vertical_small">{question}</div>
         <Button type="brand" onClick={() => resolve(true)} children="Yes" />
         <Button type="neutral" onClick={() => resolve(false)} children="No" />
      </div>
   })
}

export function askData(question: string, schema: JSONSchema, data?: any): Promise<any> {
   return openDialog((resolve) => {
      return <Modal>
         <ModalHeader title={question} />
         <ModalContent>
            <Form
               formData={data}
               schema={schema as any}
               validator={validator}
               onSubmit={(result) => resolve(result.formData)}
               onError={() => resolve(data)}
            />
         </ModalContent>
      </Modal>
   })
}
