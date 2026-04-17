import { createComponentPublication, matchComponentFilter } from "../../components/helpers.ts"
import { type ComponentFilter, type ComponentID, type ComponentManifest, type ComponentPublication, type IComponentProvider } from "../../components/components.ts"
import { InMemComponentProvider } from "./InMemComponentProvider.ts"

const DB_NAME = "LocalComponents_v2"
const DB_VERSION = 1

// Store names that may exist in the old "LocalComponents" database
const OLD_V1_STORES = ["components", "components_services", "components_manifests"] as const
const OLD_V2_STORES = ["components_v2", "components_services_v2", "components_manifests_v2"] as const

function createStores(db: IDBDatabase) {
   const componentsStore = db.createObjectStore("components", { keyPath: "id" })
   componentsStore.createIndex("title", "title", { unique: false })

   const servicesStore = db.createObjectStore("components_services", { keyPath: ["component_id", "service"] })
   servicesStore.createIndex("component_id", "component_id", { unique: false })
   servicesStore.createIndex("service", "service", { unique: false })

   const manifestsStore = db.createObjectStore("components_manifests", { keyPath: "component_id" })
   manifestsStore.createIndex("component_id", "component_id", { unique: false })
}

function readAllFromStore(db: IDBDatabase, storeName: string): Promise<any[]> {
   return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], "readonly")
      const req = tx.objectStore(storeName).getAll()
      req.onsuccess = () => resolve(req.result ?? [])
      req.onerror = (e) => reject(e.target["error"])
   })
}

async function bootstrapFromOldDatabase(newDb: IDBDatabase): Promise<void> {
   let oldDb: IDBDatabase
   try {
      oldDb = await new Promise<IDBDatabase>((resolve, reject) => {
         const req = window.indexedDB.open("LocalComponents")
         req.onerror = () => reject(req.error)
         req.onsuccess = () => resolve(req.result)
      })
   } catch {
      return // Old database doesn't exist or can't be opened
   }

   try {
      const storeNames = Array.from(oldDb.objectStoreNames)
      const hasV2 = OLD_V2_STORES.some(n => storeNames.includes(n))
      const hasV1 = OLD_V1_STORES.some(n => storeNames.includes(n))
      if (!hasV2 && !hasV1) return

      // Read from v2 stores if available, otherwise fall back to v1
      const srcComponents = hasV2 && storeNames.includes("components_v2") ? "components_v2"
         : storeNames.includes("components") ? "components" : null
      const srcServices = hasV2 && storeNames.includes("components_services_v2") ? "components_services_v2"
         : storeNames.includes("components_services") ? "components_services" : null
      const srcManifests = hasV2 && storeNames.includes("components_manifests_v2") ? "components_manifests_v2"
         : storeNames.includes("components_manifests") ? "components_manifests" : null

      const [components, services, manifests] = await Promise.all([
         srcComponents ? readAllFromStore(oldDb, srcComponents) : [],
         srcServices ? readAllFromStore(oldDb, srcServices) : [],
         srcManifests ? readAllFromStore(oldDb, srcManifests) : [],
      ])

      const tx = newDb.transaction(["components", "components_services", "components_manifests"], "readwrite")

      const compStore = tx.objectStore("components")
      for (const record of components) {
         // Normalize old v1 keyPath component_id -> id
         if ("component_id" in record && !("id" in record)) {
            record.id = record.component_id
            delete record.component_id
         }
         compStore.put(record)
      }

      const svcStore = tx.objectStore("components_services")
      for (const record of services) {
         svcStore.put(record)
      }

      const manStore = tx.objectStore("components_manifests")
      for (const record of manifests) {
         // Normalize old v1 manifest: rename services -> apis
         if (record.manifest && "services" in record.manifest && !("apis" in record.manifest)) {
            record.manifest.apis = record.manifest.services
            delete record.manifest.services
         }
         manStore.put(record)
      }

      await new Promise<void>((resolve, reject) => {
         tx.oncomplete = () => resolve()
         tx.onerror = (e) => reject(e.target["error"])
      })
   } finally {
      oldDb.close()
   }
}

function openComponentDatabase(): Promise<IDBDatabase> {
   return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION)
      let needsBootstrap = false

      request.onerror = (e) => {
         console.error('Database error:', e.target["error"])
         reject(e.target["error"])
      }

      request.onupgradeneeded = () => {
         const db = request.result
         if (!db.objectStoreNames.contains("components")) {
            createStores(db)
            needsBootstrap = true
         }
      }

      request.onsuccess = async () => {
         const db = request.result
         db.onerror = (event) => console.error('Database error:', event)

         if (needsBootstrap) {
            try {
               await bootstrapFromOldDatabase(db)
            } catch (e) {
               console.error('Migration from LocalComponents failed:', e)
            }
         }

         resolve(db)
      }
   })
}

function getComponentManifest(db: IDBDatabase, component_id: string): Promise<ComponentManifest> {
   return new Promise((resolve, reject) => {
      const results: ComponentPublication[] = []
      const transaction = db.transaction(["components_manifests"], "readonly")
      const components_store = transaction.objectStore("components_manifests")
      const components_req = components_store.getAll(component_id)
      components_req.onsuccess = () => {
         resolve(components_req.result?.[0]?.manifest)
      }
      components_req.onerror = (e) => {
         reject(e.target["error"])
      }
   })
}

function getComponentPublication(db: IDBDatabase, components_id: string): Promise<ComponentPublication> {
   const transaction = db.transaction(["components", "components_services"], "readonly")
   const components_store = transaction.objectStore("components")
   return new Promise((resolve, reject) => {
      const components_req = components_store.get(components_id)
      components_req.onsuccess = () => {
         resolve(components_req.result)
      }
      components_req.onerror = (e) => {
         reject(e.target["error"])
      }
   })
}

