import React from 'react'
import { EditionDriver, EditorMenu, EditorMenuItem, EditionEnvironment, ValueProps } from '../../interfaces'
import { stringifyDescriptor, convertTextToAST } from '@jointhedots/core'
import { Menu } from '@jointhedots/ui/openContextualMenu'

export function ValueMenu(props: ValueProps & { menu?: EditorMenu, context: EditionEnvironment, ctl: EditionDriver, onClose: () => void }) {
   const { ctl, context, menu, value, typing, onChange, onClose } = props

   const onCopy = async () => {
      navigator.clipboard.writeText(stringifyDescriptor(value))
      onClose()
   }

   const onPaste = async () => {
      try {
         const text = await navigator.clipboard.readText()
         const data = convertTextToAST(text, value.typing, true)
         //value.change(data)
         console.log("TODO: paste", data)
      } catch (err) {
         console.error('Failed to read clipboard:', err);
      }
      onClose()
   }

   const onDelete = async () => {
      //env.parent.ctl.deleteItem(value)
   }

   const onCustom = (item: EditorMenuItem) => async () => {
      await item.execute(value, typing, context, onChange)
      onClose()
   }

   function renderMenu(menu: EditorMenu) {
      return menu?.sections?.map((section, i) => {
         const items = []
         for (const item of section.items) {
            if (item.condition === undefined || item.condition(value, typing, context) === true) {
               items.push(<Menu.Item key={items.length} name={item.title} icon={item.icon} onClick={onCustom(item)} />)
            }
         }
         if (items.length > 0) {
            return (<Menu.Section key={i} title={section.title}>
               {items}
            </Menu.Section>)
         }
         else {
            return null
         }
      })
   }

   return <>
      {renderMenu(menu)}
      {renderMenu(ctl.editor?.menu)}
      <Menu.Section>
         <Menu.Item name="Copy" onClick={onCopy} />
         <Menu.Item name="Paste" onClick={onPaste} />
         <Menu.Item name="Delete" />
         <Menu.Item name="See JSON" />
      </Menu.Section>
   </>
}
