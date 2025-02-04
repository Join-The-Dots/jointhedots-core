import React from "react"
import { FeaturesContext, FeaturesMaterializer, ReactFeaturesContext } from "@livedoc/editor/ui/FeaturesLayout"
import { ViewEditor } from "./editor"
import WindowedContainer, { DisplayLayout } from "../ui/WindowedContainer"

const displayLayout: DisplayLayout = {
   "#": {
      type: "#",
      child: "toolbar",
   },
   "toolbar": {
      type: "toolbar",
      child: "bottom",
      size: 5,
   },
   "bottom": {
      type: "side-bottom",
      child: "left",
      size: 30,
   },
   "left": {
      type: "side-left",
      child: "right",
      size: 20,
   },
   "right": {
      type: "side-right",
      child: "center",
      size: 25,
   },
   "center": {
      type: "center-top",
      menu: true,
   },
}


export function Builder(props: {
   component_id: string,
}) {
   const { component_id } = props
   const context = React.useMemo(() => new FeaturesContext(), [])
   context.useFeature(ViewEditor, { component_id })
   return (<ReactFeaturesContext.Provider value={context}>
      <FeaturesMaterializer features={context}>
         <WindowedContainer displayLayout={displayLayout} />
      </FeaturesMaterializer>
   </ReactFeaturesContext.Provider>)
}
