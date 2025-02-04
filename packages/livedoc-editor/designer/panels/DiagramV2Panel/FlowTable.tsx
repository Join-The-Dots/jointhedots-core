import React from 'react'
import { DocumentLayer, DXElement } from '@livedoc/core/interpreter/model'
import './FlowTable.scss'



class OperatorStage {
   revision: number = 0
   x: number = 0
   y: number = 0
   w: number = 0
   h: number = 0
   constructor(
      readonly operator: DXElement,
      readonly container: DXElement,
      readonly display: FlowDisplay,
   ) {
   }
}

class LayerStage {
   revision: number = 0
   stages: OperatorStage[]

   columns: number[]
   x: number = 0
   y: number = 0
   w: number = 0
   h: number = 0

   constructor(
      readonly layer: DocumentLayer,
      readonly display: FlowDisplay,
   ) {
   }
}

export class FlowDisplay {
   revision: number = 0
   entry: LayerStage = null
   stages = new Map<DXElement, OperatorStage>()

   constructor(readonly layer: DocumentLayer) {
      this.entry = new LayerStage(layer, this)
   }

   update(layer: DocumentLayer) {
      this.revision++
      updateLayerStage(this.entry, layer)
   }
}

function updateLayerStage(stage: LayerStage, layer: DocumentLayer) {
   const { display } = stage
   for (let op of layer.operators) {
      if (!op.getSupport()) {
         let blk = display.stages.get(op)
         if (!blk) {
         }
      }
   }
}

type FlowColumnView = (stage: LayerStage) => React.ReactElement

type FlowColumn = {
   title: string
   view: FlowColumnView
}

export function FlowTable(props: {
   columns: FlowColumn[]
}) {
   const { columns } = props
   return <div className="FlowTable_V2">
      <div className="diagram">

      </div>
      <table>
         <tr>
            {columns.map((x) => <td>
            </td>)}
         </tr>
      </table>
   </div>
}
