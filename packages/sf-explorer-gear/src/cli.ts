#!/usr/bin/env node
import "source-map-support/register.js"
import Process from "node:process"
import Path from 'node:path'
import Yargs from "yargs"
import { hideBin } from 'yargs/helpers'
import { publish_aws_s3 } from './publish.js'
import { command_run } from "./run.js"
import { StorageFiles } from "./storage.js"
import { open_workspace } from "./workspace.js"
import { build_workspace } from "./build-workspace.js"
import { build_library, make_libname } from "./build-library.js"

export function command_build() {
   return {
      command: 'build',
      describe: 'Build web application',
      builder: (yargs) => yargs
         .option("env", {
            type: "string",
            default: "development",
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
         const storage = new StorageFiles(outputDir)
         const ws = await open_workspace(".", argv.features)
         console.time("build")
         await build_workspace(ws, storage, argv.mode, argv.dist, argv.port)
         console.timeEnd("build")
      }
   }
}

export function command_serve() {
   return {
      command: 'serve',
      describe: 'Server web application with continues build',
      builder: (yargs) => yargs
         .option("env", {
            type: "string",
            default: "development",
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
         const storage = new StorageFiles(argv.dist)
         const ws = await open_workspace(".", argv.features)
         await build_workspace(ws, storage, argv.mode, argv.dist, argv.port)
      }
   }
}

export function command_make() {
   return {
      command: 'make',
      describe: 'Make web library',
      builder: (yargs) => yargs
         .option("env", {
            type: "string",
            default: "development",
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
            default: "./dist",
         }),
      handler: async (argv) => {
         const ws = await open_workspace(".", argv.features)
         for (const lib of ws.libraries) {
            const lib_path = Path.resolve(argv.dist, make_libname(lib.name))
            await build_library(ws, lib, lib_path)
         }
      }
   }
}

export function command_publish() {
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
Yargs(hideBin(Process.argv)).scriptName("explorer-gear")
   .command(command_build())
   .command(command_serve())
   .command(command_publish())
   .command(command_make())
   .command(command_run())
   .command(command_fail())
   .showHelpOnFail(true)
   .help()
   .parse()
