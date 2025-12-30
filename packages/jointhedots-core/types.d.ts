declare module '@jointhedots/core/common/types' {
    export interface MapLike<T> {
        [index: string]: T;
    }
    export type ObjectClass<T extends Object = any> = new (...args: any[]) => T;
    export type Overwrite<Base, Overrides> = Omit<Base, keyof Overrides> & Overrides;
    export type Async<T> = T | Promise<T>;
    export type OneOrMany<T> = T | T[];
    export function areSimilarObjects(x: MapLike<any>, y: MapLike<any>): boolean;
    export function listOneOrMany<T>(cnt: OneOrMany<T>): Generator<T>;
    export const OneOrMany: {
        list(): void;
    };
}

declare module '@jointhedots/core/schema/schema' {
    import { z } from 'zod';
    export const JSONSchema7TypeNameSchema: z.ZodEnum<{
        string: "string";
        number: "number";
        boolean: "boolean";
        object: "object";
        integer: "integer";
        array: "array";
        null: "null";
    }>;
    export const JSONSchema7TypeNameCustomSchema: z.ZodEnum<{
        function: "function";
        module: "module";
        service: "service";
    }>;
    export const JSONSchema7TypeSchema: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>;
    export const ChapterSchema: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        properties: z.ZodOptional<z.ZodArray<z.ZodString>>;
        secondaryProperties: z.ZodOptional<z.ZodArray<z.ZodString>>;
        patternProperties: z.ZodOptional<z.ZodArray<z.ZodString>>;
        additionalProperties: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
    export const DocumentationSchema: z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
        chapters: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            properties: z.ZodOptional<z.ZodArray<z.ZodString>>;
            secondaryProperties: z.ZodOptional<z.ZodArray<z.ZodString>>;
            patternProperties: z.ZodOptional<z.ZodArray<z.ZodString>>;
            additionalProperties: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
        additionalChapter: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
    export const BindingSchema: z.ZodObject<{
        source: z.ZodString;
    }, z.core.$strip>;
    export const ExpressionSchema: z.ZodObject<{
        type: z.ZodString;
    }, z.core.$loose>;
    export const JSONSchema7DefinitionSchema: z.ZodType<any>;
    export const TemplateSchema: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        icon: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        args: z.ZodOptional<z.ZodArray<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        content: z.ZodObject<{
            type: z.ZodString;
        }, z.core.$loose>;
    }, z.core.$strip>;
    export const DockingSchema: z.ZodObject<{
        view: z.ZodString;
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
    }, z.core.$strip>;
    export const SecurityRuleSchema: z.ZodObject<{
        check: z.ZodAny;
    }, z.core.$strip>;
    export const SecurityGuardSchema: z.ZodUnion<readonly [z.ZodLiteral<"safe">, z.ZodString, z.ZodObject<{
        rule: z.ZodString;
    }, z.core.$loose>]>;
    export const ResourceLinkSchema: z.ZodString;
    export const ResourceEntrySchema: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
        type: z.ZodString;
        data: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>;
    export const JSONSchemaStandardSchema: z.ZodObject<{
        $id: z.ZodOptional<z.ZodString>;
        $ref: z.ZodOptional<z.ZodString>;
        $schema: z.ZodOptional<z.ZodString>;
        $comment: z.ZodOptional<z.ZodString>;
        $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        type: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            string: "string";
            number: "number";
            boolean: "boolean";
            object: "object";
            integer: "integer";
            array: "array";
            null: "null";
        }>, z.ZodEnum<{
            function: "function";
            module: "module";
            service: "service";
        }>]>>;
        enum: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>>;
        const: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>;
        multipleOf: z.ZodOptional<z.ZodNumber>;
        maximum: z.ZodOptional<z.ZodNumber>;
        exclusiveMaximum: z.ZodOptional<z.ZodNumber>;
        minimum: z.ZodOptional<z.ZodNumber>;
        exclusiveMinimum: z.ZodOptional<z.ZodNumber>;
        maxLength: z.ZodOptional<z.ZodNumber>;
        minLength: z.ZodOptional<z.ZodNumber>;
        pattern: z.ZodOptional<z.ZodString>;
        items: z.ZodOptional<z.ZodUnion<readonly [z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>, z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>]>>;
        additionalItems: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        maxItems: z.ZodOptional<z.ZodNumber>;
        minItems: z.ZodOptional<z.ZodNumber>;
        uniqueItems: z.ZodOptional<z.ZodBoolean>;
        contains: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        maxProperties: z.ZodOptional<z.ZodNumber>;
        minProperties: z.ZodOptional<z.ZodNumber>;
        required: z.ZodOptional<z.ZodArray<z.ZodString>>;
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        patternProperties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        additionalProperties: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        dependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>, z.ZodArray<z.ZodString>]>>>;
        propertyNames: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        if: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        then: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        else: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        allOf: z.ZodOptional<z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        anyOf: z.ZodOptional<z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        oneOf: z.ZodOptional<z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        not: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        format: z.ZodOptional<z.ZodString>;
        contentMediaType: z.ZodOptional<z.ZodString>;
        contentEncoding: z.ZodOptional<z.ZodString>;
        definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>;
        readOnly: z.ZodOptional<z.ZodBoolean>;
        writeOnly: z.ZodOptional<z.ZodBoolean>;
        examples: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>;
    }, z.core.$strip>;
    export const JSONSchemaCustomSchema: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        icon: z.ZodOptional<z.ZodString>;
        doc: z.ZodOptional<z.ZodObject<{
            description: z.ZodOptional<z.ZodString>;
            chapters: z.ZodOptional<z.ZodArray<z.ZodObject<{
                title: z.ZodOptional<z.ZodString>;
                properties: z.ZodOptional<z.ZodArray<z.ZodString>>;
                secondaryProperties: z.ZodOptional<z.ZodArray<z.ZodString>>;
                patternProperties: z.ZodOptional<z.ZodArray<z.ZodString>>;
                additionalProperties: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>>;
            additionalChapter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        $error: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Error, Error>]>>;
        args: z.ZodOptional<z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        placeholder: z.ZodOptional<z.ZodBoolean>;
        resources: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
            type: z.ZodString;
            data: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>>;
        security: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"safe">, z.ZodString, z.ZodObject<{
            rule: z.ZodString;
        }, z.core.$loose>]>>;
        "allow-origin": z.ZodOptional<z.ZodString>;
        docking: z.ZodOptional<z.ZodObject<{
            view: z.ZodString;
            properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        }, z.core.$strip>>;
        templates: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            icon: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            args: z.ZodOptional<z.ZodArray<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
            content: z.ZodObject<{
                type: z.ZodString;
            }, z.core.$loose>;
        }, z.core.$strip>>>;
        binding: z.ZodOptional<z.ZodObject<{
            source: z.ZodString;
        }, z.core.$strip>>;
        aliases: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>;
    export const ServiceSchemaSchema: z.ZodObject<{
        $id: z.ZodOptional<z.ZodString>;
        $ref: z.ZodOptional<z.ZodString>;
        $schema: z.ZodOptional<z.ZodString>;
        $comment: z.ZodOptional<z.ZodString>;
        $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        enum: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>>;
        const: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>;
        multipleOf: z.ZodOptional<z.ZodNumber>;
        maximum: z.ZodOptional<z.ZodNumber>;
        exclusiveMaximum: z.ZodOptional<z.ZodNumber>;
        minimum: z.ZodOptional<z.ZodNumber>;
        exclusiveMinimum: z.ZodOptional<z.ZodNumber>;
        maxLength: z.ZodOptional<z.ZodNumber>;
        minLength: z.ZodOptional<z.ZodNumber>;
        pattern: z.ZodOptional<z.ZodString>;
        items: z.ZodOptional<z.ZodUnion<readonly [z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>, z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>]>>;
        additionalItems: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        maxItems: z.ZodOptional<z.ZodNumber>;
        minItems: z.ZodOptional<z.ZodNumber>;
        uniqueItems: z.ZodOptional<z.ZodBoolean>;
        contains: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        maxProperties: z.ZodOptional<z.ZodNumber>;
        minProperties: z.ZodOptional<z.ZodNumber>;
        required: z.ZodOptional<z.ZodArray<z.ZodString>>;
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        patternProperties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        additionalProperties: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        dependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>, z.ZodArray<z.ZodString>]>>>;
        propertyNames: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        if: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        then: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        else: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        allOf: z.ZodOptional<z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        anyOf: z.ZodOptional<z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        oneOf: z.ZodOptional<z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        not: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        format: z.ZodOptional<z.ZodString>;
        contentMediaType: z.ZodOptional<z.ZodString>;
        contentEncoding: z.ZodOptional<z.ZodString>;
        definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        description: z.ZodOptional<z.ZodString>;
        default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>;
        readOnly: z.ZodOptional<z.ZodBoolean>;
        writeOnly: z.ZodOptional<z.ZodBoolean>;
        examples: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>;
        title: z.ZodOptional<z.ZodString>;
        icon: z.ZodOptional<z.ZodString>;
        doc: z.ZodOptional<z.ZodObject<{
            description: z.ZodOptional<z.ZodString>;
            chapters: z.ZodOptional<z.ZodArray<z.ZodObject<{
                title: z.ZodOptional<z.ZodString>;
                properties: z.ZodOptional<z.ZodArray<z.ZodString>>;
                secondaryProperties: z.ZodOptional<z.ZodArray<z.ZodString>>;
                patternProperties: z.ZodOptional<z.ZodArray<z.ZodString>>;
                additionalProperties: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>>;
            additionalChapter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        $error: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Error, Error>]>>;
        args: z.ZodOptional<z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        placeholder: z.ZodOptional<z.ZodBoolean>;
        resources: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
            type: z.ZodString;
            data: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>>;
        security: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"safe">, z.ZodString, z.ZodObject<{
            rule: z.ZodString;
        }, z.core.$loose>]>>;
        "allow-origin": z.ZodOptional<z.ZodString>;
        docking: z.ZodOptional<z.ZodObject<{
            view: z.ZodString;
            properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        }, z.core.$strip>>;
        templates: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            icon: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            args: z.ZodOptional<z.ZodArray<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
            content: z.ZodObject<{
                type: z.ZodString;
            }, z.core.$loose>;
        }, z.core.$strip>>>;
        binding: z.ZodOptional<z.ZodObject<{
            source: z.ZodString;
        }, z.core.$strip>>;
        aliases: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        type: z.ZodLiteral<"service">;
        $spec: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    export const FunctionSchemaSchema: z.ZodObject<{
        $id: z.ZodOptional<z.ZodString>;
        $ref: z.ZodOptional<z.ZodString>;
        $schema: z.ZodOptional<z.ZodString>;
        $comment: z.ZodOptional<z.ZodString>;
        $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        enum: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>>;
        const: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>;
        multipleOf: z.ZodOptional<z.ZodNumber>;
        maximum: z.ZodOptional<z.ZodNumber>;
        exclusiveMaximum: z.ZodOptional<z.ZodNumber>;
        minimum: z.ZodOptional<z.ZodNumber>;
        exclusiveMinimum: z.ZodOptional<z.ZodNumber>;
        maxLength: z.ZodOptional<z.ZodNumber>;
        minLength: z.ZodOptional<z.ZodNumber>;
        pattern: z.ZodOptional<z.ZodString>;
        items: z.ZodOptional<z.ZodUnion<readonly [z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>, z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>]>>;
        additionalItems: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        maxItems: z.ZodOptional<z.ZodNumber>;
        minItems: z.ZodOptional<z.ZodNumber>;
        uniqueItems: z.ZodOptional<z.ZodBoolean>;
        contains: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        maxProperties: z.ZodOptional<z.ZodNumber>;
        minProperties: z.ZodOptional<z.ZodNumber>;
        required: z.ZodOptional<z.ZodArray<z.ZodString>>;
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        patternProperties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        additionalProperties: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        dependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>, z.ZodArray<z.ZodString>]>>>;
        propertyNames: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        if: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        then: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        else: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        allOf: z.ZodOptional<z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        anyOf: z.ZodOptional<z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        oneOf: z.ZodOptional<z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        not: z.ZodOptional<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        format: z.ZodOptional<z.ZodString>;
        contentMediaType: z.ZodOptional<z.ZodString>;
        contentEncoding: z.ZodOptional<z.ZodString>;
        definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        description: z.ZodOptional<z.ZodString>;
        default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>;
        readOnly: z.ZodOptional<z.ZodBoolean>;
        writeOnly: z.ZodOptional<z.ZodBoolean>;
        examples: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodArray<z.ZodAny>]>>;
        title: z.ZodOptional<z.ZodString>;
        icon: z.ZodOptional<z.ZodString>;
        doc: z.ZodOptional<z.ZodObject<{
            description: z.ZodOptional<z.ZodString>;
            chapters: z.ZodOptional<z.ZodArray<z.ZodObject<{
                title: z.ZodOptional<z.ZodString>;
                properties: z.ZodOptional<z.ZodArray<z.ZodString>>;
                secondaryProperties: z.ZodOptional<z.ZodArray<z.ZodString>>;
                patternProperties: z.ZodOptional<z.ZodArray<z.ZodString>>;
                additionalProperties: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>>;
            additionalChapter: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        $error: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodCustom<Error, Error>]>>;
        args: z.ZodOptional<z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>>;
        placeholder: z.ZodOptional<z.ZodBoolean>;
        resources: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
            type: z.ZodString;
            data: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>>;
        security: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"safe">, z.ZodString, z.ZodObject<{
            rule: z.ZodString;
        }, z.core.$loose>]>>;
        "allow-origin": z.ZodOptional<z.ZodString>;
        docking: z.ZodOptional<z.ZodObject<{
            view: z.ZodString;
            properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
        }, z.core.$strip>>;
        templates: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            icon: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            args: z.ZodOptional<z.ZodArray<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>;
            content: z.ZodObject<{
                type: z.ZodString;
            }, z.core.$loose>;
        }, z.core.$strip>>>;
        binding: z.ZodOptional<z.ZodObject<{
            source: z.ZodString;
        }, z.core.$strip>>;
        aliases: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        type: z.ZodLiteral<"function">;
        input: z.ZodOptional<z.ZodUnion<readonly [z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>, z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>]>>;
        output: z.ZodOptional<z.ZodUnion<readonly [z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>, z.ZodArray<z.ZodLazy<z.ZodType<any, unknown, z.core.$ZodTypeInternals<any, unknown>>>>]>>;
    }, z.core.$strip>;
    export const JSONSchemaSchema: z.ZodType<any>;
    export type JSONSchema7TypeName = z.infer<typeof JSONSchema7TypeNameSchema>;
    export type JSONSchema7TypeNameCustom = z.infer<typeof JSONSchema7TypeNameCustomSchema>;
    export type JSONSchema7 = z.infer<typeof JSONSchema7TypeSchema>;
    export type JSONSchema7Definition = z.infer<typeof JSONSchema7DefinitionSchema>;
    export type ChapterSchema = z.infer<typeof ChapterSchema>;
    export type DocumentationSchema = z.infer<typeof DocumentationSchema>;
    export type BindingSchema = z.infer<typeof BindingSchema>;
    export type ExpressionSchema = z.infer<typeof ExpressionSchema>;
    export type TemplateSchema = z.infer<typeof TemplateSchema>;
    export type DockingSchema = z.infer<typeof DockingSchema>;
    export type SecurityRule = z.infer<typeof SecurityRuleSchema>;
    export type SecurityGuard = z.infer<typeof SecurityGuardSchema>;
    export type ResourceEntry = z.infer<typeof ResourceEntrySchema>;
    export type ResourceImport = {
        type: string;
        location?: string;
        identifier?: string;
        [key: string]: any;
    };
    export type JSONSchemaStandard = z.infer<typeof JSONSchemaStandardSchema>;
    export type JSONSchemaCustom = z.infer<typeof JSONSchemaCustomSchema>;
    export type ServiceSchema = z.infer<typeof ServiceSchemaSchema>;
    export type FunctionSchema = z.infer<typeof FunctionSchemaSchema>;
    export type JSONSchema = z.infer<typeof JSONSchemaSchema>;
}

