import { ElementKey } from "../../interpreter/model"
import { ComponentPublication } from "../../library/interfaces"
import { Cmdlet } from "./types"
import { AST } from "@livedoc/core"

export enum TransfertCmd {
   DescriptorTransfert = "transfert/descriptor",
   ResourceTransfert = "transfert/resource",
}

export interface TransfertApi {

   DescriptorTransfert: Cmdlet<{
      cmd: TransfertCmd.DescriptorTransfert
      action: "displace" | "copy"
      origin?: ElementKey
      expression: AST.Any
   }>

   ResourceTransfert: Cmdlet<ComponentPublication & {
      cmd: TransfertCmd.ResourceTransfert
   }>
}

