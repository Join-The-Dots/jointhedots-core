import { useMemo, useState } from "react"
import { createDiagram, DiagramBlock, DiagramView, EdgeKind, type DiagramHandler } from "../../components/DiagramV2Panel"
import { Contribution, IAgenticEnvironment } from "../../../services/generative/context"
import { ContributionView } from "./ContributionView"

class ContributionGraph implements DiagramHandler<Contribution, unknown> {
   constructor(readonly env: IAgenticEnvironment) {

   }
   getEdges(n: Contribution, visitor: (node: Contribution, edge: unknown, kind: EdgeKind) => void) {
      for (const used of n.getDependencies()) {
         if (used instanceof Contribution) {
            visitor(used, void 0, EdgeKind.Strong)
         }
      }
   }
   getNodes(visitor: (target: Contribution, version: string) => void) {
      for (const item of this.env.listResources()) {
         if (item instanceof Contribution) {
            visitor(item, null)
         }
      }
   }
   getNodeIcon(n: Contribution): string {
      return "bi:house"
   }
   getNodeName(n: Contribution): string {
      return `#${n.id} ${n.status}`
   }
   getNodeOrder(n: Contribution): number {
      return 0
   }
   getScope(n: Contribution): Contribution {
      return null
   }
}

function ContributionViewer(block: DiagramBlock<Contribution>) {
   return <ContributionView contrib={block.node} onCheckout={null} />
}

export function ShowGraph(props: { env: IAgenticEnvironment }) {
   const { env } = props
   const [select, onSelect] = useState(null)
   const diag = useMemo(() => createDiagram(new ContributionGraph(env)), [env])
   return <DiagramView diag={diag} viewer={ContributionViewer} selection={select} onSelect={onSelect} />
}
