import { command, directory } from "@polycuber/script.cli"
import { dirname } from "node:path"
import Path from "node:path"

export const PackageManager = {
   packages: [],
   add(path, url) {
      this.packages.push({ path: Path.resolve(path), url })
   },
   install() {
      for (const pkg of this.packages) {
         const { path, url } = pkg

         // Prepare directory
         if (!directory.exists(path) && url) command.exec(`git clone ${url}`, { cwd: dirname(path) })
         else if (url) command.exec(`git pull`, { cwd: path, ignoreError: true })
         else if (!directory.exists(path)) throw `Package '${path}'not found`

         //patchPackage(path, "@jointhedots/gear", "file:\\\C:\\dev\\explorer\\jointhedots-gear")
         command.exec("pnpm install --force", { cwd: path })
      }
      for (const pkg of this.packages) {
         const { path } = pkg
         command.exec("pnpm run build", { cwd: path, ignoreError: true })
      }
   },
   build() {
      for (const pkg of this.packages) {
         const { path } = pkg
         command.exec("pnpm run build", { cwd: path })
      }
   },
   publish() {
      this.build()
      for (const pkg of this.packages) {
         const { path } = pkg
         const name = directory.filenames(Path.resolve(path, "dist"))[0]
         command.exec("npm publish --access public", { cwd: Path.resolve(path, "dist", name) })
      }
   },
}

function patchPackage(path, packageId, version) {
   const data = file.read.json(path + "/package.json")
   file.write.json(path + "/package.json", {
      ...data,
      devDependencies: {
         ...data.devDependencies,
         [packageId]: version
      }
   })
}