declare module '@jointhedots/core/services/service-entry' {
    import type { ComponentEntry } from '@jointhedots/core/components/manifold';
    export type ServiceType = string;
    export class ServiceEntry<Instance extends any, Spec extends any> {
        resource: string;
        definition: any;
        constructor(resource: string, definition?: any);
        defintiion(): void;
        get(entry: ComponentEntry): Instance;
        fetch(entry: ComponentEntry): Promise<Instance>;
        spec(entry: ComponentEntry): Spec;
        subservice<T extends any>(name: string): ServiceEntry<T, Spec>;
    }
}

declare module '@jointhedots/core/components/components' {
    import { URI } from 'vscode-uri';
    import type { DocumentationSchema, JSONSchema, ResourceEntry } from '@jointhedots/core/schema/schema';
    import type { MapLike } from 'typescript';
    import type { ComponentEntry } from '@jointhedots/core/components/manifold';
    import { ServiceEntry, type ServiceType } from '@jointhedots/core/services/service-entry';
    export type ComponentID = string;
    export interface ComponentPublication {
        component_id: ComponentID;
        type?: string;
        icon?: string;
        title: string;
        services?: string[];
        description?: string;
        keywords?: string[];
        tags?: string[];
    }
    export type ComponentManifest<Data extends any = unknown> = {
        $id: string;
        type?: string;
        title?: string;
        icon?: string;
        description?: string;
        keywords?: string[];
        tags?: string[];
        doc?: DocumentationSchema;
        specs?: MapLike<any>;
        services?: MapLike<ResourceEntry>;
        data?: Data;
    };
    export type ComponentSchema = {
        readonly name: ServiceType;
        readonly title: string;
        readonly icon: string;
        readonly attributes: MapLike<JSONSchema>;
    };
    export interface ComponentManifestIssue {
        level: "error" | "warn" | "info";
        message: string;
        fix?(descriptor: ComponentManifest): Promise<ComponentManifest>;
    }
    export interface ComponentChecking {
        fixed?: ComponentManifest;
        issues?: ComponentManifestIssue[];
    }
    export interface ComponentController {
        createComponent(component: ComponentEntry, descriptor: ComponentManifest): Promise<void>;
        updateComponent(component: ComponentEntry, descriptor: ComponentManifest): Promise<void>;
        checkDescriptor(descriptor: ComponentManifest): Promise<ComponentChecking>;
    }
    export const ComponentControllerKey: ServiceEntry<ComponentController, ComponentSchema>;
    export type ComponentEditorProps<T extends ComponentManifest = ComponentManifest> = {
        descriptor: ComponentSchema;
        schema: JSONSchema;
        manifest: T;
        created?: boolean;
        onChange: (manifest: T) => void;
        onValidate: (manifest: T) => void;
        onCancel: () => void;
    };
    export type ComponentPreviewProps<T extends ComponentManifest = ComponentManifest> = {
        manifest: T;
    };
    export type ComponentEditor<T extends ComponentManifest = ComponentManifest> = {
        creator: React.ComponentType<ComponentEditorProps<T>>;
        editor: React.ComponentType<ComponentEditorProps<T>>;
        preview?: React.ComponentType<ComponentPreviewProps<T>>;
    };
    export const EditorKey: ServiceEntry<ComponentEditor<ComponentManifest<unknown>>, unknown>;
    export type ComponentFilter = {
        query: string;
        pattern: RegExp;
        keywords: string[];
        tags: string[];
        types: string[];
        services: string[];
    };
    export interface IResourceLoader {
        load_resource(uri: string): Promise<any>;
    }
    export interface IComponentPublisher {
        search_component_publications(filter: ComponentFilter): Promise<ComponentPublication[]>;
        get_component_publication(component_id: string): Promise<ComponentPublication>;
    }
    export interface IComponentProvider extends IComponentPublisher {
        get_component_manifest(component_id: string): Promise<ComponentManifest>;
        set_component_manifest(component_id: string, manifest: ComponentManifest): Promise<boolean>;
        add_component(manifest: ComponentManifest): Promise<ComponentPublication>;
        delete_component(component_id: string): Promise<boolean>;
    }
    export interface IContentProvider {
        check_content(uri: URI): Promise<string>;
        load_content(uri: URI): Promise<Blob>;
        store_content(content: Blob, uri: URI): Promise<boolean>;
    }
}

declare module '@jointhedots/core/common/contents' {
    export type ContentBlob = Blob;
    export const ContentBlob: {
        object: {
            read<T = any>(blob: Blob): Promise<T>;
            write<T = any>(data: T): Promise<Blob>;
        };
        text: {
            read(blob: Blob): Promise<string>;
            write(text: string): Promise<Blob>;
        };
    };
    export function b64_blob(base64: string): Blob;
    export function b64_format(base64: string): string;
    export function blob_b64(blob: Blob): Promise<string>;
}

declare module '@jointhedots/core/components/helpers' {
    import { URI } from 'vscode-uri';
    import { type ComponentFilter, type ComponentManifest, type ComponentPublication } from '@jointhedots/core/components/components';
    import type { ResourceEntry, ResourceImport } from '@jointhedots/core/schema/schema';
    export function parseComponentURI(ref: string): URI;
    export function getComponentServicesList(manif: ComponentManifest): Promise<string[]>;
    export function createComponentPublication(manif: ComponentManifest): Promise<ComponentPublication>;
    export function createComponentFilter(filter?: Partial<ComponentFilter>): ComponentFilter;
    export function matchComponentFilter(pub: ComponentPublication, filter?: Partial<ComponentFilter>): boolean;
    export function parseResourceEntry(entry: ResourceEntry): ResourceImport;
}

