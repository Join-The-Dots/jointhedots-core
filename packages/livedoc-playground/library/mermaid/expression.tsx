import React from "react"
import { AST } from "@livedoc/core"
import { MermaidDisplay } from "./view"
import { InstrumentationZone } from "@livedoc/ui/instrumentation/InstrumentationZone"
import { DisplayInfos, InstrumentationBoundingBox, InstrumentationController, InstrumentationLayout } from "@livedoc/ui/instrumentation"
import { IElementGenerator, DeclareElement, DXElement } from "@livedoc/core/interpreter/model"
import { ModelContext } from "@livedoc/core/interpreter/execution"
import { emitJSXElementFromData } from "@livedoc/core/ast/producer"

@DeclareElement({
    name: "std:mermaid"
})
export class DXMermaid extends DXElement implements InstrumentationController {
    layout = InstrumentationLayout.Inlaid
    stretch = InstrumentationBoundingBox.Inner
    code: string = ""
    read(ctx: ModelContext): any {
        return <div>
            <InstrumentationZone controller={this}>
                <MermaidDisplay code={this.code} />
            </InstrumentationZone>
        </div>
    }
    getDisplayInfos(): DisplayInfos {
        return {
            title: "Mermaid",
            category: "",
            icon: "",
        }
    }
    exportAST(gen: IElementGenerator): AST.Any {
        return emitJSXElementFromData({
            tag: "mermaid",
            props: { code: this.code }
        })
    }
}
