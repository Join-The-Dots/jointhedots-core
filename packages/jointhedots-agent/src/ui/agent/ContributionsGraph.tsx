import { useMemo, useState } from "react"
import { createDiagram, DiagramView, EdgeKind, type DiagramHandler } from "../components/DiagramV2Panel"
import type { Contribution, GenerativeThread } from "../../ai/thread/GenerativeThread"

class ContributionGraph implements DiagramHandler<Contribution, unknown> {
   constructor(readonly flow: GenerativeThread) {

   }
   getEdges(n: Contribution, visitor: (node: Contribution, edge: unknown, kind: EdgeKind) => void) {
      for (const used of n.uses) {
         visitor(used, void 0, EdgeKind.Strong)
      }
   }
   getNodes(n: Contribution, visitor: (target: Contribution, version: string) => void) {
      for (const cn of this.flow.thread) {
         visitor(cn, null)
      }
   }
   getNodeIcon(n: Contribution): string {
      return "bi:house"
   }
   getNodeName(n: Contribution): string {
      return `#${n.index} ${n.user}`
   }
   getNodeOrder(n: Contribution): number {
      return n.index
   }
   getScope(n: Contribution): Contribution {
      return null
   }
}

export function ShowGraph(props: { flow: GenerativeThread }) {
   const { flow } = props
   const [select, onSelect] = useState(null)
   const diag = useMemo(() => createDiagram(new ContributionGraph(flow)), [flow])
   return <DiagramView diag={diag} selection={select} onSelect={onSelect} />
}
