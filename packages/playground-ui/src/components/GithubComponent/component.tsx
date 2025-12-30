import { Octokit } from "@octokit/rest"
import { ComponentEntry, ComponentManifest, ComponentController, Log, ComponentEditor, getComponentFromData } from "@jointhedots/core"
import {
   ChangeSetId, FileKey, StorageChangeLog, StorageChangeSet,
   StorageChangeStatus, StorageService, StorageStats, StorageTransaction
} from "@jointhedots/core/storage"
import { GithubSSOEditor } from "./sso"
import { Cmdlet, CmdPayload, CmdResult, CommandsService } from "@jointhedots/core/commands"
import { toast } from "react-toastify"

interface CommittedFile {
   path: string
   size: number
   sha: string
   type: 'tree' | 'blob'
   url: string
}

export type GithubServiceManifest = ComponentManifest & {
   settings: any
   url: string
}

export const GithubController: ComponentController = {

   // Component management
   async createComponent(component: ComponentEntry<GithubService>, descriptor: GithubServiceManifest) {
      component.instance = new GithubService(descriptor)
      Log.openTicket(component, "connection", {
         status: "error",
         message: "Credentials invalid",
         actions: [{
            icon: "bi:plug",
            title: "Connect",
            target: `command://${descriptor.$id}/reconnect`,
         }]
      })
      return new Promise((resolve) => {
         setTimeout(resolve, 1000)
      })
   },
   async updateComponent(component: ComponentEntry<GithubService>, descriptor: GithubServiceManifest) {
      component.instance.update(descriptor)
   },
   async checkDescriptor(descriptor: GithubServiceManifest) {
      return null
   },
}

export function GetStorageService(component: ComponentEntry<GithubService>): StorageService {
   return component.instance
}

export function GetCommandsService(component: ComponentEntry<GithubService>): CommandsService {
   return component.instance
}

export function GetEditor(component: ComponentEntry<GithubService>): ComponentEditor {
   return {
      creator: (props) => {
         return <GithubSSOEditor />
      },
      editor: (props) => {
         return <GithubSSOEditor />
      },
      preview: (props) => {
         return <>Preview</>
      },
   }
}
export class GithubService implements StorageService, CommandsService {
   //https://api.github.com/repos/pegros/PEG_LIST/git/trees/master?recursive=3
   _files: CommittedFile[] = []
   _githubClient?: Octokit
   commits: StorageChangeLog = null
   url?: string
   password?: string
   org?: string
   repo?: string
   branch?: string
   name: string

   constructor(public descriptor: GithubServiceManifest) {
      this.update(descriptor)
   }
   get location() {
      return this.descriptor.title
   }
   update(descriptor: GithubServiceManifest) {
      this.name = descriptor.title
      Object.assign(this, descriptor.settings)
      return this
   }
   async execute<C extends Cmdlet>(cmd: string, data: CmdPayload<C>): Promise<CmdResult<C>> {
      if (cmd === "/reconnect") {
         toast.info(`Reconnect '${getComponentFromData(this).id}'`)
         Log.closeTicket(this, "connection")
      }
      return null
   }

   // File access
   async list(): Promise<FileKey[]> {
      return []
   }
   async stats(): Promise<StorageStats> {
      return {}
   }
   async read(key: FileKey): Promise<Blob> {
      return null
   }
   async write(key: FileKey, data: Blob): Promise<void> {
      return null
   }
   async recall(key: FileKey, at: ChangeSetId): Promise<Blob> {
      return null
   }

   // File change management
   getChangeSet(id: ChangeSetId): Promise<StorageChangeSet> {
      return null
   }
   async request(url: string, method?: string): Promise<any> {
      if (url.indexOf('/sobjects/')) {
         return {
            Body: 'text'
         } as any
      }
      return {} as any
   }



   get sessionKind() {
      return 'Git'
   }


   async commit(transaction: StorageTransaction): Promise<ChangeSetId> {
      /*  const { data } = await this._githubClient.repos.createOrUpdateFileContents({
          owner: this.org,
          repo: this.repo,
          path: path,
          message: "Update " + name,
          content: encodeToBase64(value),
          committer: {
             name: `SF Explorer Bot`,
             email: "your-email",
          },
          author: {
             name: "SF Explorer Bot",
             email: "your-email",
          },
          sha: sha
       })
 
       return data */
      return null
   }

   async getChangeLog(): Promise<StorageChangeLog> {
      if (!this.commits) {
         const { data } = (await this._githubClient.rest.repos.listCommits({
            owner: this.org,
            repo: this.repo,

         }))
         this.commits = {
            changes: data.map(c => ({
               id: c.sha,
               from: c.parents.map(p => p.sha),
               authors: c.commit.author,
               message: c.commit.message,
            } as StorageChangeStatus))
         }
         console.log(this.commits)
      }
      return this.commits
   }

   async retrieveCommit(sha) {
      if (this.url.endsWith('/repository/')) {
         //gitlab
         const response = await fetch(`${this.url}/commits/${sha}/diff`, {
            headers: {
               Authorization: `Bearer ${this.password}`
            }
         })
         if (response.status !== 200) {
            throw new Error('Invalid query ' + this.url)
         }
         const jsonData = await response.json()
         return { files: jsonData }

      } else {
         const commit = (await this._githubClient.rest.repos.getCommit({
            owner: this.org,
            repo: this.repo,
            ref: sha,
         })).data
         return commit
      }


   }

   async getFileLog(path: FileKey): Promise<StorageChangeLog> {
      /* if (this.url.endsWith('/repository/')) {
         //gitlab
         const fullPath = path.indexOf('force-app/') > -1 ? path : ('force-app/core/main/default' + path)
         const response = await fetch(`${this.url}commits?path=${encodeURI(fullPath)}&ref_name=${this.branch}`, {
            headers: {
               Authorization: `Bearer ${this.password}`
            }
         })
         if (response.status !== 200) {
            throw new Error('Invalid query ' + this.url)
         }
         const jsonData = await response.json()
         return jsonData
         //console.log(jsonData)
      } else {
         const fullPath = path.indexOf('force-app/') > -1 ? path : ('force-app/main/default' + path)
         const commits = (await this._githubClient.rest.repos.listCommits({
            owner: this.org,
            repo: this.repo,
            path: fullPath
         })).data
         return commits
      } */
      return null
   }

   async retrieveFiles() {
      this._githubClient = new Octokit({ auth: this.password })

      const response = await this._githubClient.request("GET /repos/{org}/{repo}/git/trees/{branch}", {
         org: this.org,
         repo: this.repo,
         branch: this.branch,
         recursive: 3
      })
      this._files = response.data.tree
   }

   async initialize() {

      if (this.url.endsWith('/repository/')) {
         this.branch = "trunk"
         //gitlab
         const response = await fetch(`${this.url}commits?ref_name=${this.branch}&all=true`, {
            headers: {
               Authorization: `Bearer ${this.password}`
            }
         })
         if (response.status !== 200) {
            throw new Error('Invalid query ' + this.url)
         }
         const jsonData = await response.json()
         this.commits = jsonData
         console.log(jsonData)
      } else {
         await this.retrieveFiles()
      }

   }
}
