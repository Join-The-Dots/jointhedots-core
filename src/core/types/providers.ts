import { URI } from 'vscode-uri'
import { ComponentPublication, ComponentResource } from './components'

export interface IModuleProvider {
   load_data(uri: string): Promise<any>
}

export interface IComponentProvider {
   search_component_publications(pattern?: string): Promise<ComponentPublication[]>
   get_component_resources(component_id: string): Promise<ComponentResource[]>
   get_component_publication(component_id: string): Promise<ComponentPublication>
}

export interface IContentProvider {
   check_content(component_id: string, norm: string, key?: string): Promise<string>
   load_content(component_id: string, norm: string, key?: string): Promise<Blob>
   store_content(content: Blob, component_id: string, norm: string, key?: string): Promise<boolean>
}

export interface IUrlResolver {
   resolve(url: URL): URL
}

export interface IServiceProvider {
   get(uri: URI, init?: RequestInit): Promise<Response>
   post(uri: URI, init?: RequestInit): Promise<Response>
}
