import { AST, Interpreter } from "@livedoc/core"
import { ContentBlob } from "@livedoc/core/common/contents"
import { CommonTypes } from "@livedoc/core/ast/schema/helpers"
import { ComponentsRegistry, createNewComponent } from "@livedoc/core/library/components"
import { contentLocalURI } from "@livedoc/core/library/handlers/StaticContentProvider"

Interpreter.addEventListener("load", async () => {
   await store_view_component(":samples_view2", await import("./samples/view1"))
})

async function store_view_component(id: string, exports: { default: string }) {
   const { content_provider } = ComponentsRegistry
   const comp = ComponentsRegistry.acquireComponent(id)
   if (await comp.fetch()) return // already registered
   await content_provider.store_content(
      ContentBlob.text.write(exports.default, "application/mdx"),
      contentLocalURI(id, "file", "view.mdx")
   )
   await createNewComponent({
      $id: id,
      view: {
         properties: {
            "default": CommonTypes.view,
         },
      },
      services: {
         "view": `local://${id}/file/view.mdx`
      }
   })
}
