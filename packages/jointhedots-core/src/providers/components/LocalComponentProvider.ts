import { createComponentPublication, matchComponentFilter } from "../../components/helpers.ts"
import { type ComponentFilter, type ComponentID, type ComponentManifest, type ComponentPublication, type IComponentProvider } from "../../components/components.ts"
import { InMemComponentProvider } from "./InMemComponentProvider.ts"

const STORAGE_VERSION = 6

const STORES = {
   components: "components_v2",
   services: "components_services_v2",
   manifests: "components_manifests_v2",
} as const

const OLD_STORES = ["components", "components_services", "components_manifests"] as const

function createV2Stores(db: IDBDatabase) {
   const componentsStore = db.createObjectStore(STORES.components, { keyPath: "id" })
   componentsStore.createIndex("title", "title", { unique: false })

   const servicesStore = db.createObjectStore(STORES.services, { keyPath: ["component_id", "service"] })
   servicesStore.createIndex("component_id", "component_id", { unique: false })
   servicesStore.createIndex("service", "service", { unique: false })

   const manifestsStore = db.createObjectStore(STORES.manifests, { keyPath: "component_id" })
   manifestsStore.createIndex("component_id", "component_id", { unique: false })
}

function migrateOldToV2(db: IDBDatabase, transaction: IDBTransaction) {
   const hasOldStores = OLD_STORES.some(name => db.objectStoreNames.contains(name))
   if (!hasOldStores) return

   // Migrate components: keyPath component_id -> id
   if (db.objectStoreNames.contains("components")) {
      const oldStore = transaction.objectStore("components")
      const newStore = transaction.objectStore(STORES.components)
      const readReq = oldStore.getAll()
      readReq.onsuccess = () => {
         for (const record of readReq.result) {
            if ("component_id" in record && !("id" in record)) {
               record.id = record.component_id
               delete record.component_id
            }
            newStore.put(record)
         }
         db.deleteObjectStore("components")
      }
   }

   // Migrate components_manifests: rename services -> apis in manifest data
   if (db.objectStoreNames.contains("components_manifests")) {
      const oldStore = transaction.objectStore("components_manifests")
      const newStore = transaction.objectStore(STORES.manifests)
      const readReq = oldStore.getAll()
      readReq.onsuccess = () => {
         for (const record of readReq.result) {
            if (record.manifest && "services" in record.manifest && !("apis" in record.manifest)) {
               record.manifest.apis = record.manifest.services
               delete record.manifest.services
            }
            newStore.put(record)
         }
         db.deleteObjectStore("components_manifests")
      }
   }

   // Migrate components_services: copy as-is
   if (db.objectStoreNames.contains("components_services")) {
      const oldStore = transaction.objectStore("components_services")
      const newStore = transaction.objectStore(STORES.services)
      const readReq = oldStore.getAll()
      readReq.onsuccess = () => {
         for (const record of readReq.result) {
            newStore.put(record)
         }
         db.deleteObjectStore("components_services")
      }
   }
}

function openComponentDatabase(): Promise<IDBDatabase> {
   return new Promise((resolve, reject) => {
      const request = window.indexedDB.open("LocalComponents", STORAGE_VERSION)

      request.onerror = (e) => {
         console.error('Database error:', e.target["error"])
         reject(e.target["error"])
      }

      request.onupgradeneeded = (event) => {
         const oldVersion = event.oldVersion
         console.log("Upgrade LocalComponents from", oldVersion, "to", STORAGE_VERSION)
         const db = request.result
         const transaction = request.transaction

         // Create v2 stores if they don't exist yet
         if (!db.objectStoreNames.contains(STORES.components)) {
            createV2Stores(db)

            // Auto-fill v2 stores from old tables when they exist
            migrateOldToV2(db, transaction)
         }
      }

      request.onsuccess = () => {
         const db = request.result

         db.onerror = (event) => {
            console.error('Database error:', event)
         }

         resolve(request.result)
      }

   })
}

function getComponentManifest(db: IDBDatabase, component_id: string): Promise<ComponentManifest> {
   return new Promise((resolve, reject) => {
      const results: ComponentPublication[] = []
      const transaction = db.transaction([STORES.manifests], "readonly")
      const components_store = transaction.objectStore(STORES.manifests)
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
   const transaction = db.transaction([STORES.components, STORES.services], "readonly")
   const components_store = transaction.objectStore(STORES.components)
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
   const transaction = db.transaction([STORES.components, STORES.services], "readonly")
   const components_store = transaction.objectStore(STORES.components)
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
      const transaction = db.transaction([STORES.components], "readonly")
      const store = transaction.objectStore(STORES.components)
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
   const transaction = db.transaction([STORES.services], "readonly")
   const components_services_store = transaction.objectStore(STORES.services)
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
      const db_T = db.transaction([STORES.components, STORES.services, STORES.manifests], "readwrite")

      const components_store = db_T.objectStore(STORES.components)
      components_store.put(entry)

      const components_services = db_T.objectStore(STORES.services)
      for (const srv of entry.services) {
         components_services.put({
            component_id: entry.id,
            service: srv,
         })
      }

      const components_manifests = db_T.objectStore(STORES.manifests)
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
         const db_T = db.transaction([STORES.components, STORES.services, STORES.manifests], "readwrite")

         const components_store = db_T.objectStore(STORES.components)
         components_store.delete(component_id)

         const components_services = db_T.objectStore(STORES.services)
         for (const srv of entry.services) {
            components_services.delete([component_id, srv])
         }

         const components_manifests = db_T.objectStore(STORES.manifests)
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