declare module '@jointhedots/core/providers/resources/CommonResourceProvider' {
    import { URI } from 'vscode-uri';
    import { type IContentProvider, type IResourceLoader } from '@jointhedots/core/components/components';
    export class CommonResourceProvider implements IResourceLoader {
        readonly storage: IContentProvider;
        modules_exports: Map<string, any>;
        baseUrl: string;
        constructor(storage: IContentProvider);
        load_resource(ref: string): Promise<any>;
        import_module_json(ref: string, uri: URI): Promise<any>;
        import_module_esm(ref: string, uri: URI): Promise<any>;
    }
}

declare module '@jointhedots/core/providers/resources/StaticContentProvider' {
    import { URI } from 'vscode-uri';
    import type { IContentProvider } from '@jointhedots/core/components/components';
    export class StaticContentProvider implements IContentProvider {
        check_url_content(ref: string): Promise<string>;
        load_url_content(ref: string): Promise<Blob>;
        check_content(uri: URI): Promise<string>;
        load_content(uri: URI): Promise<Blob>;
        store_content(content: Blob, uri: URI): Promise<boolean>;
    }
    export function contentLocalURI(id: string, norm: string, key?: string): URI;
}

declare module '@jointhedots/core/providers/components/InMemComponentProvider' {
    import { type ComponentFilter, type ComponentManifest, type ComponentPublication, type IComponentProvider, type IComponentPublisher } from '@jointhedots/core/components/components';
    export class InMemComponentPublisher implements IComponentPublisher {
        pubs: Map<string, ComponentPublication>;
        constructor(catalog?: ComponentPublication[]);
        get_component_publication(id: string): Promise<ComponentPublication>;
        search_component_publications(filter: ComponentFilter): Promise<ComponentPublication[]>;
    }
    export class InMemComponentProvider extends InMemComponentPublisher implements IComponentProvider {
        manifests: Map<string, ComponentManifest>;
        add_component(manifest: ComponentManifest): Promise<ComponentPublication>;
        delete_component(component_id: string): Promise<boolean>;
        get_component_manifest(component_id: string): Promise<ComponentManifest>;
        set_component_manifest(component_id: string, manifest: ComponentManifest): Promise<boolean>;
    }
}

declare module '@jointhedots/core/providers/components/StaticComponentProvider' {
    import { type ComponentFilter, type ComponentManifest, type ComponentPublication, type IComponentProvider, type IContentProvider } from '@jointhedots/core/components/components';
    import { InMemComponentPublisher } from '@jointhedots/core/providers/components/InMemComponentProvider';
    import type { MapLike } from '@jointhedots/core/common/types';
    export type StaticManifest = {
        name: string;
        baseline: string;
        components: MapLike<string>;
        catalogs: MapLike<string>;
    };
    export class StaticComponentProvider implements IComponentProvider {
        readonly content_provider: IContentProvider;
        library: StaticManifest;
        catalog: InMemComponentPublisher;
        constructor(content_provider: IContentProvider);
        get_provider_library(): Promise<StaticManifest>;
        get_component_catalog(): Promise<InMemComponentPublisher>;
        get_component_publication(id: string): Promise<ComponentPublication>;
        search_component_publications(filter: ComponentFilter): Promise<ComponentPublication[]>;
        get_component_manifest(id: string): Promise<ComponentManifest>;
        set_component_manifest(component_id: string, manifest: ComponentManifest): Promise<boolean>;
        add_component(manifest: ComponentManifest): Promise<ComponentPublication>;
        delete_component(component_id: string): Promise<boolean>;
    }
}

declare module '@jointhedots/core/providers/components/CombinedComponentProvider' {
    import { type ComponentFilter, type ComponentManifest, type ComponentPublication, type IComponentProvider } from '@jointhedots/core/components/components';
    export class CombinedComponentProvider implements IComponentProvider {
        readonly providers: IComponentProvider[];
        constructor(providers?: IComponentProvider[]);
        add_provider(provider: IComponentProvider): void;
        get_component_publication(id: string): Promise<ComponentPublication>;
        search_component_publications(filter: ComponentFilter): Promise<ComponentPublication[]>;
        get_component_manifest(id: string): Promise<ComponentManifest>;
        set_component_manifest(component_id: string, manifest: ComponentManifest): Promise<boolean>;
        add_component(manifest: ComponentManifest): Promise<ComponentPublication>;
        delete_component(component_id: string): Promise<boolean>;
    }
}

declare module '@jointhedots/core/providers/components/LocalComponentProvider' {
    import { type ComponentFilter, type ComponentManifest, type ComponentPublication, type IComponentProvider } from '@jointhedots/core/components/components';
    export class LocalComponentProvider implements IComponentProvider {
        db: Promise<IDBDatabase>;
        get_component_publication(id: string): Promise<ComponentPublication>;
        search_component_publications(filter: ComponentFilter): Promise<ComponentPublication[]>;
        get_component_manifest(id: string): Promise<ComponentManifest>;
        set_component_manifest(component_id: string, manifest: ComponentManifest): Promise<boolean>;
        add_component(manifest: ComponentManifest): Promise<ComponentPublication>;
        delete_component(component_id: string): Promise<boolean>;
    }
}

declare module '@jointhedots/core/rest' {
    import { URI } from 'vscode-uri';
    import { ComponentEntry } from '@jointhedots/core/components/manifold';
    import { ServiceEntry } from '@jointhedots/core/services/service-entry';
    export interface RESTService {
        getUrl(path: string): string;
        invoke(path: string, init?: RequestInit): Promise<Response>;
    }
    export const RESTServiceKey: ServiceEntry<RESTService, unknown>;
    export type RESTServiceImport = {
        type?: "api.rest";
        endpoint?: string;
        path?: string;
    };
    export function __import_RESTService(entry: RESTServiceImport, component: ComponentEntry): RESTService;
    export const REST: {
        fetch(link: string | URI, init?: RequestInit): Promise<Response>;
        getUri(link: string | URI): Promise<URI>;
    };
}

declare module '@jointhedots/core/components/manifold' {
    import { type ComponentFilter, type ComponentManifest, type ComponentPublication, type IContentProvider, type IResourceLoader } from '@jointhedots/core/components/components';
    import { CombinedComponentProvider } from '@jointhedots/core/providers/components/CombinedComponentProvider';
    import { type QueryLogResult } from '@jointhedots/core/logging';
    export type ComponentErrorManifest = ComponentManifest & {
        type: "<error>";
        message: string;
        stack?: string;
    };
    export type ComponentServiceGetter<Service = any> = (entry: ComponentEntry) => Service;
    export class ComponentEntry<Instance extends Object = any> {
        readonly id: string;
        protected __instance__?: Instance;
        manifest?: ComponentManifest;
        constructor(id: string);
        get title(): string;
        get namespace(): string;
        get valid(): boolean;
        get loaded(): boolean;
        get installed(): boolean;
        get instance(): Instance;
        set instance(value: Instance);
        get<Manifest extends ComponentManifest = ComponentManifest>(): Manifest;
        set<Manifest extends ComponentManifest = ComponentManifest>(manifest: Manifest): this;
        fetch<Manifest extends ComponentManifest = ComponentManifest>(): Promise<Manifest>;
        install(): Promise<ComponentEntry>;
        acquireResource(identifier: string): ComponentResource;
        getResource(identifier: string): ComponentResource;
        hasResource(identifier: string): boolean;
        getResourceAsync(identifier: string): Promise<ComponentResource>;
        fetchResource<T = any>(identifier: string): Promise<T>;
        getLogStats(): import( '@jointhedots/core').LogInfos;
        getLogs(count: number): QueryLogResult;
    }
    export class ComponentResource {
        readonly component: ComponentEntry;
        readonly resource: string;
        entry: any;
        identifier: string;
        constructor(component: ComponentEntry, resource: string);
        get valid(): boolean;
        get loaded(): boolean;
        fetch<T = any>(): Promise<T>;
        get<T = any>(): T;
        set(data: any): void;
        get spec(): any;
        get url(): string;
    }
    export type ComponentsListener = (target: ComponentEntry) => void;
    export class ComponentsManifold {
        components: Map<string, ComponentEntry<any>>;
        resources: Map<string, ComponentResource>;
        datamap: WeakMap<any, ComponentEntry<any> | ComponentResource>;
        loadings: Map<any, Promise<any>>;
        installings: Map<any, Promise<ComponentEntry<any>>>;
        listeners: Set<ComponentsListener>;
        components_provider: CombinedComponentProvider;
        resources_loader: IResourceLoader;
        content_provider: IContentProvider;
        constructor();
        listen(l: ComponentsListener): ComponentsListener;
        unlisten(l: ComponentsListener): void;
        notifyError(subject: ComponentEntry, error: Error): void;
    }
    export const ComponentsRegistry: ComponentsManifold;
    export function getDefaultComponent(): ComponentEntry<any>;
    export function getComponentFromData(data: any, is_static?: boolean): ComponentEntry;
    export function acquireComponent(id: string): ComponentEntry;
    export function acquireFutureComponent(manifest: ComponentManifest): ComponentEntry;
    export function acquireResource(ref: string): ComponentResource;
    export function resolveRelativeComponent(ref: string, from: ComponentEntry): ComponentEntry;
    export function saveComponentManifest(manifest: ComponentManifest): Promise<ComponentEntry<any>>;
    export function saveComponent(component: ComponentEntry): Promise<ComponentEntry<any>>;
    export function deleteComponent(id: string): Promise<void>;
    export function unregisterComponent(id: string): void;
    export function searchComponentsPublications(filter: ComponentFilter): Promise<ComponentPublication[]>;
    export function fetchComponentsPublications(components_ids: string[]): Promise<ComponentPublication[]>;
    export function failedComponentPublication(id: string, title?: string): ComponentPublication;
}

declare module '@jointhedots/core/interfaces/commands/interface' {
    import type { Serializable } from 'child_process';
    export type Cmdlet<CmdPayload extends Serializable = Serializable, CmdResult extends Serializable = Serializable> = {
        payload: CmdPayload;
        result: CmdResult;
    };
    export type CmdPayload<C extends Cmdlet> = C extends {
        payload: infer P;
    } ? P : void;
    export type CmdResult<C extends Cmdlet> = C extends {
        result: infer P;
    } ? P : void;
    export interface Command<C extends Cmdlet = Cmdlet> {
        target: string;
        payload?: CmdPayload<C>;
        icon?: string;
        title?: string;
        summary?: string;
        identity?: string;
        signature?: string;
    }
    export interface CommandsService {
        execute<C extends Cmdlet>(cmd: string, data: CmdPayload<C>): Promise<CmdResult<C>>;
    }
    export function executeCommand(cmd: Command): Promise<void>;
}

