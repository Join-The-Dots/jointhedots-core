import { LDXDocumentExpr } from "@livedoc/core/interpreter/exprs"
import { createContext, useContext } from "react"

export const DocumentContext = createContext<LDXDocumentExpr>(null);

export function useDocumentContext() {
   return useContext(DocumentContext)
}