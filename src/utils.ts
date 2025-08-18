import { JSDocableNode, NameableNodeSpecific, NamedNodeSpecificBase, Type } from 'ts-morph';

let unnamedCounter = 0;

const specialNames = [
	'as',
	'do',
	'while',
	'if',
	'else',
	'for',
	'in',
	'return',
	'break',
	'continue',
	'switch',
	'case',
	'throw',
	'try',
	'catch',
	'finally',
	'inline',
	'operator',
	'suspend',
	'dynamic',
	'object'
];

/**
 * Finds the name of a declaration, handling special cases like dots in names,
 * @param declaration The declaration to find the name for.
 * @returns The name of the declaration, or a generated name if it is unnamed.
 */
export function findName(declaration: NameableNodeSpecific | NamedNodeSpecificBase<any>): string {
	let name = declaration.getName();
	if (name) {
		// Handle names with curly braces
		if (name.startsWith('{') && name.endsWith('}')) {
			name = `object${unnamedCounter++}`;
		}

		// Handle constants that are resolved to a string
		if (name.startsWith('[') && name.endsWith(']')) {
			const resolved = currentConstants.get(name);
			if (resolved) {
				return resolved;
			}

			return `__${name}`; // mark as private
		}

		// Handle special names that are in quotes
		if (name.startsWith('"')) name = name.slice(1);

		if (name.endsWith('"')) name = name.slice(0, -1);

		// Handle reserved keywords and special characters
		if (
			specialNames.includes(name) ||
			name.includes('-') ||
			name.includes(' ') ||
			name.includes('/') ||
			!Number.isNaN(Number(name.at(0)))
		) {
			return `\`${name}\``; // Escape reserved keywords with backticks
		}

		// Handle names with dots (e.g., module names)
		if (name.includes('.')) {
			name = name.split('.').pop() || name; // Get the last part after the dot
		}

		return name!;
	} else {
		unnamedCounter++;
		return `Unnamed${unnamedCounter}`;
	}
}

export function findType(type: Type): Type {
	let currentType = type;
	if (type.isLiteral()) {
		currentType = type.getBaseTypeOfLiteralType();
	}

	if (type.isUnionOrIntersection()) {
		const types = currentType.getUnionTypes().map((t) => findType(t));
		const uniqueTypes = types.filter((t, index) => types.indexOf(t) === index);
		if (uniqueTypes.length === 1) {
			return uniqueTypes[0];
		}
	}

	return type;
}

/**
 * Generates JSDoc comments for a given declaration.
 * @param declaration The declaration to generate JSDoc for.
 * @param nl The newline character to use in the JSDoc.
 * @param indent The indentation to use in the JSDoc.
 * @returns A string containing the JSDoc comments.
 */
export function getJsDoc(declaration: JSDocableNode, nl: string, indent: string = ''): string {
	const jsdoc = declaration
		.getJsDocs()
		.map((doc) => {
			const tags = doc
				.getTags()
				.map((tag) => {
					const text = tag.getText(false) || 'No description provided.';
					if (text.startsWith('@returns')) {
						return `@return ${text.replace('@returns', '')}`;
					}

					return text;
				})
				.join(`${nl}${indent} * `);

			return `${indent}/**${nl}${indent} * ${doc.getCommentText() || ''}${nl}${indent} * ${tags}${nl}${indent} */`;
		})
		.join(`${nl}${nl}`);
	return jsdoc ? `${jsdoc}${nl}` : '';
}

const types: Record<string, string> = {
	// Primitive types
	string: 'String',
	number: 'Double',
	bigint: 'Long',
	boolean: 'Boolean',
	any: 'Any',
	object: 'Any',
	void: 'Unit',
	undefined: 'Unit',
	null: 'Unit',
	never: 'Nothing',
	unknown: 'Any',
	// Array types
	Int8Array: 'ByteArray',
	Uint8Array: 'ByteArray',
	'Uint8Array<ArrayBuffer>': 'ByteArray',
	'Uint8Array<ArrayBufferLike>': 'ByteArray',
	Uint8ClampedArray: 'ByteArray',
	Int16Array: 'ShortArray',
	Uint16Array: 'ShortArray',
	Int32Array: 'IntArray',
	Uint32Array: 'IntArray',
	Float32Array: 'FloatArray',
	Float64Array: 'DoubleArray',
	// TypeScript Library types
	this: 'dynamic',
	Record: 'Map',
	'void | Promise<void>': 'Unit',
	'void | undefined': 'Unit',
	ArrayBufferLike: 'ArrayBuffer',
	'ArrayBuffer | ArrayBufferView<ArrayBuffer>': 'ArrayBuffer',
	'ArrayBuffer | ArrayBufferView': 'ArrayBuffer',
	Function: 'Function<Unit>',
	AsyncIterableIterator: 'AsyncIterator',
	IterableIterator: 'Iterator'
};

const innerTypes = [
	// Inner types are types that should be exported to their inner generic type
	'Readonly',
	'Partial',
	'Required'
];

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
	let depth = 0,
		start = -1;

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
 * @param originalType The TypeScript type to convert.
 * @param strict Whether to never return a new type.
 * @param noDynamic Whether to never return a dynamic type.
 * @returns The corresponding Kotlin type as a string.
 * @example
 * convertToKotlinType("string") // returns "String"
 * convertToKotlinType("number[]") // returns "Array<Double>"
 * convertToKotlinType("Promise<string>") // returns "Promise<String>"
 */
