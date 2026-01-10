import { command } from "@polycuber/script.cli"

command.exec("npm install", { cwd: "packages/jointhedots-core" })
command.exec("npm run build", { cwd: "packages/jointhedots-core", ignoreError: true })

command.exec("npm install", { cwd: "packages/jointhedots-agentic" })
command.exec("npm run build", { cwd: "packages/jointhedots-agentic", ignoreError: true })

command.exec("npm install", { cwd: "packages/jointhedots-ui" })
command.exec("npm run build", { cwd: "packages/jointhedots-ui", ignoreError: true })

command.exec("npm install", { cwd: "packages/jointhedots-agent" })
command.exec("npm run build", { cwd: "packages/jointhedots-agent", ignoreError: true })

command.exec("npm install", { cwd: "playgrounds/playground-ui" })
command.exec("npm run build", { cwd: "playgrounds/playground-ui", ignoreError: true })
