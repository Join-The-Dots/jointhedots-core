import { Interpreter } from "@livedoc/core"
import "@livedoc/core/web.components"
import { ComponentsRegistry } from "@livedoc/core/library/components"
import { HostedComponentProvider } from "@livedoc/core/remote"
import { HostedContentProvider } from "@livedoc/core/remote"

Interpreter.addEventListener("install", () => {
   Interpreter.edition = true
   ComponentsRegistry.components_provider.add_provider(new HostedComponentProvider())
   ComponentsRegistry.content_provider = new HostedContentProvider()
})

Interpreter.addEventListener("ready", () => {
   const root = window.document.createElement("polycuber-workbench")
   root.id = "root"
   window.document.body.appendChild(root)
})

Interpreter.use()