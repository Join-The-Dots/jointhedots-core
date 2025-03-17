import React from "react"
import { JSONSchema } from "../ast"
import { ServiceEntry } from "../library/interfaces"
import { MapLike } from "../common/types"

export type ViewServicePoint = {
   service: string
   multiple?: boolean
}

export type ViewRequirements = {
   servicePoints?: MapLike<ViewServicePoint>
}

export type ViewDescriptor = JSONSchema & {
   requirements?: ViewRequirements
}

// Manifest descriptor "view"
export const ViewServiceKey = new ServiceEntry<unknown, ViewDescriptor>("view")

// Service "view.react"
export type ViewReactService<T = any> = React.ComponentType<T>
export const ViewReactKey = ViewServiceKey.subservice<ViewReactService>("react")

// Service "view.webc"
export type ViewWebComponentService = new (...props) => HTMLElement
export const ViewWebComponentKey = ViewServiceKey.subservice<ViewWebComponentService>("webc")
