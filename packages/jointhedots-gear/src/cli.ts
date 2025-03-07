#!/usr/bin/env node
import "source-map-support/register.js"
import Process from "node:process"
import Path from 'node:path'
import Fs from 'node:fs'
import Yargs, { CommandModule } from "yargs"
import { hideBin } from 'yargs/helpers'
import { publish_aws_s3 } from './publish.js'
import { command_run } from "./run.js"
import { StorageFiles } from "./storage.js"
import { open_workspace } from "./workspace.js"
import { build_workspace, BuildMode } from "./build-workspace.js"
import { build_library, make_libname } from "./build-library.js"

export function command_build(): CommandModule<any, {
   mode?: BuildMode
   features?: string
   port?: number
   dist?: string
}> {
   return {
      command: 'build',
      describe: 'Build web application',
      builder: (yargs) => yargs
         .option("mode", {
            type: "string",
            choices: ["production", "development"],
            default: "production",
         })
         .option("features", {
            type: "string",
            default: "",
         })
         .option("port", {
            type: "number",
            default: 0,
         })
         .option("dist", {
            type: "string",
            default: "./dist/web",
         }),
      handler: async (argv) => {
         const ws = await open_workspace(".", argv.features)
         const storage = new StorageFiles(ws.name, argv.dist)
         console.time("build")
         await build_workspace({
            ws,
            storage,
            mode: argv.mode,
            port: argv.port,
         })
         console.timeEnd("build")
      }
   }
}

export function command_serve(): CommandModule<any, {
   mode?: BuildMode
   features?: string
   port?: number
   dist?: string
}> {
   return {
      command: 'serve',
      describe: 'Server web application with continues build',
      builder: (yargs) => yargs
         .option("mode", {
            type: "string",
            choices: ["production", "development"],
            default: "production",
         })
         .option("features", {
            type: "string",
            default: "",
         })
         .option("port", {
            type: "number",
            default: 3000,
         })
         .option("dist", {
            type: "string",
            default: "./dist/web",
         }),
      handler: async (argv) => {
         const ws = await open_workspace(".", argv.features)
         const storage = new StorageFiles(ws.name, argv.dist)
         await build_workspace({
            ws,
            storage,
            mode: argv.mode,
            port: argv.port,
         })
      }
   }
}

export function command_make(): CommandModule<any, {
   features?: string
   watch?: boolean
   pack?: boolean
   versioned?: string
   libraries?: string
   dist?: string
}> {
   return {
      command: 'make',
      describe: 'Make web library',
      builder: (yargs) => yargs
         .option("libraries", {
            type: "string",
            default: "*",
            describe: "List of libraries to select, ex: lib1,lib2,..."
         })
         .option("features", {
            type: "string",
            describe: "List of features to select, ex: feature1,feature2,..."
         })
         .option("watch", {
            type: "boolean",
            describe: "Watch and rebuild on files change",
            default: false,
         })
         .option("pack", {
            type: "boolean",
            describe: "Ask to create tarball delivery"
         })
         .option("versioned", {
            type: "string",
            default: "*",
            describe: "Version applied to delivered package (use * for root package version)"
         })
         .option("dist", {
            type: "string",
            default: "./dist",
         }),
      handler: async (argv) => {
         const ws = await open_workspace(".", argv.features)

         let version = argv.versioned
         if (version === "*") {
            version = JSON.parse(Fs.readFileSync("package.json").toString())?.version
            console.log(`> use version: ${version}`)
         }

         let libraries = ws.libraries
         if (argv.libraries !== "*") {
            libraries = []
            for (const libname of argv.libraries.split(",")) {
               const lib = ws.get_library(libname)
               if (lib) libraries.push(lib)
               else console.error(`> library not found: ${libname}`)
            }
         }

         const pendings = []
         for (const lib of libraries) {
            const lib_path = Path.resolve(argv.dist, make_libname(lib.name))
            const storage = new StorageFiles(lib.name, lib_path)
            pendings.push(build_library({
               lib,
               storage,
               mode: BuildMode.Development,
               packageDir: argv.pack ? Path.resolve(argv.dist) : null,
               version: version,
               watch: argv.watch,
            }))
         }
         await Promise.all(pendings)
      }
   }
}

export function command_publish(): CommandModule<any, {
   bucket?: string
   region?: string
   features?: string
   dist?: string
}> {
   return {
      command: 'publish',
      describe: 'publish resources to AWS S3',
      builder: (yargs) => yargs
         .option("bucket", {
            type: "string",
            required: true,
         })
         .option("region", {
            type: "string",
            default: "eu-north-1",
         })
         .option("features", {
            type: "string",
            default: "",
         })
         .option("dist", {
            type: "string",
            default: "./dist/web",
         }),
      handler: async (argv) => {
         const outputDir = Path.resolve(argv.dist)
         const ws = await open_workspace(".", argv.features)
         await publish_aws_s3(ws, argv.bucket, argv.region, outputDir)
      }
   }
}

function command_fail() {
   return {
      command: '*',
      handler: async (argv) => {
         throw "Error: Invalid command"
      }
   }
}
console.log(Process.argv)
Yargs(hideBin(Process.argv)).scriptName("jointhedots-gear")
   .command(command_build())
   .command(command_serve())
   .command(command_publish())
   .command(command_make())
   .command(command_run())
   .command(command_fail())
   .showHelpOnFail(true)
   .help()
   .parse()
