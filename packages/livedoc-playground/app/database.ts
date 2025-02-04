

function open_components_db() {
   return new Promise((resolve) => {
      const request = indexedDB.open("infinite-slick", 1)
      request.onupgradeneeded = function (event) {
         const db = request.result
         if (event.oldVersion < 1) {
            const store = db.createObjectStore("components", { keyPath: "id" })
         }
         resolve(db)
      }
      request.onsuccess = function () {
         resolve(request.result)
      }
   })
}