declare module '@jointhedots/core/logging' {
    import type { MapLike } from '@jointhedots/core/common/types';
    import type { Command } from '@jointhedots/core/interfaces/commands/interface';
    export type LogObjectID = string;
    export type LogStatus = "error" | "warn" | "notify" | "info";
    export type LogKind = "event" | "ticket";
    export interface ILogDispatcher {
        notifyError(error: Error, subject?: any): any;
        notifyObject(object: LogObject): any;
    }
    export interface ILogSubject {
        getSubject(): string;
    }
    export interface LogAction extends Command {
        optional?: boolean;
        doc_uri?: string;
        callback?: Command;
    }
    export interface LogObject {
        id: LogObjectID;
        kind: LogKind;
        status: LogStatus;
        message: string;
        component_id: string;
        doc_uri?: string;
        icon?: string;
        title?: string;
        attributes?: MapLike<string | number>;
        actions?: LogAction[];
    }
    export function registerLogCollector(collector: ILogDispatcher): void;
    export function unregisterLogCollector(collector: ILogDispatcher): void;
    export function queryLogCount(): number;
    export type QueryLogResult = {
        objects: LogObject[];
        hasMore: boolean;
    };
    export function queryLogObjects(count: number, component_id?: string): QueryLogResult;
    export type LogInfos = {
        action_expected_count: number;
        error_count: number;
        warn_count: number;
        notify_count: number;
        info_count: number;
    };
    export function queryLogInfos(component_id?: string): LogInfos;
    export const Log: {
        send(object: LogObject): void;
        error(error: Error, target?: any): void;
        event(target: any, options?: Partial<LogObject>): void;
        openTicket(target: any, name: string, options?: Partial<LogObject>): void;
        closeTicket(target: any, name: string): void;
    };
    export function createLogFromError(error: Error, target?: any): LogObject;
}

declare module '@jointhedots/core/observable/attributes' {
    export const ObservableAttribute: unique symbol;
    export const HttpStatusAttribute: unique symbol;
}

declare module '@jointhedots/core/observable/observable' {
    export type Observer = (target: any, key: PropertyKey) => void;
    export class Observable<T extends Object> implements ProxyHandler<T> {
        observers: (Observer | string[])[];
        state: T;
        image: T;
        constructor();
        subscribe(observer: Observer, keys?: string[]): void;
        unsubscribe(observer: Observer): void;
        notify(key?: PropertyKey): void;
        use(keys?: string[]): Promise<T>;
        get(target: T, key: PropertyKey): any;
        set(target: T, key: PropertyKey, value: any): boolean;
        ownKeys(target: T): (string | symbol)[];
        has(target: T, key: PropertyKey): boolean;
    }
}

declare module '@jointhedots/core/observable/listenable' {
    type ListenersArray = (Function | string)[];
    export type ListenableContexts = {
        [contextName: string]: any;
    };
    export type ListenableResult = Promise<Listenable> | Listenable | null;
    export class Listenable<S = any> {
        ".events": any[];
        ".listeners": ListenersArray;
        addEventListener(callback: Function): boolean;
        addEventListener(eventType: string | string[], callback: Function): boolean;
        removeEventListener(callback: Function): boolean;
        removeEventListener(eventType: string, callback: Function): boolean;
        synchronizeStateInContext(contexts: ListenableContexts, // Collection of data, the listenable can access to it environment variable by key
        writable: boolean, // true when a writable listenable is required for the resulting listenable
        fields?: string[] | boolean, // fields required in the resulting listenable
        previousResult?: Listenable): Promise<Listenable> | Listenable;
        addStateListener(callback: Function, fields?: string[]): boolean;
        removeStateListener(callback: Function): boolean;
        setState(): void;
        setState(key: keyof S, value: any): void;
        setState(values: Partial<S>): void;
        dispatchEvent(type: string, data?: any): void;
        executeEvent(type: string, data?: any): Promise<any[]>;
        static setState(): void;
        static setState(key: string, value: any): void;
        static setState(values: {
            [key: string]: any;
        }): void;
    }
    export {};
}

declare module '@jointhedots/core/logging/console' {
    export const print: {
        log(...args: any[]): any;
        debug(...args: any[]): any;
        warning(...args: any[]): any;
        error(...args: any[]): any;
        success(...args: any[]): any;
        title(...args: any[]): any;
        info(...args: any[]): any;
        exception(exception: Error): any;
    };
    export class ConsoleTable {
        readonly sizes: number[];
        constructor(sizes: number[]);
        head(...cells: any[]): void;
        row(...cells: any[]): void;
        end(): void;
    }
}

declare module '@jointhedots/core/observable/RestResource' {
    import { Observable } from '@jointhedots/core/observable/observable';
    export class RestResource<T extends Object> extends Observable<T> {
        readonly url: string;
        loaded: boolean;
        query: Promise<T>;
        status: number;
        constructor(url: string);
        use(): Promise<T>;
        get(target: T, key: PropertyKey): any;
        set(target: T, key: PropertyKey, value: any): boolean;
    }
}

declare module '@jointhedots/core/observable' {
    export * from '@jointhedots/core/observable/attributes';
    export * from '@jointhedots/core/observable/observable';
    export * from '@jointhedots/core/observable/listenable';
    export * from '@jointhedots/core/observable/RestResource';
}

declare module '@jointhedots/core/schema/helpers' {
    import { type MapLike } from '@jointhedots/core/common/types';
    import { type JSONSchema } from '@jointhedots/core/schema/schema';
    export const CommonTypes: {
        boolean: JSONSchema;
        string: JSONSchema;
        number: JSONSchema;
        object: JSONSchema;
        view: JSONSchema;
        display: JSONSchema;
        function: JSONSchema;
        null: JSONSchema;
        unknown: JSONSchema;
        any: JSONSchema;
    };
    export const CommonMakers: {
        enums(base: JSONSchema, ...values: string[]): JSONSchema;
        array(base: JSONSchema): JSONSchema;
        record(fields: MapLike<JSONSchema>): JSONSchema;
        collection(items: JSONSchema): JSONSchema;
        event_fn(event?: JSONSchema): JSONSchema;
    };
    export const ErrorTypes: MapLike<JSONSchema>; function getPropertyTyping(propertyName: string, schema: JSONSchema): JSONSchema; function getItemTyping(index: number, schema: JSONSchema): JSONSchema; function getValueTyping(value: any): JSONSchema; function isType(typing: JSONSchema, kind: string): boolean; function typeAsString(type: JSONSchema["type"]): string; function generateTypescript(schema: JSONSchema): string;
    export const Schema: {
        getPropertyTyping: typeof getPropertyTyping;
        getItemTyping: typeof getItemTyping;
        getValueTyping: typeof getValueTyping;
        isType: typeof isType;
        typeAsString: typeof typeAsString;
        generateTypescript: typeof generateTypescript;
    };
    export {};
}

declare module '@jointhedots/core/schema/zod' {
    import { z, type ZodType } from 'zod';
    import { type JSONSchema, type ServiceSchema } from '@jointhedots/core/schema/schema';
    export class ZodService<T = unknown> {
        readonly $spec: string;
        readonly version?: string;
        readonly _type: "ZodService";
        constructor($spec: string, version?: string);
        parse(data: unknown): T;
        safeParse(data: unknown): {
            success: true;
            data: T;
            error?: undefined;
        } | {
            success: false;
            error: Error;
            data?: undefined;
        };
        toJSONSchema(): ServiceSchema;
        static create<T = unknown>($spec: string, version?: string): ZodService<T>;
    }
    export const zService: typeof ZodService.create;
    export function zodToJSONSchema(schema: ZodType | ZodService): JSONSchema;
    export function jsonSchemaToZod(schema: JSONSchema): ZodType;
    export type ValidationResult<T = unknown> = {
        success: true;
        data: T;
    } | {
        success: false;
        errors: ValidationError[];
    };
    export type ValidationError = {
        path: string[];
        message: string;
        code?: string;
    };
    export function validate<T>(schema: JSONSchema | ZodType, data: unknown): ValidationResult<T>;
    export function validateOrThrow<T>(schema: JSONSchema | ZodType, data: unknown): T;
    export type TSGenOptions = {
        comments?: boolean;
        indent?: string;
        export?: boolean;
    };
    export function generateTypeScript(schema: JSONSchema, name: string, opts?: TSGenOptions): string;
    export { z };
}

declare module '@jointhedots/core/schema' {
    export * from '@jointhedots/core/schema/helpers';
    export * from '@jointhedots/core/schema/schema';
    export * from '@jointhedots/core/schema/zod';
}

declare module '@jointhedots/core/interfaces/view/interface' {
    import type { MapLike } from 'typescript';
    import { ComponentEntry } from '@jointhedots/core/components/manifold';
    import { ServiceEntry } from '@jointhedots/core/services/service-entry';
    export const ViewServiceKey: ServiceEntry<any, any>;
    export type ViewInfos = {
        name: string;
        params?: Record<string, ViewParam | ViewParam[] | MapLike<ViewParam>>;
        content?: string;
        nested?: ViewInfos;
    };
    export type ViewParam = string | boolean | number;
    export type ViewInvokable = {
        component: ComponentEntry;
        properties?: MapLike<string>;
    };
    export function getViewReferenceFrom(data: string | ViewInfos): string;
    export function getViewInfosFrom(data: string | ViewInfos, content?: string): ViewInfos;
    export function evaluateViewInfos(view: string | ViewInfos, origin?: string): Promise<ViewInvokable>;
    export function getViewURL(view: string | ViewInfos, inside?: string | ViewInfos): string;
    export function gotoURLView(view: string | ViewInfos, inside?: string | ViewInfos): void;
    export function updateURLView(view: string | ViewInfos): void;
}

declare module '@jointhedots/core/components' {
    export * from '@jointhedots/core/components/components';
    export * from '@jointhedots/core/components/manifold';
    export * from '@jointhedots/core/components/helpers';
    export * from '@jointhedots/core/interfaces/view/interface';
}

declare module '@jointhedots/core/services/service-specification' {
    import type { JSONSchema } from '@jointhedots/core/schema/schema';
    import type { ZodType } from 'zod';
    /**
     * ServiceSpecification defines the metadata and schema for a service interface.
     * It describes the contract that providers must implement and consumers can rely on.
     *
     * @template I - The TypeScript interface type this service represents
     * @template P - The type of properties (hyperparameters) for service specialization
     */
    export interface ServiceSpecification<I = unknown, P = unknown> {
        /** Unique identifier for the service specification (URI or qualified name) */
        $spec: string;
        /** Semantic version of the specification (e.g., "1.0.0") */
        version: string;
        /**
         * JSON Schema defining the service interface including:
         * - title, description (metadata)
         * - properties (hyperparameters for service specialization)
         * - All standard JSON Schema validation rules
         */
        schema?: JSONSchema;
        /**
         * Zod schema for runtime validation and compile-time type inference.
         * Bridges runtime validation with TypeScript's static type system.
         */
        properties?: ZodType<P>;
        /** Category or domain the service belongs to */
        category?: string;
        /** Tags for discovery and filtering */
        tags?: string[];
        /** Minimum compatible version for consumers */
        minCompatibleVersion?: string;
    }
    /**
     * Result of checking compatibility between consumer and provider
     */
    export interface ServiceCompatibility {
        /** Whether the service is compatible */
        compatible: boolean;
        /** Reason for incompatibility if not compatible */
        reason?: string;
        /** Warnings about potential issues */
        warnings?: string[];
    }
    /**
     * Check if a provider version is compatible with a consumer's required version
     */
    export function checkVersionCompatibility(requiredVersion: string, providedVersion: string, minCompatibleVersion?: string): ServiceCompatibility;
    /**
     * Create a service specification with full metadata
     */
    export function defineServiceSpec<I = unknown, P = unknown>(spec: ServiceSpecification<I, P>): ServiceSpecification<I, P>;
}

