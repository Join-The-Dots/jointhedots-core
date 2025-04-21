import React from "react"
import { ItemProps, ItemRowRich, ItemRowShort } from "../../Items"
import { openContextualMenu } from ".."
import "./style.scss"

export type MenuIcon = string

type MenuItemProps = ItemProps & {
   children?: React.ReactNode
   onClick?: (event: React.SyntheticEvent) => void
   onMouseEnter?: (event: React.SyntheticEvent) => void
   onElementRef?: (element: HTMLElement) => void
}

type AnchorProps = {
   children?: React.ReactNode
   onClick?: (event: React.SyntheticEvent) => void
}

export const Menu = {
   Anchor(props: AnchorProps) {
      const { children, onClick } = props
      return <div className="jtd-menu-anchor" onClick={onClick}>{children}</div>
   },
   Item(props: MenuItemProps) {
      let { children, onClick } = props
      let onMouseEnter, onMouseLeave
      if (children) {
         let closeCallback
         onMouseEnter = (e) => {
            openContextualMenu(e, (f) => {
               closeCallback = f
               return children
            })
         }
         onMouseLeave = () => {
            closeCallback && closeCallback()
         }
         if (!onClick) {
            onClick = (e) => {
               openContextualMenu(e, () => children)
            }
         }
      }
      return <div className="jtd-menu-item" onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
         <ItemRowShort {...props} />
      </div>
   },
   LargeItem(props: MenuItemProps) {
      let { children, onClick, onElementRef } = props
      let onMouseEnter = props.onMouseEnter, onMouseLeave
      if (children) {
         let closeCallback
         onMouseEnter = (e) => {
            openContextualMenu(e, (f) => {
               closeCallback = f
               return children
            })
         }
         onMouseLeave = () => {
            closeCallback && closeCallback()
         }
         if (!onClick) {
            onClick = (e) => {
               openContextualMenu(e, () => children)
            }
         }
      }
      return <div
         className={"jtd-menu-item-large"}
         onClick={onClick}
         onMouseEnter={onMouseEnter}
         onMouseLeave={onMouseLeave}
         ref={onElementRef}
      >
         <ItemRowRich {...props}></ItemRowRich>
      </div>
   },
   Separator() {
      return <div className="jtd-menu-separator" />
   },
   Section(props: { title?: string, children?: React.ReactNode }) {
      return <>
         <div className="jtd-menu-separator">
            {props.title}
         </div>
         {props.children}
      </>
   },
}
