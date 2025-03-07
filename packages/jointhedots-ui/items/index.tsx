import React from "react"
import openContextualMenu from "../openContextualMenu"
import Icon, { IconButton } from "@jointhedots/ui/Icon"
import { toast } from 'react-toastify'
import "./style.scss"

export type LabelProps<T = any> = {
   name: string // Object name
   icon?: string // Object icon
   tooling?: LabelProps[] // Object tooling list
   summary?: React.ReactNode // Object short description
   content?: DisplayProps // Object content
   data?: T // Object custom data
   onActivate?: (label: LabelProps) => void // On Object activation
}

export type ItemProps<T = any> = LabelProps<T> & {
   tags?: TagProps[]
   selected?: boolean
   onSelect?: (item: ItemProps) => void
}

export type DisplayProps = React.ReactNode | ((props: LabelProps) => React.ReactElement)

export type TagProps = string | React.ReactElement | LabelProps

function GetNodeText(node?: React.ReactNode): string {
   return (typeof node === "string") ? node : undefined
}

function GetLabelIcon(label: LabelProps): string {
   const { icon, name } = label
   if (icon) {
      return icon
   }
   else if (name) {
      return "avatar:" + name
   }
   return null
}
function DrawLabelIcon(label: LabelProps): React.ReactNode {
   const { icon, name } = label
   if (icon) {
      return <Icon name={icon} />
   }
   else if (name) {
      return <Icon name={"avatar:" + name} />
   }
   return null
}

function DrawDisplay(label: LabelProps, display: DisplayProps): React.ReactNode {
   if (display instanceof Function) {
      return display(label)
   }
   return display
}

function DifferDisplay(label: LabelProps, display: DisplayProps): (props: LabelProps) => React.ReactNode {
   if (display instanceof Function) {
      return () => display(label)
   }
   else {
      return () => display
   }
}

function DrawToolings(tooling: LabelProps[]): React.ReactNode {
   if (tooling) {
      return <>{...tooling.map(label => label && React.createElement(LabelButton, label))}</>
   }
   return null
}

function Switch(props: {
   selected?: boolean
   onSelect?: (event: React.SyntheticEvent) => void
}) {
   const { selected, onSelect } = props
   return <div className="item-selector" onClick={onSelect}>
      <Icon name={selected ? "bi:check-circle" : "bi:circle"} />
   </div>
}

export function LabelButton(label: LabelProps) {
   const onClick = async (e) => {
      try {
         e.stopPropagation()
         if (label.onActivate) {
            await label.onActivate(label)
         }
         else if (label.content) {
            openContextualMenu(e.currentTarget as HTMLElement, DifferDisplay(label, label.content))
         }
      } catch (e) {
         console.error(label.name + ".onActivate", e)
         toast.error(e.message)
      }
   }
   return <IconButton
      name={GetLabelIcon(label)}
      title={GetNodeText(label.summary)}
      onClick={onClick}
   />
}

export function ItemIcon(item: LabelProps) {
   let { summary, onActivate } = item
   return <div
      className="jtd-item-short"
      title={GetNodeText(summary)}
      onClick={onActivate && (() => onActivate(item))}
   >
      <div className="item-icon">{DrawLabelIcon(item)}</div>
   </div >
}

export function ItemRowShort(item: ItemProps) {
   let { name, summary, selected, onSelect, onActivate } = item
   if (!onActivate) onActivate = onSelect
   return <li
      className={onSelect ? "jtd-item-short selectable" : "jtd-item-short"}
      title={GetNodeText(summary)}
      onClick={onActivate && ((e) => {
         e.stopPropagation()
         onActivate(item)
      })}
   >
      <div className="item-icon">{DrawLabelIcon(item)}</div>
      <div className="item-infos">{name}</div>
      {(selected == true) ? <Switch selected={true} onSelect={() => onSelect(item)} /> : null}
      {(selected == false) ? <Switch selected={false} onSelect={() => onSelect(item)} /> : null}
   </li>
}

export function ItemRowRich(item: ItemProps) {
   let { name, summary, content, selected, onSelect, onActivate } = item
   let onMouseEnter, onMouseLeave, onClick
   if (content) {
      let closeCallback
      onMouseEnter = (e) => {
         openContextualMenu(e.currentTarget, (f) => {
            closeCallback = f
            return DrawDisplay(item, item.content)
         })
      }
      onMouseLeave = () => {
         closeCallback && closeCallback()
      }
      if (!onActivate) {
         onClick = (e) => {
            openContextualMenu(e.currentTarget as HTMLElement, DifferDisplay(item, item.content))
         }
      }
      else {
         onClick = async (e) => {
            try {
               e.stopPropagation()
               await onActivate(item)
            } catch (e) {
               console.error("ItemRowRich.onActivate", e)
               toast.error(e.message)
            }
         }
      }
   }
   const select = onSelect && ((e) => { e.stopPropagation(); onSelect(item) })
   const activate = onActivate ? (() => onActivate(item)) : select
   return <li
      className={selected === true ? "jtd-item-large selected" : (onSelect || selected === false) ? "jtd-item-large unselected" : "jtd-item-large"}
      title={GetNodeText(summary)}
      onClick={onClick || activate}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
   >
      <div className="item-icon">{DrawLabelIcon(item)}</div>
      <div className="item-infos">
         <div>{name}</div>
         {summary && <div>{summary}</div>}
      </div>
      {DrawToolings(item.tooling)}
      {(selected == true) ? <Switch selected={true} onSelect={select} /> : null}
      {(selected == false) ? <Switch selected={false} onSelect={select} /> : null}
   </li>
}