declare module '@jointhedots/core/services/service-definitions' {
    import type { ServiceSchema } from '@jointhedots/core/schema/schema';
    import { ZodService } from '@jointhedots/core/schema/zod';
    import type { ZodType } from 'zod';
    import { type ServiceSpecification, type ServiceCompatibility } from '@jointhedots/core/services/service-specification';
    /**
     * ServiceDefinition is a concrete definition linking a specification to implementation.
     *
     * @template I - The TypeScript interface type this service implements
     * @template P - The type of properties (hyperparameters) for service speci alization
     */
    export interface ServiceDefinition<I, P = unknown> {
        /** Reference to the service specification */
        $spec: string;
        /** Version of the specification this definition implements */
        version: string;
        /** Zod schema for validating properties */
        properties?: ZodType<P>;
        /** Check if the service is compatible for assignement with an other definition */
        isAssignable(from: ServiceDefinition<I>): any;
    }
    export type ServiceInterface<T> = T extends ServiceDefinition<infer I, any> ? I : never;
    /**
     * Get ZodService type from a service definition
     */
    export function getServiceZod<I>(def: ServiceDefinition<I>): ZodService<I>;
    /**
     * Get ServiceSchema (JSON Schema representation) from a service definition
     */
    export function getServiceSchema<I, P>(def: ServiceDefinition<I, P>): ServiceSchema;
    /**
     * Get full ServiceSchema including attributes schema from a specification
     */
    export function getServiceSchemaFromSpec<I, A>(spec: ServiceSpecification<I, A>): ServiceSchema;
    /**
     * Check if a service definition matches a specification
     */
    export function matchesSpecification<I, A>(def: ServiceDefinition<I, A>, spec: ServiceSpecification<I, A>): ServiceCompatibility;
}

declare module '@jointhedots/core/services/settings' {
    import type { MapLike } from 'typescript';
    export type CommonSetting = MapLike<any>;
    export type SettingGroup = "service_points" | "components" | "shareds";
    export type SettingStores<T> = {
        [id in SettingGroup]: MapLike<T>;
    };
    export enum WriteMode {
        Default = 0,
        Reset = 1,
        Temporary = 2
    }
    export class AccountSettings {
        readonly name: string;
        key: string;
        stores: SettingStores<string>;
        temporaries: SettingStores<string>;
        settings: SettingStores<CommonSetting>;
        constructor(name: string);
        get<T = any>(group: SettingGroup, key: string): T;
        set<T = any>(group: SettingGroup, key: string, descriptor: T, mode?: WriteMode): boolean;
        list(group: SettingGroup): string[];
        read(key: string): string;
        write(group: SettingGroup, key: string, data: string, mode: WriteMode): boolean;
        restore(stores: SettingStores<string>): void;
    }
    type SettingsChangeHandler = (group: SettingGroup, id: string) => void;
    export function getSettings(): AccountSettings;
    export function listenSettings(handler: SettingsChangeHandler): SettingsChangeHandler;
    export function unlistenSettings(handler: SettingsChangeHandler): void;
    export {};
}

declare module '@jointhedots/core/services/service-points' {
    import { type ComponentID } from '@jointhedots/core/components/components';
    import { type ILogDispatcher, type LogObject } from '@jointhedots/core/logging';
    import { ServiceEntry, type ServiceType } from '@jointhedots/core/services/service-entry';
    export const ServicePoints: Map<string, ServicePoint>;
    export type ServicePointID = string;
    export type ServicePointProperties = {
        title?: string;
        multiple?: boolean;
        alternative?: ServicePointID;
    };
    export type ServicePointSetting = {
        id: ServicePointID;
        providers: ComponentID[];
        properties: ServicePointProperties;
    };
    export type ServiceChangeHandler = (service: ServicePoint) => void;
    export class ServicePoint<IService = unknown> implements ILogDispatcher {
        descriptor: ServicePointSetting;
        service: ServiceType;
        name: string;
        services: IService[];
        loading: Promise<IService[]>;
        ready: boolean;
        failure: Error;
        constructor(descriptor: ServicePointSetting);
        get id(): string;
        get multiple(): boolean;
        fetch(): Promise<IService[]>;
        reset(descriptor: ServicePointSetting): Promise<this>;
        override(providers: ComponentID[]): void;
        notifyError(error: Error): void;
        notifyObject(object: LogObject): void;
    }
    export function listenServicePoints(handler: ServiceChangeHandler): ServiceChangeHandler;
    export function unlistenServicePoints(handler: ServiceChangeHandler): void;
    export function acquireServicePointDescriptor(id: string): ServicePointSetting;
    export function updateServicePointDescriptor(id: string, properties: ServicePointProperties): ServicePointSetting;
    export function getServicePoint<IService>(id: string): ServicePoint<IService>;
    export function acquireServicePoint<IService>(id: string): ServicePoint<IService>;
    export function createServicePoint<S extends any, D extends any>(service: ServiceEntry<S, D>, name: ServicePointID, properties?: ServicePointProperties): ServicePoint<S>;
}

declare module '@jointhedots/core/services' {
    export * from '@jointhedots/core/services/service-definitions';
    export * from '@jointhedots/core/services/service-points';
    export * from '@jointhedots/core/services/service-specification';
    export * from '@jointhedots/core/services/service-entry';
    export * from '@jointhedots/core/services/settings';
}

declare module '@jointhedots/core/scripting/ast/primitives' {
    import * as Acorn from 'acorn';
    import type { MapLike } from 'typescript';
    export * from 'acorn';
    /******************************************************
    // # Primitive
    /******************************************************/
    export type NodeKey = number;
    export interface Node extends Partial<Acorn.Node> {
        $id?: NodeKey;
        $owner?: NodeKey;
        annotations?: CompositePrimitive[];
    }
    export interface Primitive extends Node {
        type: string;
    }
    export interface Additional extends Node {
        type?: undefined;
    }
    export type SourceLink = {
        start: number;
        end?: number;
        fragment?: string;
        src?: number | string;
    };
    export type SourceLocation = SourceLink | SourceLink[];
    export type ExpressiveValue = boolean | number | string | AnyPrimitive | AnyPrimitive[];
    export type AnyPrimitive = Partial<Acorn.AnyNode> & Primitive | CompositePrimitive | ProceduralPrimitive | ElementPrimitive | DocumentPrimitive | ElementAttribute | RefPrimitive;
    export type Any = AnyPrimitive;
    interface RefPrimitive extends Additional {
        $ref: string | number;
    }
    /******************************************************
    // # Behavior/Procedural primitives
    /******************************************************/
    export interface RecallPrimitive extends Primitive {
        type: "Recall";
        intend: AnyPrimitive;
    }
    export interface SamplingPrimitive extends Primitive {
        type: "Sampling";
        items: AnyPrimitive;
    }
    export interface CommandPrimitive extends Primitive {
        type: "Command";
        cmd: string;
    }
    export type ProceduralPrimitive = SamplingPrimitive | CommandPrimitive;
    /******************************************************
    // # Semantic/Information primitives
    /******************************************************/
    export interface TextPrimitive extends Primitive {
        type: "Text";
        lang?: string;
        text: string;
    }
    export interface ImagePrimitive extends Primitive {
        type: "Image";
        name?: string;
        pixels: Blob;
    }
    export interface AudioPrimitive extends Primitive {
        type: "Audio";
        name?: string;
        data: Blob;
    }
    export interface VideoPrimitive extends Primitive {
        type: "Video";
        name?: string;
        data: Blob;
    }
    export enum BlockFormat {
        Paragraph = "paragraph",
        Tip = "tip",
        Quote = "quote",
        Code = "code",
        Section = "section",
        Figure = "figure",
        Association = "pair",// Association: associate a content to a label, ex: **{{label}}**: {{content}}
        Fragment = "fragment"
    }
    export enum BlockEmphasis {
        Important = "important",
        Information = "info",
        Warning = "warning",
        Danger = "danger"
    }
    export type BlockContent = AnyPrimitive[];
    export interface BlockPrimitive extends Primitive {
        type: "Block";
        format: BlockFormat;
        lang?: string;
        metadata?: string;
        label?: BlockContent;
        content: BlockContent;
    }
    export interface ListPrimitive extends Primitive {
        type: "List";
        items: AnyPrimitive[];
    }
    export interface TablePrimitive extends Primitive {
        type: "Table";
        subjects: AnyPrimitive[];
        items: AnyPrimitive[][];
    }
    /******************************************************
    // # Element: Generic procedural primitives
    /******************************************************/
    export interface ElementAttribute extends Additional {
        ns?: string;
        name: string;
        value: AnyPrimitive;
    }
    export interface ElementPrimitive extends Primitive {
        type: "Element";
        tag: string;
        attributes?: ElementAttribute[];
        content?: BlockContent;
    }
    export interface DocumentPrimitive extends Primitive {
        type: "Document";
        metadata?: MapLike<any>;
        content: AnyPrimitive[];
    }
    export type BasicPrimitive = TextPrimitive | ImagePrimitive | AudioPrimitive | VideoPrimitive;
    export type CompositePrimitive = BasicPrimitive | BlockPrimitive | ListPrimitive | TablePrimitive;
}

