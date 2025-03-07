import { MissingServiceError, useService } from "@jointhedots/core/react"
import { ServiceRequirementBoundary } from "@jointhedots/ui/ServicePoint"
import { SourceOrgsPoint } from "packages/playground-services/components/services"
import React from "react"

function TestUseService() {
   const sourceOrgs = useService(SourceOrgsPoint)
   return <div>Home</div>
}


export default function Home() {
   return <ServiceRequirementBoundary>
      <TestUseService />
   </ServiceRequirementBoundary>
}