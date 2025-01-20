import { Button, Modal, ModalBody } from "react-bootstrap"
import { openDialog } from "../openDialog"
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import { JSONSchema } from "@sf-explorer/core"
import { ModalContent, ModalHeader } from "react-lightning-design-system"

export function askQuestion(question: string): Promise<boolean> {
   return openDialog((resolve) => {
      return <div>
         <div>{question}</div>
         <Button onClick={() => resolve(true)} children="Yes" />
         <Button onClick={() => resolve(false)} children="No" />
      </div>
   })
}

export function askData(question: string, schema: JSONSchema, data?: any): Promise<any> {
   return openDialog((resolve) => {
      return <ModalContent>
         <ModalHeader title={question} />
         <ModalBody>
            <Form
               formData={data}
               schema={schema as any}
               validator={validator}
               onSubmit={(result) => resolve(result.formData)}
               onError={() => resolve(data)}
            />
         </ModalBody>
      </ModalContent>
   })
}
