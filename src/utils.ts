import { JSDocableNode, NameableNodeSpecific, NamedNodeSpecificBase, Type } from "ts-morph";

let unnamedCounter = 0;

/**
 * Finds the name of a declaration, handling special cases like dots in names,
 * @param declaration The declaration to find the name for.
 * @returns The name of the declaration, or a generated name if it is unnamed.
 */
export function findName(declaration: NameableNodeSpecific | NamedNodeSpecificBase<any>): string {
    let name = declaration.getName();
    if (name) {
        // Handle names with dots (e.g., module names)
        if (name.includes('.')) {
            name = name.split('.').pop() || name; // Get the last part after the dot
        }

        // Handle names with curly braces
        if (name.startsWith('{') && name.endsWith('}')) {
            name = `object${unnamedCounter++}`
        }

        // Handle constants that are resolved to a string
        if (name.startsWith('[') && name.endsWith(']')) {
            const resolved = currentConstants.get(name)
            if (resolved) {
                return resolved;
            } else {
                return name.slice(1, -1); // Return the name without brackets if not found in constants
            }
        }

        // Handle special names that are in quotes or have special characters
        if (name.startsWith('"') && name.endsWith('"')) {
            return `\`${name.slice(1, -1)}\`` // Return the name without quotes escaped for Kotlin
        }

        return name!;
    } else {
        unnamedCounter++;
        return `Unnamed${unnamedCounter}`;
    }
}

export function findType(type: Type): Type {
    let currentType = type
    if (type.isLiteral()) {
        currentType = type.getBaseTypeOfLiteralType();
    }

    if (type.isUnionOrIntersection()) {
        const types = currentType.getUnionTypes().map(t => findType(t))
        const uniqueTypes = types.filter((t, index) => types.indexOf(t) === index);
        if (uniqueTypes.length === 1) {
            return uniqueTypes[0];
        }
    }

    return type
}

const tagNameConversions: Record<string, string> = {
    "returns": "return",
}

/**
 * Generates JSDoc comments for a given declaration.
 * @param declaration The declaration to generate JSDoc for.
 * @param nl The newline character to use in the JSDoc.
 * @param indent The indentation to use in the JSDoc.
 * @returns A string containing the JSDoc comments.
 */
export function getJsDoc(declaration: JSDocableNode, nl: string, indent: string = ''): string {
    const jsdoc = declaration.getJsDocs().map(doc => {
        const tags = doc.getTags().map(tag => {
            const tagName = tag.getTagName();
            const convertedTagName = tagNameConversions[tagName] || tagName;

            const tagText = tag.getCommentText() || "No description provided.";
            return `@${convertedTagName} ${tagText}`;
        }).join(`${nl}${indent} * `);

        return `${indent}/**${nl}${indent} * ${doc.getCommentText() || ""}${nl}${indent} * ${tags}${nl}${indent} */`;
    }
    ).join(`${nl}${nl}`);
    return jsdoc ? `${jsdoc}${nl}` : '';
}

const types: Record<string, string> = {
    // Primitive types
    "string": "String",
    "number": "Double",
    "bigint": "Long",
    "boolean": "Boolean",
    "any": "Any",
    "object": "Any",
    "void": "Unit",
    "undefined": "Unit",
    "null": "Unit",
    "never": "Nothing",
    "unknown": "Any",
    // Array types
    "Int8Array": "ByteArray",
    "Uint8Array": "ByteArray",
    "Uint8ClampedArray": "ByteArray",
    "Int16Array": "ShortArray",
    "Uint16Array": "ShortArray",
    "Int32Array": "IntArray",
    "Uint32Array": "IntArray",
    "Float32Array": "FloatArray",
    "Float64Array": "DoubleArray",
    // TypeScript Library types
    "Record": "Map",
    "Readonly": "Map"
}

/**
 * A map to store constants that are resolved to strings.
 * This is used to handle cases where constants are defined
 * in TypeScript and need to be converted to Kotlin.
 */
export const currentConstants: Map<string, string> = new Map<string, string>();

