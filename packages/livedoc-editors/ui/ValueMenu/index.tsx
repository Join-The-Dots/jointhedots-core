import React from 'react'
import { Menu } from '@livedoc/editors/ui/openContextualMenu'
import { EditionController, EditorMenu, EditorMenuItem, IEditionContext, ValueProps } from '@livedoc/editors/ui'
import { stringifyDescriptor } from '@livedoc/core/ast/schema/json'
import { convertTextToExpression } from '@livedoc/core/ast/producer'

export function ValueMenu(props: ValueProps & { menu?: EditorMenu, context: IEditionContext, ctl: EditionController, onClose: () => void }) {
   const { ctl, context, menu, value, typing, onChange, onClose } = props

   const onCopy = async () => {
      navigator.clipboard.writeText(stringifyDescriptor(value))
      onClose()
   }

   const onPaste = async () => {
      try {
         const text = await navigator.clipboard.readText()
         const data = convertTextToExpression(text, value.typing, true)
         value.change(data)
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
               items.push(<Menu.Item key={items.length} title={item.title} icon={item.icon} onClick={onCustom(item)} />)
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
         <Menu.Item title="Copy" onClick={onCopy} />
         <Menu.Item title="Paste" onClick={onPaste} />
         <Menu.Item title="Delete" />
         <Menu.Item title="See JSON" />
      </Menu.Section>
   </>
}
