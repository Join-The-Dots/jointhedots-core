import { FeatureDescriptor, FeatureInstance } from '../ui/FeaturesLayout'
import { SelectionPanel } from './panels/SelectionPanel'
import { ElementEditionSelection, ModelEditionSession } from './EditionSession'
import { DocumentModel } from '@jointhedots/core'
import "../elements/register"
import { ToolbarPanel } from './panels/ToolbarPanel'
import { MarkdownViewPanel } from './panels/MarkdownViewPanel'
import { TreeViewPanel } from './panels/TreeViewPanel'
import { ContentPanel } from './panels/ContentPanel'
import { CommmentsPanel } from './plugins/CommentPlugin'

const ViewEditorDescriptor: FeatureDescriptor = {
   name: "infinite-slick",
   title: "InSlick Dev",
   panels: {
      "selection": SelectionPanel,
      "toolbar": ToolbarPanel,
      "markdown-view": MarkdownViewPanel,
      "tree-view": TreeViewPanel,
      "content": ContentPanel,
      "comments": CommmentsPanel,
   },
}

type ViewEditorOptions = {
   model?: DocumentModel
}

export class ViewEditor extends FeatureInstance<ViewEditor> {
   static Descriptor = ViewEditorDescriptor
   session: ModelEditionSession = null
   selection: ElementEditionSelection = null

   async featureDidMount(opts: ViewEditorOptions) {
      return this.featureUpdate(opts)
   }
   async featureUpdate(opts: ViewEditorOptions) {
      const { model } = opts
      if (this.session?.model !== model) {
         return this.loadComponent(model)
      }
   }
   async loadComponent(model: DocumentModel): Promise<void> {
      const session = new ModelEditionSession(model, this)
      this.setState({ session })
      this.showWindows()
   }
   showWindows() {
      this.openPanel("toolbar")
      this.openPanel("content")
      /* this.openPanel("flow/diagram.v2")
      this.openPanel("flow/datas")
      this.openPanel("flow/content")
      this.openPanel("toolbar/editor")
      this.openPanel("library")
      this.openPanel("inspector") */
   }
   async updateModel(selected?: string): Promise<void> {
      /*  const { history, program } = this.session
       await this.session.update()
 
       this.query<TargetApi["ReinstallModule"]>({
          cmd: TargetCmd.ReinstallModule,
          moduleId: program.id,
          content: program.infos.descriptor,
       })
 
       const lastVersion = history.lastVersion()
       if (this.selection) {
          this.selectByLocation({
             moduleId: this.selection.location.moduleId,
             path: selected || this.selection.location.path,
             revision: lastVersion.revision,
          }, false)
       }
       else this.selectByDescriptor(lastVersion, false) */
   }
   select(selection: ElementEditionSelection, focused: boolean) {
      this.setState({ selection })
      if (focused) {
         this.openPanel("selection")
      }
      /*       this.query<TargetApi["SelectZone"]>({
               cmd: TargetCmd.SelectZone,
               target: this.selection?.location
            })
            if (focused) {
               this.openPanel("selection")
            } */
   }
   unselect() {
      this.setState({ selection: null })
   }
   async saveModelChange() {
      /*       const { history, program } = this.session
            const descriptor = history.lastVersion()
            const content = copyData(descriptor)
            const schema = copyData(program.main.getTyping())
            const save = async () => {
               const { storage } = CoreInstance
               const { component } = this.session
      
               const manifest_blob = await storage.load_content(componentURI(component.id, "manifest"))
               storage.store_content(ContentBlob.object.write({
                  service: "view",
                  ...await ContentBlob.object.read(manifest_blob),
                  definition: schema,
               }), componentURI(component.id, "manifest"))
      
               storage.store_content(ContentBlob.object.write(content), componentURI(component.id, "file", "view.json"))
            }
            return toast.promise(save(), {
               pending: 'Saving program...',
               success: 'Sucessfully saved',
               error: 'Failed to save',
            }) */
   }
   undoModelChange() {
      /*       const { history, program } = this.session
            if (history.versions.length > 1) {
               history.undoVersion()
               this.updateModel()
            }
            else {
               toast.warn(`Change history empty`)
            } */
   }
   redoModelChange() {
      /*     const { history, program } = this.session
          if (history.forwards?.length) {
             history.redoVersion()
             this.updateModel()
          } */
   }
}
