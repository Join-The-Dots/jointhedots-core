import React from "react"
import { Menu } from "../Layouts/Menu"
import Icon, { getIconName } from "@jointhedots/ui/Icon"
import { toast } from 'react-toastify'
import "./style.scss"
import { createFloatingDock, openContextualMenu, PanelDock } from "../Layouts"
import { ButtonIcon } from "../Inputs"

export type ShapeDecoration = {
   type: "shape"
   color: string
}

export type BadgeDecoration = {
   type: "badge"
   name: string
}

export type LabelDecoration = ShapeDecoration | BadgeDecoration

export type LabelProps<T = any> = {
   name: string // Object name
   icon?: string // Object icon
   decorations?: LabelDecoration[]
   tooling?: ToolingProps[] // Object tooling list
   summary?: React.ReactNode // Object short description
   tooltip?: DisplayProps // Object tooltip
   content?: DisplayProps // Object content
   data?: T // Object custom data
   onActivate?: (label: LabelProps, dock: PanelDock) => void // On Object activation
}

export enum LabelSelected {
   None,
   Enabled = 1,
   Disabled = 2,
   Editable = 4,
   EnabledEditable = Enabled | Editable,
   DisabledEditable = Disabled | Editable,
}

export type ToolingProps = LabelProps & {
   optional?: boolean
}

export type ItemProps<T = any> = LabelProps<T> & {
   tags?: TagProps[]
   selected?: LabelSelected
   onSelect?: (item: ItemProps) => void
}

export type DisplayProps = React.ReactNode | ((props: LabelProps) => React.ReactElement)

export type TagProps = string | React.ReactElement | LabelProps

function GetNodeText(node?: React.ReactNode): string {
   return (typeof node === "string") ? node : undefined
}

function GetLabelIcon(label: LabelProps): string {
   const { icon, name } = label
   return getIconName(icon, name)
}

function DrawLabelIcon(label: LabelProps): React.ReactNode {
   const { icon, name, decorations } = label
   let content = <Icon name={icon ? icon : "avatar:" + name} />
   if (decorations) {
      for (const deco of decorations) {
         if (deco.type === "shape") {
            content = <div className="colored" style={{ "--item-shape-color": deco.color } as any}>
               <div className="colored-inner">
                  {content}
               </div>
            </div>
         }
         if (deco.type === "badge") {
            content = <div style={{ position: "relative" }}>
               {content}
               <Icon name={deco.name} style={{ color: "red", position: "absolute", fontSize: "60%", top: "-0.25em", right: "-0.25em" }} />
            </div>
         }
      }
   }
   return content
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

function DrawToolingMenu(tooling: ToolingProps[], onClose: () => void): React.ReactNode {
   return <>
      {...tooling.map((label, i) => (label && <Menu.Item
         key={i}
         name={label.name}
         icon={label.icon}
         onClick={(e) => {
            onClose()
            label.onActivate(label, createFloatingDock(e))
         }}
      />))}
   </>
}

export function DrawToolingWidgets(tooling: ToolingProps[]): React.ReactNode {
   if (tooling) {
      let onToolMenu = null
      const buttons = []
      for (const label of tooling) {
         if (label) {
            if (!label.optional) {
               buttons.push(React.createElement(LabelButton, label))
            }
            else if (!onToolMenu) {
               onToolMenu = (e) => {
                  e.stopPropagation()
                  openContextualMenu(e, (close) => {
                     return DrawToolingMenu(tooling, close)
                  })
               }
            }
         }
      }
      if (onToolMenu) {
         buttons.push(<ButtonIcon icon="bi:three-dots-vertical" onClick={onToolMenu} />)
      }
      if (buttons.length > 0) {
         return React.createElement(React.Fragment, null, ...buttons)
      }
   }
   return null
}

function Switch(props: {
   selected?: boolean
   onSelect?: (event: React.SyntheticEvent) => void
}) {
   const { selected, onSelect } = props
   return <ButtonIcon
      icon={selected ? "bi:check-circle" : "bi:circle"}
      hoveredIcon={selected ? "bi:circle" : "bi:check-circle"}
      onClick={onSelect}
   />
}

export function LabelButton(label: LabelProps) {
   const onClick = async (e) => {
      try {
         e.stopPropagation()
         e.preventDefault()
         if (label.onActivate) {
            await label.onActivate(label, createFloatingDock(e))
         }
         else if (label.content) {
            openContextualMenu(e, DifferDisplay(label, label.content))
         }
      } catch (e) {
         console.error(label.name + ".onActivate", e)
         toast.error(e.message)
      }
   }
   return <ButtonIcon
      icon={GetLabelIcon(label)}
      title={GetNodeText(label.summary) || label.name}
      onClick={onClick}
   />
}

export function ItemIcon(item: LabelProps) {
   let { summary, onActivate } = item
   return <div
      className="jtd-item-short"
      title={GetNodeText(summary)}
      onClick={onActivate && ((e) => onActivate(item, createFloatingDock(e)))}
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
         onActivate(item, createFloatingDock(e))
      })}
   >
      <div className="item-icon">{DrawLabelIcon(item)}</div>
      <div className="item-infos">{name}</div>
      {(selected == LabelSelected.EnabledEditable) ? <Switch selected={true} onSelect={() => onSelect(item)} /> : null}
      {(selected == LabelSelected.DisabledEditable) ? <Switch selected={false} onSelect={() => onSelect(item)} /> : null}
   </li>
}

export function ItemRowRich(item: ItemProps) {
   let { name, summary, content, selected, onSelect, onActivate } = item
   let onMouseEnter, onMouseLeave, onClick
   if (content) {
      let closeCallback
      onMouseEnter = (e) => {
         openContextualMenu(e, (f) => {
            closeCallback = f
            return DrawDisplay(item, item.content)
         })
      }
      onMouseLeave = () => {
         closeCallback && closeCallback()
      }
      if (!onActivate) {
         onClick = (e) => {
            openContextualMenu(e, DifferDisplay(item, item.content))
         }
      }
      else {
         onClick = async (e) => {
            try {
               e.stopPropagation()
               await onActivate(item, createFloatingDock(e))
            } catch (e) {
               console.error("ItemRowRich.onActivate", e)
               toast.error(e.message)
            }
         }
      }
   }
   const select = onSelect && ((e) => { e.stopPropagation(); onSelect(item) })
   const activate = onActivate ? ((e) => { e.stopPropagation(); onActivate(item, createFloatingDock(e)) }) : select
   return <li
      className={(selected & LabelSelected.Enabled)
         ? "jtd-item-large selected"
         : ((onSelect || (selected & LabelSelected.Disabled))
            ? "jtd-item-large unselected" : "jtd-item-large")
      }
      title={GetNodeText(summary)}
      onClick={onClick || activate}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
   >
      {(selected == LabelSelected.EnabledEditable) ? <Switch selected={true} onSelect={select} /> : null}
      {(selected == LabelSelected.DisabledEditable) ? <Switch selected={false} onSelect={select} /> : null}
      <div className="item-icon">{DrawLabelIcon(item)}</div>
      <div className="item-infos">
         <div>{name}</div>
         {summary && <div>{summary}</div>}
      </div>
      {DrawToolingWidgets(item.tooling)}
   </li>
}