export function convertToKotlinType(originalType: string, strict: boolean = false, noDynamic: boolean = false): string {
	if (!originalType) return '';

	const dynamicType = noDynamic ? 'Any' : 'dynamic';
	let type = originalType.trim();
	if (types[type]) return types[type];

	if (strict) return `${dynamicType} /* ${type} */`;

	// import
	if (type.startsWith('import')) {
		const lastDotIndex = type.lastIndexOf('.');
		if (lastDotIndex !== -1) {
			return type.slice(lastDotIndex + 1).replace(/"/g, '');
		}

		return `${dynamicType} /* ${type} */`;
	}

	// typeof, new, readonly
	if (type.startsWith('typeof') || type.startsWith('new') || type.startsWith('readonly')) {
		return convertToKotlinType(type.split(' ').slice(1).join(' '));
	}

	// keyof, Omit, Pick
	if (type.startsWith('keyof') || type.startsWith('Omit<') || type.startsWith('Pick<')) {
		return `${dynamicType} /* ${type} */`;
	}

	// Handle unions and intersections
	if (type.includes('|') || type.includes('&')) {
		if (type.includes('&')) return `${dynamicType} /* ${type} */`;

		const unionTypes = type.split('|').map((t) => t.trim());
		const convertedTypes = unionTypes.map((t) => convertToKotlinType(t, strict, noDynamic));
		const uniqueTypes = convertedTypes.filter((t, index) => convertedTypes.indexOf(t) === index);

		if (uniqueTypes.length === 1) {
			return convertedTypes[0];
		}

		if (uniqueTypes.length === 2) {
			if (uniqueTypes.includes('undefined') || uniqueTypes.includes('null')) {
				return `${uniqueTypes.find((t) => t !== 'undefined' && t !== 'null')}?` || dynamicType;
			}
		}

		const finalType = uniqueTypes.join(' | ');
		if (types[finalType]) return types[finalType];

		return `${dynamicType} /* ${finalType} */`;
	}

	// Handle conditional types
	const conditionalRegex = /^(.+)\s+extends\s+(.+)\s*\?\s*(.+)\s*:\s*(.+)$/;
	const conditionalMatch = type.match(conditionalRegex);

	if (conditionalMatch) {
		const [_, __, constraint, trueType, falseType] = conditionalMatch.map((s) => s.trim());

		const functionConstraint = `(...args: any[]) => any`;
		if (constraint === functionConstraint) {
			const convertedTrue = convertToKotlinType(trueType, strict, noDynamic);
			const convertedFalse = convertToKotlinType(falseType, strict, noDynamic);

			if (convertedFalse === 'unknown' || convertedFalse === 'Any') {
				return `${convertedTrue}?`;
			}

			return `${dynamicType} /* ${type} */`;
		}
	}

	// Handle arrow functions
	const fnMatch = /^\((.*)\)\s*=>\s*(.+)$/.exec(type);
	if (fnMatch) {
		const [_, params, returnType] = fnMatch;
		const paramList = splitGenerics(params)
			.map((param) => {
				const [_, paramType] = param.split(':').map((s) => s.trim());
				const type = convertToKotlinType(paramType || 'Any');

				// Filter out Nothing
				if (type === 'Nothing') return null;

				return type;
			})
			.filter(Boolean);
		return `(${paramList.join(', ')}) -> ${convertToKotlinType(returnType.trim(), strict, noDynamic)}`;
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
		return `${dynamicType} /* ${type} */`;
	}

	// Modularized names without generics
	if (type.includes('.') && !type.includes('<')) {
		return convertToKotlinType(type.split('.').pop()!, strict, noDynamic);
	}

	// Handle array suffixes (e.g., string[][])
	let arrayDepth = 0;
	while (type.endsWith('[]')) {
		arrayDepth++;
		type = type.slice(0, -2).trim();
	}

	// Handle array types with specified length (e.g. [string, number])
	if (type.startsWith('[') && type.endsWith(']')) {
		const innerTypes = type
			.slice(1, -1)
			.split(',')
			.map((t) => t.trim());
		const convertedInnerTypes = innerTypes.map((t) => convertToKotlinType(t, strict, noDynamic));
		const uniqueInnerTypes = convertedInnerTypes.filter((t, index) => convertedInnerTypes.indexOf(t) === index);

		if (uniqueInnerTypes.length === 1) {
			return `Array<${uniqueInnerTypes[0]}>`;
		}

		return `Array<${dynamicType}> /* ${type} */`;
	}

	// Indexed access types (e.g., string['key'])
	if (type.includes('[') && type.includes(']')) {
		return `${dynamicType} /* ${type} */`;
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

		const args = splitGenerics(argsRaw)
			.map((arg) => {
				const type = convertToKotlinType(arg, strict, noDynamic);

				// Filter out nothing
				if (type === 'Nothing') return null;

				return type;
			})
			.filter(Boolean);

		if (args.length === 0) {
			return base; // No generics, just return the base type
		}

		// Handle inner types
		if (innerTypes.includes(base) && args.length == 1) {
			baseType = args[0] ?? dynamicType;
		} else {
			baseType = `${base}<${args.join(', ')}>`;
		}
	} else {
		baseType = types[type] ?? type;

		// Handle object types
		if (type.startsWith('{') && type.endsWith('}')) baseType = `${dynamicType} /* ${type} */`;
	}

	// Wrap in array if needed
	for (let i = 0; i < arrayDepth; i++) {
		baseType = `Array<${baseType}>`;
	}

	return baseType;
}