declare module '@jointhedots/core/scripting/ast/serde/tokenizer' {
    export type MatchRule<P> = {
        name: string;
        parse: P;
        entry: RegExp;
    };
    export class TokenPattern {
        readonly id: number;
        readonly name: string;
        readonly marker: string;
        readonly parse?: (token: Token) => boolean;
        readonly pattern?: RegExp;
        constructor(id: number, name: string, marker: string, parse?: (token: Token) => boolean, pattern?: RegExp);
        createToken(source: TokenStream): Token;
    }
    export enum TokenBaseId {
        EOF = 0,
        Chunk = 1
    }
    export class Token {
        readonly rule: TokenPattern;
        readonly source: TokenStream;
        id: number;
        chunk: Token;
        start: number;
        end: number;
        data: any;
        match: RegExpExecArray;
        constructor(rule: TokenPattern, source: TokenStream);
        get raw(): string;
        fork(format: TokenizerFormat): TokenStream;
        toString(): string;
        print(): this;
    } function matchSpaceChunkInto(token: Token, chunk: Token): void;
    export class TokenizerFormat {
        readonly rules: TokenPattern[];
        charmap: Map<number, TokenPattern[]>;
        matchChunkInto: typeof matchSpaceChunkInto;
        constructor(rules?: TokenPattern[]);
        allowAnyChunk(): this;
        add(rule: TokenPattern): void;
        complete(): this;
    }
    export enum MergeKind {
        StreamPosition = 0,
        ChunkStart = 1,
        ChunkEnd = 2,
        TokenStart = 3,
        TokenEnd = 4
    }
    export class TokenStream {
        origin: Token;
        input: string;
        format: TokenizerFormat;
        matches: Token[];
        pos: number;
        end: number;
        last: Token;
        EOF: Token;
        chunk: Token;
        retainLast: boolean;
        constructor(input: string, format: TokenizerFormat);
        isEOF(): boolean;
        fork(format: TokenizerFormat, pos: number, end?: number): TokenStream;
        reset(pos: number): void;
        merge(kind: MergeKind): void;
        retain(): void;
        next<P>(): Token;
    }
    export {};
}

declare module '@jointhedots/core/logging/trace' {
    export const originalConsole: {
        assert(condition?: boolean, ...data: any[]): void;
        assert(value: any, message?: string, ...optionalParams: any[]): void;
        clear(): void;
        clear(): void;
        count(label?: string): void;
        count(label?: string): void;
        countReset(label?: string): void;
        countReset(label?: string): void;
        debug(...data: any[]): void;
        debug(message?: any, ...optionalParams: any[]): void;
        dir(item?: any, options?: any): void;
        dir(obj: any, options?: import( 'util').InspectOptions): void;
        dirxml(...data: any[]): void;
        dirxml(...data: any[]): void;
        error(...data: any[]): void;
        error(message?: any, ...optionalParams: any[]): void;
        group(...data: any[]): void;
        group(...label: any[]): void;
        groupCollapsed(...data: any[]): void;
        groupCollapsed(...label: any[]): void;
        groupEnd(): void;
        groupEnd(): void;
        info(...data: any[]): void;
        info(message?: any, ...optionalParams: any[]): void;
        log(...data: any[]): void;
        log(message?: any, ...optionalParams: any[]): void;
        table(tabularData?: any, properties?: string[]): void;
        table(tabularData: any, properties?: readonly string[]): void;
        time(label?: string): void;
        time(label?: string): void;
        timeEnd(label?: string): void;
        timeEnd(label?: string): void;
        timeLog(label?: string, ...data: any[]): void;
        timeLog(label?: string, ...data: any[]): void;
        timeStamp(label?: string): void;
        timeStamp(label?: string): void;
        trace(...data: any[]): void;
        trace(message?: any, ...optionalParams: any[]): void;
        warn(...data: any[]): void;
        warn(message?: any, ...optionalParams: any[]): void;
        Console: console.ConsoleConstructor;
        profile(label?: string): void;
        profileEnd(label?: string): void;
    };
    export const logError: (...args: any[]) => void;
    export const logWarning: (...args: any[]) => void;
    export const logInfo: (...args: any[]) => void;
    export const logTrace: (...args: any[]) => void;
    export const logDebug: (...args: any[]) => void;
    export const print: Console;
}

declare module '@jointhedots/core/scripting/ast/serde/parser' {
    import * as AST from '@jointhedots/core/scripting/ast/primitives';
    export function parseDocumentFromMDX(text: string): AST.DocumentPrimitive;
}

declare module '@jointhedots/core/scripting/ast/loader' {
    /***********
     * Flow Document: Editable/readable flow representation
    **********/
    import type { AST } from '@jointhedots/core/scripting/ast/api';
    import { type ElementPrimitive } from '@jointhedots/core/scripting/ast/primitives';
    export type FlowAny = ElementPrimitive;
    export function loadScriptASTFromText(text: string): AST.DocumentPrimitive;
}

declare module '@jointhedots/core/scripting/ast/api' {
    export * as AST from '@jointhedots/core/scripting/ast/primitives';
    export * from '@jointhedots/core/scripting/ast/loader';
}

declare module '@jointhedots/core/scripting/interpreter' {
    import type { AST } from '@jointhedots/core/scripting/ast/api';
    import type { MapLike } from '@jointhedots/core/common/types';
    export interface InterpreterScope {
        getThis(): unknown;
        getValue(id: string): unknown;
        setValue(id: string, value: unknown): void;
    }
    export class LocalScope<C = unknown> implements InterpreterScope {
        readonly $parentScope: InterpreterScope | null;
        readonly $thisScope: unknown;
        readonly locals: MapLike<unknown>;
        constructor($parentScope: InterpreterScope | null, $thisScope: unknown, locals?: MapLike<unknown>);
        getThis(): unknown;
        getValue(id: string): unknown;
        setValue(id: string, value: unknown): void;
        setArguments(args: unknown[], params: AST.Pattern[]): void;
    }
    export const EmptyScope: LocalScope<unknown>;
    export const BINARY_OPERATIONS: Map<string, (l: unknown, r: unknown) => unknown>;
    export const UNARY_OPERATIONS: Map<string, (v: unknown) => unknown>;
    export const ASSIGNMENT_OPERATIONS: Map<string, (current: unknown, right: unknown) => unknown>;
    export const ENHANCED_BINARY_OPERATIONS: Map<string, (l: unknown, r: unknown) => unknown>;
    export const ENHANCED_ASSIGNMENT_OPERATIONS: Map<string, (current: unknown, right: unknown) => unknown>;
    export const ENHANCED_LOGICAL_OPERATIONS: Map<string, (l: unknown, r: unknown, scope: InterpreterScope) => unknown>;
    export function evaluateExpression(node: AST.Any, scope: InterpreterScope): unknown;
}

declare module '@jointhedots/core/scripting/template' {
    import * as ACorn from 'acorn';
    import { type MapLike } from '@jointhedots/core/common/types';
    import { type InterpreterScope } from '@jointhedots/core/scripting/interpreter';
    export enum EmbedSyntax {
        DollarBracket = 0,// Embed: $(expr)  | Escaping: \$(expr)
        DollarCurly = 1,// Embed: ${expr}  | Escaping: \${expr}
        CurlyCurly = 2
    }
    export type TextContext = {
        vars: {
            [key: string]: any;
        };
        encoder?: (value: any) => string;
    };
    export class TextBinding {
        start: number;
        end: number;
        node: ACorn.AnyNode;
        constructor(start: number, end: number, node: ACorn.AnyNode);
        evaluate(scope: InterpreterScope): unknown;
        toString(): string;
    }
    export class TextTemplate {
        pattern: string;
        bindings: MapLike<TextBinding>;
        issues: Error[];
        constructor(pattern: string, bindings: MapLike<TextBinding>, issues: Error[]);
        evaluate(context: TextContext): string;
        getBindingAt(position: number): TextBinding;
        toString(): string;
    }
    export type PlaceholderGenerator = (text: string) => (index: number) => string;
    export function parseTextTemplate(code: string, syntax: EmbedSyntax, placeholder?: PlaceholderGenerator): TextTemplate;
}

declare module '@jointhedots/core/scripting' {
    export * from '@jointhedots/core/scripting/interpreter';
    export * from '@jointhedots/core/scripting/template';
}

declare module '@jointhedots/core' {
    export * from '@jointhedots/core/common/types';
    export * from '@jointhedots/core/logging';
    export * from '@jointhedots/core/observable';
    export * from '@jointhedots/core/schema';
    export * from '@jointhedots/core/components';
    export * from '@jointhedots/core/services';
    export * from '@jointhedots/core/scripting';
    export * from '@jointhedots/core/providers/resources/StaticContentProvider';
    export * from '@jointhedots/core/providers/resources/CommonResourceProvider';
    export * from '@jointhedots/core/providers/components/CombinedComponentProvider';
    export * from '@jointhedots/core/providers/components/InMemComponentProvider';
    export * from '@jointhedots/core/providers/components/StaticComponentProvider';
    export * from '@jointhedots/core/providers/components/LocalComponentProvider';
}

declare module '@jointhedots/core/react/ErrorBoundary' {
    import React from 'react';
    import '@jointhedots/core/react/style.scss';
    export type ErrorDisplayerType<E extends Error = Error> = React.ComponentType<{
        error: E;
        onRetry?: () => void;
    }>;
    export class ErrorDisplayer extends React.Component<{
        error: Error;
        onRetry?: () => void;
    }> {
        render(): import( 'react/jsx-runtime').JSX.Element;
    }
    export class ErrorBoundary extends React.Component<{
        children: React.ReactNode;
    }> {
        static contextType: React.Context<ErrorReconcilier>;
        context: ErrorReconcilier;
        state: {
            error?: Error;
            displayer?: ErrorDisplayerType;
        };
        componentDidCatch(error: Error): void;
        render(): string | number | true | Iterable<React.ReactNode> | import( 'react/jsx-runtime').JSX.Element;
    }
    export class ErrorReconcilier extends React.Component<{
        errorClass: new () => Error;
        errorDisplayer: ErrorDisplayerType;
        children: React.ReactNode;
    }> {
        static contextType: React.Context<ErrorReconcilier>;
        context: ErrorReconcilier;
        getErrorDisplayer(error: Error): ErrorDisplayerType<Error>;
        render(): string | number | true | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode>;
    }
    export function registerErrorDisplayer<E extends Error>(errorClass: new (...args: any[]) => E, displayer: ErrorDisplayerType<E>): void;
}

declare module '@jointhedots/core/react/useLocation' {
    import { MapLike } from '@jointhedots/core/common/types';
    export function useLocation(): Location;
    export function useLocationHash(): string;
    export function getLocationQuery(): MapLike<string>;
}