function splitGenerics(input: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if ((char === '"' || char === "'") && !inString) {
            inString = true;
            stringChar = char;
            current += char;
            continue;
        } else if (char === stringChar && inString) {
            inString = false;
            current += char;
            continue;
        }

        if (inString) {
            current += char;
            continue;
        }

        if (char === '<') depth++;
        else if (char === '>') depth--;
        else if (char === ',' && depth === 0) {
            result.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    if (current.trim()) result.push(current.trim());

    return result;
}

function extractGenericParts(type: string): [string, string] | null {
    let depth = 0, start = -1;

    for (let i = 0; i < type.length; i++) {
        if (type[i] === '<') {
            if (depth === 0) start = i;
            depth++;
        } else if (type[i] === '>') {
            depth--;
            if (depth === 0) {
                const base = type.substring(0, start).trim();
                const args = type.substring(start + 1, i).trim();
                return [base, args];
            }
        }
    }

    return null;
}

/**
 * Converts a TypeScript type to a Kotlin type.
 * @param type The TypeScript type to convert.
 * @returns The corresponding Kotlin type as a string.
 * @example
 * convertToKotlinType("string") // returns "String"
 * convertToKotlinType("number[]") // returns "Array<Double>"
 * convertToKotlinType("Promise<string>") // returns "Promise<String>"
 */
export function convertToKotlinType(originalType: string): string {
    let type = originalType.trim();
    console.log(`Converting TypeScript type: '${type}'`);
    if (types[type]) return types[type];

    // typeof, new
    if (type.startsWith('typeof') || type.startsWith('new')) {
        return convertToKotlinType(type.split(' ').slice(1).join(' '));
    }

    // keyof
    if (type.startsWith('keyof')) {
        return "dynamic";
    }

    // Handle unions and intersections
    if (type.includes('|') || type.includes('&')) {
        const delimiter = type.includes('|') ? '|' : '&';
        if (delimiter === '&' && type.includes(' | ')) {
            // If both union and intersection are present, prioritize union
            return 'dynamic';
        }

        // Check to see if they're all the same primitive type
        const parts = splitGenerics(type.split(delimiter).join(',')).map(s => s.trim()).filter(Boolean);
        if (parts.length === 0) return 'dynamic';

        function getPrimitiveType(val: string): string | null {
            if (/^(['"])(.*)\1$/.test(val)) return 'string';
            if (/^\d+(\.\d+)?$/.test(val)) return 'number';
            if (val === 'true' || val === 'false') return 'boolean';
            if (val === 'bigint') return 'bigint';
            if (val === 'null') return 'null';
            if (val === 'undefined') return 'undefined';

            return null;
        }

        const primitiveTypes = parts.map(getPrimitiveType);
        const uniqueTypes = Array.from(new Set(primitiveTypes.filter(Boolean)));

        if (uniqueTypes.length === 1) {
            switch (uniqueTypes[0]) {
                case 'string':
                    parts.forEach(p => {
                        if (/^(['"])(.*)\1$/.test(p)) currentConstants.set(p, p.slice(1, -1));
                    });
                    return 'String';
                case 'number':
                    return 'Double';
                case 'boolean':
                    return 'Boolean';
                case 'bigint':
                    return 'Long';
                case 'null':
                case 'undefined':
                    return 'Unit';
            }
        }

        return 'dynamic';
    }

    // Handle arrow functions
    const fnMatch = /^\((.*)\)\s*=>\s*(.+)$/.exec(type);
    if (fnMatch) {
        const [_, params, returnType] = fnMatch;
        const paramList = splitGenerics(params).map(param => {
            const [_, paramType] = param.split(":").map(s => s.trim());
            return convertToKotlinType(paramType || "Any");
        });
        return `(${paramList.join(", ")}) -> ${convertToKotlinType(returnType.trim())}`;
    }

    // Handle literals
    if (/^(['"]).*\1$/.test(type)) {
        currentConstants.set(type, type.slice(1, -1));
        return 'String';
    }

    if (/^\d+(\.\d+)?$/.test(type)) return 'Double';
    if (type === 'true' || type === 'false') return 'Boolean';

    // Inline object types
    if (type.startsWith('{') && type.endsWith('}')) {
        return `Map<String, Any> /* ${type} */`;
    }

    // Modularized names without generics
    if (type.includes('.') && !type.includes('<')) {
        return convertToKotlinType(type.split('.').pop()!);
    }

    // Handle array suffixes (e.g., string[][])
    let arrayDepth = 0;
    while (type.endsWith('[]')) {
        arrayDepth++;
        type = type.slice(0, -2).trim();
    }

    // Handle generic types
    const generic = extractGenericParts(type);
    let baseType: string;
    if (generic) {
        const [baseRaw, argsRaw] = generic;
        let base = types[baseRaw.trim()] ?? baseRaw.trim();
        
        // Handle modularized names
        if (base.includes('.')) {
            base = base.split('.').pop()!;
        }

        const args = splitGenerics(argsRaw).map(arg => convertToKotlinType(arg));
        baseType = `${base}<${args.join(', ')}>`;
    } else {
        baseType = types[type] ?? type;
    }

    // Wrap in array if needed
    for (let i = 0; i < arrayDepth; i++) {
        baseType = `Array<${baseType}>`;
    }

    return baseType;
}