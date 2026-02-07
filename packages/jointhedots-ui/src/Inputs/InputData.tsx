import React from "react"
import Icon from "@jointhedots/ui/Icon"
import { JSONSchema } from "@jointhedots/core"

export type Tooling = {
   onClick: () => void
   icon: string // SLDS icon name, e.g., 'utility:settings'
}

type InputProps = {
   label?: React.ReactNode
   icon?: string
   tooling?: Tooling[]
   value: any
   schema: JSONSchema
   onChange: (value: any) => void
}

export const InputData: React.FC<InputProps> = ({ value, onChange, schema, icon, tooling }) => {
   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const inputType = schema.type
      let newValue: any = e.target.value

      if (inputType === "number" || inputType === "integer") {
         newValue = Number(newValue)
      } else if (inputType === "boolean") {
         newValue = (e.target as any).checked
      }

      onChange(newValue)
   }

   const renderInput = () => {
      const type = schema.type

      if (type === "string" && schema.enum) {
         return (
            <select className="slds-input" value={value} onChange={handleInputChange}>
               {schema.enum.map((option: string) => (
                  <option key={option} value={option}>
                     {option}
                  </option>
               ))}
            </select>
         )
      }

      if (type === "string" && schema.format === "textarea") {
         return <textarea className="slds-input" value={value} onChange={handleInputChange} />
      }

      if (type === "boolean") {
         return (
            <input
               type="checkbox"
               className="slds-checkbox"
               checked={value}
               onChange={handleInputChange}
            />
         )
      }

      const inputType = type === "number" || type === "integer" ? "number" : "text"

      return (
         <input
            className="slds-input"
            type={inputType}
            value={value}
            onChange={handleInputChange}
         />
      )
   }

   return (<div className="slds-form-element">

      <label className="slds-form-element__label">Input Label</label>

      <div className="slds-form-element__control slds-input-has-icon slds-input-has-icon_left-right">

         <Icon className="slds-icon slds-input__icon slds-input__icon_left" name={icon} />

         <div className="slds-form-element__control">
            {renderInput()}
         </div>

         <div className="slds-input__icon-group slds-input__icon-group_right">

            <div role="status" className="slds-spinner slds-spinner_brand slds-spinner_x-small slds-input__spinner">
               <span className="slds-assistive-text">Loading</span>
               <div className="slds-spinner__dot-a"></div>
               <div className="slds-spinner__dot-b"></div>
            </div>

            {tooling && tooling.map((tool, index) => (
               <button className="slds-button slds-button_icon slds-input__icon slds-input__icon_right" title="Clear">
                  <Icon className="" name={tool.icon} />
                  <span className="slds-assistive-text">Clear</span>
               </button>
            ))}

         </div>

      </div>
   </div>)
}