declare module '@jointhedots/core/react/interface' {
    import { z, type ZodObject, type ZodRawShape } from 'zod';
    import { ServiceEntry, type ServiceDefinition, type ServiceInterface } from '@jointhedots/core/services';
    export type ViewServicePoint = {
        service?: string;
        cardinality?: number;
    };
    export type ViewRequirements = {
        servicePoints?: Record<string, ViewServicePoint>;
    };
    /**
     * Creates a ServiceDefinition for a React view component with typed props.
     *
     * This factory function generates a service definition that can be used to register
     * React components within the service system. It provides type-safe props validation
     * using Zod schemas and supports dependency injection through service points.
     *
     * @param props - Optional Zod schema defining the component's props structure.
     *                If not provided, defaults to a record accepting any string keys.
     * @returns A ServiceDefinition specialized for React view components
     *
     * @example
     * ```typescript
     * // Define a component with typed props
     * const UserCardSchema = ReactComponentSchema(z.object({
     *   userId: z.string(),
     *   showAvatar: z.boolean().optional(),
     * }))
     *
     * // Use in component registration
     * const UserCard: ReactComponentType<typeof UserCardSchema> = ({ userId, showAvatar }) => {
     *   return <div>{userId}</div>
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Define a component with service requirements
     * const DashboardSchema = ReactComponentSchema(z.object({
     *   title: z.string(),
     * }))
     *
     * // Component descriptor with service points
     * const descriptor: ReactComponentDescriptor = {
     *   props: { title: "My Dashboard" },
     *   requirements: {
     *     servicePoints: {
     *       dataService: { service: "spec://data-provider", cardinality: 1 },
     *     },
     *   },
     * }
     * ```
     */
    export function ReactComponentSchema<T extends ZodRawShape>(props?: ZodObject<T>): ServiceDefinition<z.infer<z.ZodRecord<z.ZodString, z.ZodAny> | z.ZodObject<T, z.core.$strip>>, ReactComponentDescriptor<T>>;
    /**
     * Type alias for React components that integrate with the service system.
     *
     * Components of this type receive their props through `ServiceInterface<T>`,
     * which provides both the declared props and access to injected services.
     *
     * @template T - The props type, typically inferred from a Zod schema
     *
     * @example
     * ```typescript
     * const MyComponent: ReactComponentType<{ name: string }> = (props) => {
     *   return <span>Hello, {props.name}!</span>
     * }
     * ```
     */
    export type ReactComponentType<T = {}> = React.ComponentType<ServiceInterface<T>>;
    /**
     * Descriptor object for configuring a React component within the service system.
     *
     * This type defines the structure for declaring component properties and
     * service dependencies that will be injected at runtime.
     *
     * @template T - Zod shape type for props validation
     *
     * @property props - Initial props values matching the component's schema
     * @property requirements - Service injection configuration
     * @property requirements.servicePoints - Map of named service injection points,
     *           each specifying the service spec URI and optional cardinality
     *
     * @example
     * ```typescript
     * const descriptor: ReactComponentDescriptor<{ count: z.ZodNumber }> = {
     *   props: { count: 0 },
     *   requirements: {
     *     servicePoints: {
     *       counter: { service: "spec://counter-service", cardinality: 1 },
     *       logger: { service: "spec://logger" },
     *     },
     *   },
     * }
     * ```
     */
    export type ReactComponentDescriptor<T extends ZodRawShape = ZodRawShape> = {
        props?: z.infer<ZodObject<T>>;
        requirements?: ViewRequirements;
    };
    export type ViewReactService<T = any> = React.ComponentType<T>;
    export const ViewReactKey: ServiceEntry<ViewReactService<any>, any>;
    export type ViewWebComponentService = new (...props: any[]) => HTMLElement;
    export const ViewWebComponentKey: ServiceEntry<ViewWebComponentService, any>;
}

declare module '@jointhedots/core/react/useServices' {
    import React from 'react';
    import { ServiceChangeHandler, ServicePoint } from '@jointhedots/core/services/service-points';
    import { ViewRequirements } from '@jointhedots/core/react/interface';
    export type IService = unknown;
    export type ServicePointsMap = Map<ServicePoint, IService[]>;
    export enum ServiceStatus {
        NotReady = 0,
        Loading = 1,
        Ready = 2,
        Failed = 3
    }
    export interface IServicePointsProvider {
        getService<IService>(svc: ServicePoint): IService[];
    }
    export interface IServicePointsController {
        readonly provider: IServicePointsProvider;
        readonly error: MissingServiceError;
        readonly status: ServiceStatus;
        notifyChange(svc: ServicePoint): any;
        dispose(): any;
    }
    export interface IServicePointsSupport extends IServicePointsProvider {
        addController(c: IServicePointsController): any;
        removeController(c: IServicePointsController): any;
    }
    export class MissingServiceError extends Error {
        missings: ServicePoint[];
        requireds?: ServicePoint[];
        constructor(missings: ServicePoint[], requireds?: ServicePoint[]);
    }
    export const ServicePointsSupportContext: React.Context<IServicePointsSupport>;
    export const ServicePointsProviderContext: React.Context<IServicePointsProvider>;
    export function useServicesListener(listener: ServiceChangeHandler): void;
    export function useServices<IService>(servicePoint: ServicePoint<IService>, cardinality?: number): IService[];
    export function useService<IService>(servicePoint: ServicePoint<IService>, optional?: boolean): IService;
    export function useServicesController(requireds: ServicePoint[], requirements: ViewRequirements): IServicePointsController | null;
    export type ServiceConfiguratorComponent = React.ComponentType<{
        services: ServicePoint[];
    }>;
    export function UseServicePoints(props: {
        requireds?: ServicePoint[];
        requirements?: ViewRequirements;
        configurator: ServiceConfiguratorComponent;
        children: any;
    }): import( 'react/jsx-runtime').JSX.Element;
}

declare module '@jointhedots/core/react/ViewUrl' {
    import React, { ReactElement } from 'react';
    import { ViewInfos } from '@jointhedots/core/interfaces/view/interface';
    export function useCurrentView(): ViewInfos;
    export function InvokeView(props: {
        view: string | ViewInfos;
        origin?: string;
        fallback?: ReactElement;
    }): React.ReactElement<any, string | React.JSXElementConstructor<any>>;
    export function InvokeUrlHashView(props: {
        hash: string;
        fallback?: ReactElement;
    }): import( 'react/jsx-runtime').JSX.Element;
    export function InvokeURLView(props: {
        fallback?: ReactElement;
    }): import( 'react/jsx-runtime').JSX.Element;
    export function InvokeNestedView(props: {
        fallback?: ReactElement;
    }): import( 'react/jsx-runtime').JSX.Element;
}

declare module '@jointhedots/core/react/useAsyncMemo' {
    export function useAsyncMemo<T extends any>(loader: () => Promise<T>, init: T, deps: any[]): T;
}

declare module '@jointhedots/core/react/useAsyncState' {
    import React from 'react';
    export class AsyncState<T> {
        private value;
        private updateTimeout;
        private promise;
        private dispatch;
        private updateTimer;
        private shallUpdate;
        private updater;
        private deps;
        constructor(value: T, updateTimeout: number);
        use(updater: () => Promise<T>, deps: any[]): void;
        initiate(dispatch: (x: T) => void): void;
        private cancelAutoUpdate;
        private scheduleAutoUpdate;
        get isWaiting(): boolean;
        get hasState(): boolean;
        get autoUpdate(): number;
        set autoUpdate(timeout: number);
        set(value: T): void;
        get(): T;
        update(): void;
        cancel(): void;
        waiting(render: (data: T) => React.ReactNode): React.ReactNode;
        using(render: (data: T) => React.ReactNode): React.ReactNode;
    }
    export function useAsyncState<T>(updater: () => Promise<T>, deps: any[], initialState?: T, updateTime?: number): AsyncState<T>;
    export function waiting(render: () => React.ReactElement, ...waiteds: AsyncState<any>[]): React.ReactElement;
    export function using(render: () => React.ReactElement, ...waiteds: AsyncState<any>[]): React.ReactElement;
}

declare module '@jointhedots/core/react/useLocalStorage' {
    type Initier<S> = S | (() => S);
    export function useLocalStorage<T = any>(key: string, initier: Initier<T>): [T, (x: T) => void];
    export {};
}

declare module '@jointhedots/core/react/useSessionStorage' {
    type Initier<S> = S | (() => S);
    export function useSessionStorage<T = any>(key: string, initier: Initier<T>): [T, (x: T) => void];
    export {};
}

declare module '@jointhedots/core/react/useForceUpdate' {
    export function useForceUpdate(): () => void;
}

declare module '@jointhedots/core/react' {
    export * from '@jointhedots/core/react/interface';
    export * from '@jointhedots/core/react/useAsyncMemo';
    export * from '@jointhedots/core/react/useAsyncState';
    export * from '@jointhedots/core/react/useServices';
    export * from '@jointhedots/core/react/useLocation';
    export * from '@jointhedots/core/react/useLocalStorage';
    export * from '@jointhedots/core/react/useSessionStorage';
    export * from '@jointhedots/core/react/useForceUpdate';
    export * from '@jointhedots/core/react/ErrorBoundary';
    export * from '@jointhedots/core/react/ViewUrl';
}

declare module '@jointhedots/core/interfaces/rest/decorators' {
    import type { Handler } from 'hono';
    export type RESTClass<T extends Object = any> = new (...args: any[]) => T;
    export type RESTResourceInfos = {
        path?: string;
        public?: boolean;
    };
    export type RESTMethodInfos = {
        public?: boolean;
    };
    export class RESTApi {
        readonly target: RESTClass;
        readonly descriptor: RESTResourceInfos;
        constructor(target: RESTClass, descriptor: RESTResourceInfos);
        setDescriptor(descriptor: RESTResourceInfos): void;
        getMethods(): Generator<RESTMethod, void, unknown>;
        create(): any;
    }
    export class RESTMethod {
        readonly name: string;
        readonly invoked: Function;
        readonly descriptor: RESTMethodInfos;
        constructor(name: string, invoked: Function, descriptor: RESTMethodInfos);
    }
    export function getRESTApis(): {
        Resources: Map<RESTClass<any>, RESTApi>;
        Methods: Map<Function, RESTMethod>;
    };
    export const REST: {
        Resource<T extends RESTClass>(infos?: RESTResourceInfos): (target: T) => T;
        Method(infos?: RESTMethodInfos): (target: Handler, context: ClassMethodDecoratorContext) => void;
    };
}

declare module '@jointhedots/core/scripting/graph/log' {
    import type { AST } from '@jointhedots/core/scripting/ast/api';
    export class DocumentData {
        nodes: Map<number, AST.AnyPrimitive>;
        main: string;
        seq: number;
        createKey(): number;
        serialize(): {};
    }
    export function createDocumentFromAST(n: AST.Any): DocumentData;
}

