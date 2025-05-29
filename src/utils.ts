import { JSDocableNode, NameableNodeSpecific, NamedNodeSpecificBase } from "ts-morph";

let unnamedCounter = 0;
export function findName(declaration: NameableNodeSpecific | NamedNodeSpecificBase<any>): string {
    if (declaration.getName()) {
        return declaration.getName()!;
    } else {
        unnamedCounter++;
        return `UnnamedClass${unnamedCounter}`;
    }
}

export function getJsDoc(declaration: JSDocableNode, nl: string, indent: string = ''): string {
    const jsdoc = declaration.getJsDocs().map(doc => {
        const tags = doc.getTags().map(tag => {
            const tagName = tag.getTagName();
            const tagText = tag.getComment() || "";
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
}

export function convertToKotlinType(type: string): string {
    // Handle union types first
    if (type.includes(" | ")) {
        // Replace union types with Kotlin's dynamic type
        const unionTypes = type.split(" | ").map(t => convertToKotlinType(t.trim())).join(" | ");
        return `dynamic /* ${unionTypes} */`;
    }

    // Handle function types (e.g., (a: string, b: number) => boolean)
    const functionTypeRegex = /^\s*\((.*?)\)\s*=>\s*(.+)$/;
    const functionMatch = type.match(functionTypeRegex);
    if (functionMatch) {
        const params = functionMatch[1]
            .split(",")
            .map(param => {
                const parts = param.split(":");
                if (parts.length === 2) {
                    return convertToKotlinType(parts[1].trim());
                }
                return "Any";
            })
            .filter(Boolean)
            .join(", ");
        const returnType = convertToKotlinType(functionMatch[2].trim());
        return `(${params}) -> ${returnType}`;
    }

    // Handle array types (e.g., string[][])
    let arrayDepth = 0;
    let baseType = type;
    while (baseType.endsWith("[]")) {
        arrayDepth++;
        baseType = baseType.slice(0, -2);
    }

    // Handle generic types (e.g., Array<string>)
    const genericMatch = baseType.match(/^(\w+)<(.+)>$/);
    if (genericMatch) {
        let genericBase = genericMatch[1];
        const genericArgs = genericMatch[2]
            .split(",")
            .map(arg => convertToKotlinType(arg.trim()))
            .join(", ");
        genericBase = types[genericBase] || genericBase;
        baseType = `${genericBase}<${genericArgs}>`;
    } else {
        baseType = types[baseType] || baseType;
    }

    let returnedType = baseType;
    if (arrayDepth > 0) {
        returnedType = "Array<".repeat(arrayDepth) + baseType + ">".repeat(arrayDepth);
    }

    return returnedType;
}
