import { file, command, directory } from "@polycuber/script.cli"
import { dirname } from "node:path"

function installPackage(path, url) {
   if (!directory.exists(path) && url) command.exec(`git clone ${url}`, { cwd: dirname(path) })
   else if (url) command.exec(`git pull`, { cwd: path, ignoreError: true })
   else if (!directory.exists(path)) throw `Package '${path}'not found`
   //patchPackage(path, "@jointhedots/gear", "file:\\\C:\\dev\\explorer\\jointhedots-gear")
   command.exec("pnpm install --force", { cwd: path })
   command.exec("pnpm run build", { cwd: path, ignoreError: true })
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
}

// Install packages
//installPackage("packages/jointhedots-cortex", "https://github.com/Join-The-Dots/jointhedots-cortex.git")
installPackage("packages/jointhedots-core")
installPackage("packages/jointhedots-scripting")
installPackage("packages/jointhedots-ui")

// Install playgrounds
installPackage("playgrounds/playground-ui")