declare module '@jointhedots/core/scripting/graph/uses' {
    import type { AST } from '@jointhedots/core/scripting/ast/api';
    import { type Node, type ContextInstance, type FeatureID } from '@jointhedots/core/scripting/graph/model';
    export type ValueRecast = (x: any) => any;
    export class ValueType {
        accept(ty: ValueType): boolean;
        recastTo(ty: ValueType): ValueRecast;
    }
    export class ValueConstraint {
        readonly accepteds: ValueType[];
        constructor(accepteds: ValueType[]);
        accept(ty: ValueType): boolean;
    }
    export abstract class BasicType extends ValueType {
        accept(ty: ValueType): boolean;
        recastTo(ty: ValueType): ValueRecast;
    }
    export class NumberType extends BasicType {
        static Self: NumberType;
        accept(ty: ValueType): boolean;
        recastTo(ty: ValueType): ValueRecast;
    }
    export class StringType extends BasicType {
        static Self: StringType;
        accept(ty: ValueType): boolean;
        recastTo(ty: ValueType): ValueRecast;
    }
    export class AnyType extends ValueType {
        static Self: AnyType;
        static Constraint: ValueConstraint;
        accept(ty: ValueType): boolean;
        recastTo(ty: ValueType): ValueRecast;
    }
    export type ObjectClass = new (...args: any[]) => any;
    export class ObjectType extends ValueType {
        readonly ctor: ObjectClass;
        static Self: ObjectType;
        constructor(ctor: ObjectClass);
        accept(ty: ValueType): boolean;
    }
    export class JSXType extends ValueType {
        static Self: JSXType;
        static Constraint: ValueConstraint;
        accept(ty: ValueType): any;
    }
    export enum UseLink {
        Strong = 0,
        Weak = 1
    }
    export interface Use<T = any> {
        readonly link: UseLink;
        get(ctx: ContextInstance): T;
    }
    export class UseList<T = any> extends Array<Use<T>> {
        get(ctx: ContextInstance): T[];
        static create(user: Node, items: AST.Any[], constraint?: ValueConstraint): UseList;
    }
    export class UseAggregate extends Array<Use> {
        readonly buckets: FeatureID[];
        mapping: Uint8Array;
        constructor(length: number, buckets: FeatureID[]);
        get(ctx: ContextInstance): any[][];
        static create(user: Node, items: AST.Any[], buckets: FeatureID[]): UseAggregate;
    }
    export function isInheritedOf(cls: ObjectClass, parent: ObjectClass): boolean;
    export interface Displayable {
        display(ctx: ContextInstance): React.ReactNode;
    }
    export class UseDisplayable implements Use {
        readonly node: Displayable;
        constructor(node: Displayable, constraint: ValueConstraint);
        get link(): UseLink;
        get(ctx: ContextInstance): React.ReactNode;
    }
    export interface Readable {
        read(ctx: ContextInstance): any;
    }
    export class UseReadable implements Use {
        readonly node: Readable;
        constructor(node: Readable, constraint: ValueConstraint);
        get link(): UseLink;
        get(ctx: ContextInstance): React.ReactNode;
    }
}

declare module '@jointhedots/core/scripting/graph/model' {
    import type { AST } from '@jointhedots/core/scripting/ast/api';
    import type { NodeKey } from '@jointhedots/core/scripting/ast/primitives';
    import type { GraphBuilder } from '@jointhedots/core/scripting/graph/builder';
    import type { DocumentData } from '@jointhedots/core/scripting/graph/log';
    import { type Use, type ValueConstraint } from '@jointhedots/core/scripting/graph/uses';
    export type NodeSymbol = string | Symbol;
    export type NodeCtor<T extends Node = Node> = new ($key: NodeKey, $class: NodeClass, model: DocumentModel) => T;
    export interface NodeClass {
        getConstructor(): NodeCtor;
        updateNode(n: Node): Promise<void>;
        linkNode(n: Node): void;
    }
    export interface NodeNamespace {
        resolveIdentifier(symbol: NodeSymbol): Node;
    }
    export type ResultValue<T> = T | Promise<T>;
    export type FeatureID = string | symbol;
    export const GetterFeature: unique symbol;
    export const SetterFeature: unique symbol;
    export const DisplayFeature: unique symbol;
    export class Node<Data extends AST.Node = AST.Any> {
        readonly $key: NodeKey;
        readonly $class: NodeClass;
        readonly model: DocumentModel;
        $owner: Node;
        constructor($key: NodeKey, $class: NodeClass, model: DocumentModel);
        get data(): Data;
        get symbol(): NodeSymbol;
        get $namespace(): NodeNamespace;
        get $context(): ContextModel;
        use(feature: FeatureID, constraint?: ValueConstraint): Use;
        toString(): string;
    }
    export class State<T extends any> {
        index: number;
        initial: any;
        constructor(index: number, initial: any);
        read(ctx: ContextInstance): T;
        write(ctx: ContextInstance, value: T): T;
    }
    export interface Executor {
        init(ctx: ContextInstance): any;
        update(ctx: ContextInstance): any;
    }
    export class Task {
        index: number;
        executor: Executor;
        constructor(index: number, executor: Executor);
    }
    export interface ContextController {
        getControllerNode(): Node;
        apply(ctx: ContextInstance): any;
    }
    export class ContextModel {
        readonly controller: ContextController;
        members: Map<NodeSymbol, Node<AST.AnyPrimitive>>;
        states: State<any>[];
        tasks: Task[];
        statements: Node[];
        output: State<any>;
        constructor(controller: ContextController);
        addMember(symbol: NodeSymbol, node: Node): void;
        addState<T>(initial: T): State<T>;
        addTask(executor: Executor): Task;
        addOutput(): State<any>;
    }
    export enum FlowControl {
        Execute = 0,
        Return = 1,// For return
        Exit = 2,// For continue
        Break = 3
    }
    export class ContextInstance {
        readonly model: ContextModel;
        readonly parent: ContextInstance;
        layers: Set<ContextInstance>;
        state_values: any[];
        state_times: Uint32Array;
        tasks_statuses: Uint32Array;
        control: FlowControl;
        timecode: number;
        constructor(model: ContextModel, parent: ContextInstance);
        execute(): Promise<void>;
        schedule(task: Task): void;
        run(): void;
        dispose(): void;
    }
    export class DocumentModel implements ContextController {
        readonly data: DocumentData;
        readonly nodes: Map<number, Node<AST.AnyPrimitive>>;
        controller: ContextController;
        builder: GraphBuilder;
        globalModel: ContextModel;
        globalInstance: ContextInstance;
        constructor(data: DocumentData);
        getControllerNode(): Node;
        apply(ctx: ContextInstance): any;
        getNode(data: any): Node<AST.AnyPrimitive>;
        createInstance(): any;
        createCallback(): (...args: any[]) => any;
    }
}

declare module '@jointhedots/core/scripting/graph/register' {
    import type { Node, NodeClass, NodeCtor } from '@jointhedots/core/scripting/graph/model';
    type NodeTag = string | symbol; class ModelRegister {
        classes: Map<NodeTag, NodeClass>;
        Node<T extends Node>(config: {
            type: NodeTag;
            linkNode?: (n: T) => void;
            updateNode?: (n: T) => Promise<void>;
        }): (constructor: NodeCtor<T>) => NodeCtor<T>;
        getNodeClassOf(ctor: any): NodeClass;
    }
    export const Model: ModelRegister;
    export {};
}

declare module '@jointhedots/core/scripting/graph/builder' {
    import type { DocumentData } from '@jointhedots/core/scripting/graph/log';
    import { DocumentModel, type Node, type NodeClass } from '@jointhedots/core/scripting/graph/model';
    export interface GraphScriptResolver {
        resolveNodeClass(type: string): NodeClass;
    }
    export class GraphBuilder {
        readonly model: DocumentModel;
        readonly data: DocumentData;
        readonly resolver: GraphScriptResolver;
        unconsolidatedElements: Set<Node<import( '@jointhedots/core/scripting/ast/primitives').AnyPrimitive>>;
        constructor(model: DocumentModel, data: DocumentData, resolver: GraphScriptResolver);
        revise(target: Node): void;
    }
    export function createGlobalResolver(): GraphScriptResolver;
    export function updateModel(b: GraphBuilder): void;
}

declare module '@jointhedots/core/scripting/graph/values' {
    export class Pipeline<T> implements PromiseLike<T> {
        private resolvers;
        private value;
        private paused;
        emit(value: T): this;
        then<R = T>(onfulfilled?: ((value: T) => R | PromiseLike<R>) | null): Promise<any>;
        map<R>(fn: (value: T) => R): Pipeline<R>;
        filter(fn: (value: T) => boolean): Pipeline<T>;
        pipe<R>(fn: (pipeline: Pipeline<T>) => Pipeline<R>): Pipeline<R>;
        pause(): this;
        resume(): this;
        getValue(): T;
        subscribe(listener: (value: T) => void): () => boolean;
        private listeners;
    }
}

declare module '@jointhedots/core/scripting/graph/nodes/nodes-expr' {
    import type { AST } from '@jointhedots/core/scripting/ast/api';
    import { ContextInstance, Node, type FeatureID } from '@jointhedots/core/scripting/graph/model';
    import { ValueConstraint, type Use } from '@jointhedots/core/scripting/graph/uses';
    export abstract class DXExpr<Data extends AST.Node = AST.Any, Value = any> extends Node<Data> {
        abstract evaluate(ctx: ContextInstance): any;
        use(feature: FeatureID, constraint: ValueConstraint): Use;
    }
    export class Literal extends DXExpr<AST.Literal> {
        value: any;
        evaluate(ctx: ContextInstance): any;
    }
    export class Identifier extends Node<AST.Identifier> {
        target: Node;
        use(feature: FeatureID, constraint: ValueConstraint): Use;
    }
}

declare module '@jointhedots/core/scripting/graph/nodes/nodes-states' {
    import type { AST } from '@jointhedots/core/scripting/ast/api';
    import { Node, type NodeSymbol, type FeatureID } from '@jointhedots/core/scripting/graph/model';
    import { ValueConstraint, type Use } from '@jointhedots/core/scripting/graph/uses';
    export class DXElement extends Node<AST.ElementPrimitive> {
        get symbol(): NodeSymbol;
        getAttribut(name: string, ns?: string): Node;
        use(fature: FeatureID, constraint: ValueConstraint): Use;
        toString(): string;
    }
}

declare module '@jointhedots/core/scripting/graph/nodes/nodes-render' {
    export {};
}

declare module '@jointhedots/core/scripting/graph/api' {
    /***********
     * Flow Graph: Intermediate flow representation, consolidate basic syntax and connect element from document
    **********/
    import { DocumentModel } from '@jointhedots/core/scripting/graph/model';
    import '@jointhedots/core/scripting/graph/nodes/nodes-states';
    import '@jointhedots/core/scripting/graph/nodes/nodes-expr';
    import '@jointhedots/core/scripting/graph/nodes/nodes-render';
    import type { AST } from '@jointhedots/core/scripting/ast/api';
    export function loadScriptGraphFromAST(ast: AST.DocumentPrimitive): Promise<DocumentModel>;
}

declare module '@jointhedots/core/scripting/builder' {
    export function createFlowFromMdx(text: string): Promise<import( '@jointhedots/core/scripting/graph/model').DocumentModel>;
}

declare module '@jointhedots/core/scripting/ast/serde/printer' {
    import * as AST from '@jointhedots/core/scripting/ast/primitives';
    export function stringify_node_jsx(n: AST.Any): string;
    export function stringify_document(n: AST.Any): string;
}

declare module '@jointhedots/core/scripting/graph/helpers' {
    import { Node } from '@jointhedots/core/scripting/graph/model';
    export function stringifyGraph(n: Node): string;
}

