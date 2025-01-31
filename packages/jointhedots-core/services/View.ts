import React from "react"

export type ViewReactService<T = any> = React.ComponentType<T>

export type ViewWebComponentService = new (...props) => HTMLElement
