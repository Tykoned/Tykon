import { JSDocableNode, NameableNodeSpecific, NamedNodeSpecificBase } from "ts-morph";

let unnamedCounter = 0;
export function findName(declaration: NameableNodeSpecific | NamedNodeSpecificBase<any>): string {
    let name = declaration.getName();
    if (name) {
        // Handle names with dots (e.g., module names)
        if (name.includes('.')) {
            name = name.split('.').pop() || name; // Get the last part after the dot
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

export function getJsDoc(declaration: JSDocableNode, nl: string, indent: string = ''): string {
    const jsdoc = declaration.getJsDocs().map(doc => {
        const tags = doc.getTags().map(tag => {
            const tagName = tag.getTagName();
            const tagText = tag.getCommentText() || "No description provided.";
            return `@${tagName} ${tagText}`;
        }).join(`${nl}${indent} * `);

        return `${indent}/**${nl}${indent} * ${doc.getComment() || ""}${nl}${indent} * ${tags}${nl}${indent} */`;
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
    "Readonly": "Map",
    "Promise": "Promise"
}

export const currentConstants: Map<string, string> = new Map<string, string>();

function splitGenerics(input: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (char === '"' || char === "'") inString = !inString;
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

function isInlineObjectType(type: string): boolean {
    return /^{[^{}]*}$/.test(type.trim());
}

export function convertToKotlinType(type: string): string {
    type = type.trim();

    // Handle unions and intersections
    if (type.includes('|') || type.includes('&')) {
        return 'dynamic';
    }

    // Handle constant strings
    if (/^(['"])(.*)\1$/.test(type)) {
        currentConstants.set(type, type.slice(1, -1));
        return 'String';
    }

    // Handle literal values like numbers or booleans
    if (/^\d+(\.\d+)?$/.test(type)) return 'Double';
    if (type === 'true' || type === 'false') return 'Boolean';

    // Handle inline object types
    if (isInlineObjectType(type)) {
        return 'dynamic';
    }

    // Handle qualified names (e.g., module.Type)
    if (type.includes('.')) {
        const parts = type.split('.');
        return convertToKotlinType(parts[parts.length - 1]);
    }

    // Handle function types
    const fnMatch = /^\((.*)\)\s*=>\s*(.+)$/.exec(type);
    if (fnMatch) {
        const [_, paramStr, returnType] = fnMatch;

        const params = splitGenerics(paramStr).map(param => {
            const [name, paramType] = param.split(":").map(s => s.trim());
            return convertToKotlinType(paramType || 'Any');
        });

        return `(${params.join(", ")}) -> ${convertToKotlinType(returnType.trim())}`;
    }

    // Handle array suffix (e.g., string[][])
    let arrayDepth = 0;
    while (type.endsWith('[]')) {
        arrayDepth++;
        type = type.slice(0, -2).trim();
    }

    // Handle generic types
    const genericParts = extractGenericParts(type);
    let baseType: string;
    if (genericParts) {
        const [base, rawArgs] = genericParts;
        const args = splitGenerics(rawArgs).map(convertToKotlinType);
        const convertedBase = types[base] || base;
        baseType = `${convertedBase}<${args.join(", ")}>`;
    } else {
        baseType = types[type] || type;
    }

    // Apply array nesting if needed
    if (arrayDepth > 0) {
        return 'Array<'.repeat(arrayDepth) + baseType + '>'.repeat(arrayDepth);
    }

    return baseType;
}