function getComponentsPublications(db: IDBDatabase, components_ids: string[]): Promise<ComponentPublication[]> {
   const transaction = db.transaction(["components", "components_services"], "readonly")
   const components_store = transaction.objectStore("components")
   const pendings = []
   for (const components_id of components_ids) {
      pendings.push(new Promise((resolve, reject) => {
         const components_req = components_store.get(components_id)
         components_req.onsuccess = () => {
            resolve(components_req.result)
         }
         components_req.onerror = (e) => {
            reject(e.target["error"])
         }
      }))
   }
   return Promise.all(pendings)
}

function filterComponentsPublications(db: IDBDatabase, filter: (value: ComponentPublication) => boolean): Promise<ComponentPublication[]> {
   return new Promise((resolve, reject) => {
      const transaction = db.transaction(["components"], "readonly")
      const store = transaction.objectStore("components")
      const request = store.openCursor()
      const results: any[] = []
      request.onsuccess = () => {
         const cursor = request.result
         if (cursor) {
            const value = cursor["value"] as ComponentPublication
            if (filter(value)) {
               results.push(cursor.value) // Store the full entry
            }
            cursor.continue() // Move to the next entry
         } else {
            // When no more entries, resolve the promise with the results array
            resolve(results)
         }
      }

      request.onerror = () => {
         reject(request.error)
      }
   })
}

type ServiceIndexRecord = {
   service: string
   component_id: string
}

function findComponentsByService(db: IDBDatabase, services: string[], results: Set<ComponentID>): Promise<unknown> {
   const transaction = db.transaction(["components_services"], "readonly")
   const components_services_store = transaction.objectStore("components_services")
   const service_index = components_services_store.index("service")
   const pendings = []
   for (const service of services) {
      pendings.push(new Promise((resolve, reject) => {
         const components_ids_req = service_index.getAll(service) as IDBRequest<ServiceIndexRecord[]>
         components_ids_req.onsuccess = async () => {
            for (const found of components_ids_req.result) {
               if (found.service === service) results.add(found.component_id)
            }
            resolve(undefined)
         }
         components_ids_req.onerror = (e) => {
            reject(e.target["error"])
         }
      }))
   }
   return Promise.all(pendings)
}

async function searchComponents(db: IDBDatabase, filter: ComponentFilter): Promise<ComponentPublication[]> {
   const { services } = filter
   if (services && services.length > 0) {
      const results = []
      const found_ids = new Set<ComponentID>()
      await findComponentsByService(db, services, found_ids)
      for (const entry of await getComponentsPublications(db, Array.from(found_ids))) {
         if (matchComponentFilter(entry, filter)) {
            results.push(entry)
         }
      }
      return results
   }
   else {
      return filterComponentsPublications(db, (entry) => {
         return matchComponentFilter(entry, filter)
      })
   }
}

function storeComponent(db: IDBDatabase, manifest: ComponentManifest): Promise<ComponentPublication> {
   return new Promise(async (resolve, reject) => {
      const entry = await createComponentPublication(manifest)
      const db_T = db.transaction(["components", "components_services", "components_manifests"], "readwrite")

      const components_store = db_T.objectStore("components")
      components_store.put(entry)

      const components_services = db_T.objectStore("components_services")
      for (const srv of entry.services) {
         components_services.put({
            component_id: entry.id,
            service: srv,
         })
      }

      const components_manifests = db_T.objectStore("components_manifests")
      components_manifests.put({
         component_id: entry.id,
         manifest: manifest,
      })

      db_T.onerror = (e) => reject(e.target["error"])
      db_T.oncomplete = () => resolve(entry)
      db_T.commit()
   })
}

function deleteComponent(db: IDBDatabase, component_id: string): Promise<boolean> {
   return new Promise(async (resolve, reject) => {
      const entry = await getComponentPublication(db, component_id)
      if (entry) {
         const db_T = db.transaction(["components", "components_services", "components_manifests"], "readwrite")

         const components_store = db_T.objectStore("components")
         components_store.delete(component_id)

         const components_services = db_T.objectStore("components_services")
         for (const srv of entry.services) {
            components_services.delete([component_id, srv])
         }

         const components_manifests = db_T.objectStore("components_manifests")
         components_manifests.delete(component_id)

         db_T.onerror = (e) => reject(e.target["error"])
         db_T.oncomplete = () => resolve(true)
         db_T.commit()
      }
      else {
         resolve(false)
      }
   })
}

class BrowserComponentProvider implements IComponentProvider {
   db = openComponentDatabase()
   async get_component_publication(id: string): Promise<ComponentPublication> {
      const results = await getComponentsPublications(await this.db, [id])
      return results[0]
   }
   async search_component_publications(filter: ComponentFilter): Promise<ComponentPublication[]> {
      return searchComponents(await this.db, filter)
   }
   async get_component_manifest(id: string): Promise<ComponentManifest> {
      return getComponentManifest(await this.db, id)
   }
   async set_component_manifest(component_id: string, manifest: ComponentManifest): Promise<boolean> {
      return false
   }
   async add_component(manifest: ComponentManifest): Promise<ComponentPublication> {
      return storeComponent(await this.db, manifest)
   }
   async delete_component(component_id: string): Promise<boolean> {
      return deleteComponent(await this.db, component_id)
   }
}

export function createLocalComponentProvider(): IComponentProvider {
   try {
      if (window) {
         return new BrowserComponentProvider()
      }
   }
   catch (_) { }
   return new InMemComponentProvider()
}
