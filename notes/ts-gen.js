import { createGenerator, SchemaGenerator } from 'ts-json-schema-generator';

const base = createGenerator({
   tsconfig: 'tsconfig.json',
   minify: true,
   skipTypeCheck: true,
})

function generateSchema(path, type) {
   return new SchemaGenerator(base["program"], base["nodeParser"], base["typeFormatter"], {
      ...base["config"],
      path: 'packages\\playground-services\\components\\GithubComponent\\component.tsx',
      type: "GithubServiceManifest",
   }).createSchema("GithubServiceManifest");
}

function generateSchemaText(path, type) {
   return JSON.stringify(generateSchema(path, type), null, 2)
}

console.log(generateSchemaText('packages\\playground-services\\components\\GithubComponent\\component.tsx', "GithubServiceManifest"))
console.log(generateSchemaText('packages\\jointhedots-core\\library\\components.ts', "ComponentManifest"))
