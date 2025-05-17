import { renderRoot } from "../components/config"
import { Button } from "@jointhedots/ui/Inputs"
import { createFloatingDock, OverflowStack, usePanel } from "@jointhedots/ui/Layouts"

function renderContent(count: number) {
   const items = []
   for (let i = 0; i < count; i++) {
      items.push(<Button key={i} icon="bi:house" label={"Button " + i} />)
   }
   return items
}

function ApplicationRoot() {
   return <>
      <OverflowStack gap={0}>{renderContent(5)}</OverflowStack>
      <OverflowStack gap={0}>{renderContent(5)}</OverflowStack>
   </>
}

renderRoot(<ApplicationRoot />)
