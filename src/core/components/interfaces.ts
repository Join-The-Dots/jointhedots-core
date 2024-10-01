import { URI } from 'vscode-uri'

export interface ComponentPublication {
   component_id: string
   icon: string
   title: string
   description: string
   keywords?: string[]
   tags?: string[]
}

export interface ResourceContent {
   component_id: string
   name: string
   format: string
   content?: Blob
}

export interface IComponentProvider {
   search_component_publications(pattern?: string): Promise<ComponentPublication[]>
   get_component_publication(component_id: string): Promise<ComponentPublication>
}

export interface IResourceLoader {
   load_resource(uri: string): Promise<any>
}

export interface IContentProvider {
   check_content(uri: URI): Promise<string>
   load_content(uri: URI): Promise<Blob>
   store_content(content: Blob, uri: URI): Promise<boolean>
}
