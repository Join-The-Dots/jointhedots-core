import { DXDocumentLayout } from "@jointhedots/core"
import { createContext, useContext } from "react"

export const DocumentContext = createContext<DXDocumentLayout>(null);

export function useDocumentContext() {
   return useContext(DocumentContext)
}