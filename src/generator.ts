import { ClassDeclaration, FunctionDeclaration, InterfaceDeclaration, ModifierableNode, ModuleDeclaration, Node, SourceFile, StatementedNode, SyntaxKind, TypeAliasDeclaration, VariableDeclaration, VariableStatement } from "ts-morph";
import { TykonConfig } from "./config";
import * as utils from "./utils";

// Generator Utilities

function createProperties(declaration: ClassDeclaration | InterfaceDeclaration, config: TykonConfig): string {
    let output = "";
    const nl = config.newLine || '\n';
    const indent = config.tabs ? '\t'.repeat(config.tabs) : ' '.repeat(config.spaces || 4);

    for (const prop of declaration.getProperties()) {
        // Skip static properties
        if (prop.getModifiers().some(mod => mod.getText() === 'static')) continue;

        const type = prop.isReadonly() ? 'val' : 'var';
        const propName = utils.findName(prop);
        if (propName.startsWith('__') || propName.startsWith('$')) continue; // Skip private properties (convention)

        let override = '';
        
        // Check parents for override
        const parent = declaration.getParent();
        if (parent instanceof ClassDeclaration || parent instanceof InterfaceDeclaration) {
            const parentMethods = parent.getProperties().filter(p => utils.findName(p) === propName);
            if (parentMethods.length > 0) override = 'override ';
        }

        const tsType = utils.findType(prop.getType());
        const jsDoc = utils.getJsDoc(prop, nl, indent);

        if (prop.getTypeNode() && prop.getTypeNode()!.getKind() === SyntaxKind.TypeQuery) {
            // Property is an inner type query
            continue;
        }

        const propType = utils.convertToKotlinType(tsType.getText());
        const isOptional = tsType.isNullable() ? '?' : '';

        output += `${jsDoc}${indent}${override}${type} ${propName}: ${propType}${isOptional}${nl}${nl}`;
    }

    return output;
}

const overrideMethods = [
    'toString',
    'equals',
    'hashCode'
]

function createMethods(declaration: ClassDeclaration | InterfaceDeclaration, config: TykonConfig): string {
    let output = "";
    const nl = config.newLine || '\n';
    const indent = config.tabs ? '\t'.repeat(config.tabs) : ' '.repeat(config.spaces || 4);

    const methodOutput: {
        method: string;
        returnSuffix: string;
    }[] = []

    for (const method of declaration.getMethods()) {
        // Skip static methods
        if (method instanceof ModifierableNode && (method as ModifierableNode).getModifiers().some(mod => mod.getText() === 'static')) continue;

        const methodName = utils.findName(method);
        if (methodName.startsWith('__') || methodName.startsWith('$')) continue; // Skip private methods (convention)
        if (methodName.startsWith('[') || methodName.endsWith(']')) continue; // Skip index signatures

        let override = overrideMethods.includes(methodName) && method.getParameters().length == 0 ? 'override ' : '';
        // Check parents for override
        const parent = declaration.getParent();
        if (parent instanceof ClassDeclaration || parent instanceof InterfaceDeclaration) {
            const parentMethods = parent.getMethods().filter(m => utils.findName(m) === methodName);
            if (parentMethods.length > 0) override = 'override ';
        }

        const returnType = utils.convertToKotlinType(utils.findType(method.getReturnType()).getText());
        const returnTypeSuffix = returnType === 'Unit' ? '' : `: ${returnType}`;

        const params = method.getParameters().map(param => {
            const paramName = utils.findName(param);
            const paramType = utils.convertToKotlinType(utils.findType(param.getType()).getText());
            const isOptional = param.isOptional() ? '? = definedExternally' : '';

            return `${paramName}: ${paramType}${isOptional}`;
        }).join(', ');

        const generics = method.getTypeParameters().length > 0
            ? `<${method.getTypeParameters().map(tp => tp.getName()).join(', ')}> `
            : '';
        const jsDoc = utils.getJsDoc(method, nl, indent);

        methodOutput.push({ method: `${jsDoc}${indent}${override}fun ${generics}${methodName}(${params})`, returnSuffix: `${returnTypeSuffix}${nl}${nl}`});
    }

    const byMethodName = methodOutput.map(m => m.method.replace('? = definedExternally', '').replace(/\*[\s\S]*?\*/g, '').trim());
    const declared: string[] = []

    for (const method of methodOutput) {
        // Check if method has multiple return types
        const methodName = method.method.replace('? = definedExternally', '').replace(/\*[\s\S]*?\*/g, '').trim()
        if (byMethodName.lastIndexOf(methodName) != byMethodName.indexOf(methodName)) {
            if (declared.includes(methodName)) continue; // Skip already declared dynamic methods
            output += `${method.method}: dynamic${nl}${nl}`;
            declared.push(methodName);
        } else {
            output += `${method.method}${method.returnSuffix}`;
        }
    }

    return output;
}

function createStaticProperties(declaration: ClassDeclaration, config: TykonConfig): string {
    let output = "";
    const nl = config.newLine || '\n';
    const indent = config.tabs ? '\t'.repeat(config.tabs) : ' '.repeat(config.spaces || 4);

    output += `${indent}companion object {${nl}`;

    for (const prop of declaration.getStaticProperties()) {
        const propName = utils.findName(prop);
        if (propName.startsWith('__') || propName.startsWith('$')) continue; // Skip private properties (convention)

        const tsType = utils.findType(prop.getType());
        const propType = utils.convertToKotlinType(tsType.getText());
        const isOptional = tsType.isNullable() ? '?' : '';
        const jsDoc = utils.getJsDoc(prop, nl, indent.repeat(2));

        output += `${jsDoc}${indent}${indent}val ${propName}: ${propType}${isOptional}${nl}${nl}`;
    }

    for (const method of declaration.getStaticMethods()) {
        const methodName = utils.findName(method);
        if (methodName.startsWith('__') || methodName.startsWith('$')) continue; // Skip private methods (convention)

        const returnType = utils.convertToKotlinType(utils.findType(method.getReturnType()).getText());
        const params = method.getParameters().map(param => {
            const paramName = utils.findName(param);
            const paramType = utils.convertToKotlinType(utils.findType(param.getType()).getText());
            const isOptional = param.isOptional() ? '? = definedExternally' : '';

            return `${paramName}: ${paramType}${isOptional}`;
        }).join(', ');
        const jsDoc = utils.getJsDoc(method, nl, indent.repeat(2));

        output += `${jsDoc}${indent}${indent}fun ${methodName}(${params}): ${returnType}${nl}${nl}`;
    }
    
    output += `${indent}}${nl}${nl}`;

    return output;
}

// Generator Functions

function generateVariable(statement: VariableStatement, declaration: VariableDeclaration, config: TykonConfig): string {
    if (statement.hasDeclareKeyword()) return ""; // Skip declared components

    let output = "";
    const nl = config.newLine || '\n';

    const name = utils.findName(declaration);
    if (name.startsWith('__') || name.startsWith('$')) return output; // Skip private variables (convention)

    const type = utils.convertToKotlinType(utils.findType(declaration.getType()).getText());
    if (type.startsWith('<') && type.endsWith('>')) return output; // Invalid type, skip

    output += `${utils.getJsDoc(statement, nl)}external val ${name}: ${type}${nl}`;

    return output;
}

function generateFunction(declaration: FunctionDeclaration, config: TykonConfig): string {
    if (declaration.hasDeclareKeyword()) return ""; // Skip declared components
    if (!declaration.isAmbient()) throw new Error("Only ambient functions are supported");

    let output = "";
    const nl = config.newLine || '\n';

    const name = utils.findName(declaration);
    if (name.startsWith('__') || name.startsWith('$')) return output; // Skip private functions (convention)

    const returnType = utils.convertToKotlinType(utils.findType(declaration.getReturnType()).getText());
    const returnTypeSuffix = returnType === 'Unit' ? '' : `: ${returnType}`;

    const params = declaration.getParameters().map(param => {
        const paramName = utils.findName(param);
        const paramType = utils.convertToKotlinType(utils.findType(param.getType()).getText());
        const isOptional = param.isOptional() ? '? = definedExternally' : '';

        return `${paramName}: ${paramType}${isOptional}`;
    }).join(', ');
    const generics = declaration.getTypeParameters().length > 0
        ? `<${declaration.getTypeParameters().map(tp => tp.getName()).join(', ')}> `
        : '';

    output += `${utils.getJsDoc(declaration, nl)}external fun ${generics}${name}(${params})${returnTypeSuffix}${nl}${nl}`;

    return output;
}

function generateClass(declaration: ClassDeclaration, config: TykonConfig): string {
    if (!declaration.isAmbient()) throw new Error("Only ambient classes are supported");

    let output = "";
    const nl = config.newLine || '\n';
    const indent = config.tabs ? '\t'.repeat(config.tabs) : ' '.repeat(config.spaces || 4);

    const name = utils.findName(declaration);
    const modifiers = declaration.isAbstract() ? 'abstract ' : 'open ';

    // Handle class type parameters
    const typeParams = declaration.getTypeParameters();
    let generics = "";
    let constraints: string[] = [];

    if (typeParams.length > 0) {
        generics = `<${typeParams.map(tp => tp.getName()).join(', ')}>`;
        for (const tp of typeParams) {
            const constraint = tp.getConstraint();
            const type = constraint ? utils.convertToKotlinType(constraint.getText(), false, true) : 'Any';

            if (constraint) {
                if (type === 'Any' || type === 'dynamic' || type === 'Unit') continue;
                constraints.push(`${tp.getName()} : ${type} /* ${constraint.getText()} */`);
            }
        }
    }

    // Handle class inheritance
    let parent = declaration.getExtends()?.getText() || "";
    if (parent.includes('<') && parent.includes('>')) {
        // Convert passed type parameters to Kotlin generics
        const parentType = utils.findType(declaration.getExtends()!.getType());
        if (parentType.isObject() && parentType.getTypeArguments().length > 0) {
            const typeArgs = parentType.getTypeArguments()
                .filter(arg => arg.getText() !== 'this')
                .map(arg => utils.convertToKotlinType(arg.getText(), false, true)).join(', ');
            parent = `${parent.split('<')[0]}<${typeArgs}>`;
        } else {
            parent = parent.split('<')[0]; // Remove type parameters if not applicable
        }
    }
    const approved = parent && parent !== 'Error' && parent !== 'dynamic'
    const parent0 = parent && approved ? ` : ${parent}` : '';

    // Implement where clause for type parameters
    let whereClause = "";
    if (constraints.length > 0) {
        whereClause = ` where ${constraints.join(', ')}`;
    }

    output += `${utils.getJsDoc(declaration, nl)}${modifiers}external class ${name}${generics}${parent0}${whereClause} {${nl}`;

    // Add class constructors
    for (const constructor of declaration.getConstructors()) {
        const params = constructor.getParameters().map(param => {
            const paramName = param.getName();
            const tsType = utils.findType(param.getType());
            const paramType = utils.convertToKotlinType(tsType.getText());
            const isOptional = tsType.isNullable() ? '? = definedExternally' : '';

            return `${paramName}: ${paramType}${isOptional}`;
        }).join(', ');

        const jsDoc = utils.getJsDoc(constructor, nl, indent);
        output += `${jsDoc}${indent}constructor(${params})${nl}${nl}`;
    }
    
    // Add class properties
    output += createProperties(declaration, config);

    // Add the class methods
    output += createMethods(declaration, config);
    
    // Add static properties and methods
    if (declaration.getStaticProperties().length > 0 || declaration.getStaticMethods().length > 0) {
        output += createStaticProperties(declaration, config);
    }

    output += '}' + nl;

    return output;
}

function generateInterface(declaration: InterfaceDeclaration, config: TykonConfig): string {
    if (!declaration.isAmbient()) throw new Error("Only ambient interfaces are supported");

    let output = "";
    const nl = config.newLine || '\n';

    // Handle interface type parameters
    const typeParams = declaration.getTypeParameters();
    let generics = "";
    let constraints: string[] = [];

    if (typeParams.length > 0) {
        generics = `<${typeParams.map(tp => tp.getName()).join(', ')}>`;
        for (const tp of typeParams) {
            const constraint = tp.getConstraint();
            const type = constraint ? utils.convertToKotlinType(constraint.getText()) : 'Any';

            if (constraint) {
                if (type.startsWith('Any') || type.startsWith('dynamic') || type === 'Unit') continue;
                constraints.push(`${tp.getName()} : ${type} /* ${constraint.getText()} */`);
            }
        }
    }

    // Handle interface inheritance
    const parents = declaration.getExtends().filter(p => {
        const type = p.getType().getSymbol();
        if (!type) return false; // Skip if no type symbol found

        const name = type.getName();
        if (name.startsWith('__')) return false; // Skip private interfaces (convention)
        if (name === 'Error') return false;

        return type && type.getDeclarations().filter(d => Node.isInterfaceDeclaration(d)).length == type.getDeclarations().length;
    });
    const parent0 = parents.length > 0 ? ` : ${parents.map(p => p.getText()).join(', ')}` : '';

    // Implement where clause for type parameters
    let whereClause = "";
    if (constraints.length > 0) {
        whereClause = ` where ${constraints.join(', ')}`;
    }

    output += `${utils.getJsDoc(declaration, nl)}external interface ${utils.findName(declaration)}${generics}${parent0}${whereClause} {${nl}`;
    
    // Add interface properties
    output += createProperties(declaration, config);

    // Add interface methods
    output += createMethods(declaration, config);
    
    output += '}' + nl;

    return output;
}

const typeAliases: string[] = []

function generateTypeAlias(declaration: TypeAliasDeclaration, config: TykonConfig): string {
    if (!declaration.isAmbient()) throw new Error("Only ambient type aliases are supported");

    const nl = config.newLine || '\n';
    const indent = config.tabs ? '\t'.repeat(config.tabs) : ' '.repeat(config.spaces || 4);

    const name = utils.findName(declaration);
    if (name.startsWith('__')) return ""; // Skip private type aliases (convention)

    const type = utils.findType(declaration.getType());
    const typeText = type.getText();
    const typeParams = declaration.getTypeParameters();
    
    const generics = typeParams.length > 0 ? `<${typeParams.map(tp => tp.getName()).join(', ')}>` : '';

    const doc = utils.getJsDoc(declaration, nl);

    // If it's a union or something not object-like, fallback to typealias with Any
    if (!type.isObject() || type.isUnion()) {
        typeAliases.push(`${doc}typealias ${name}${generics} = ${utils.convertToKotlinType(typeText, true, true)}${nl}${nl}`);
        return ""; // Skip object type alias generation because of external file
    }

    // Not an object type, return as typealias
    if (!type.isObject()) {
        typeAliases.push(`${doc}typealias ${name}${generics} = ${typeText}${nl}${nl}`);
        return ""; // Skip object type alias generation because of external file
    }

    // If it's an array, use typealias
    if (type.isArray()) {
        const arrayType = type.getArrayElementType();
        typeAliases.push(`${doc}typealias ${name}${generics} = Array<${utils.convertToKotlinType(arrayType?.getText() ?? "Any", true, true)}>${nl}${nl}`);
        return ""; // Skip object type alias generation because of external file
    }

    const properties = type.getProperties();

    // Convert to Kotlin interface
    let output = `${doc}external interface ${name}${generics} {${nl}`;
    for (const prop of properties) {
        const declarations = prop.getDeclarations();
        const propDecl = declarations[0];
        if (!Node.isPropertySignature(propDecl)) continue;

        const propName = utils.findName(propDecl);
        if (propName.startsWith('__') || propName.startsWith('$')) continue; // Skip private properties (convention)

        const propType = utils.findType(propDecl.getType()).getText();
        const isOptional = propDecl.hasQuestionToken();
        const kotlinType = utils.convertToKotlinType(propType);
        const propDoc = utils.getJsDoc(propDecl, nl, indent);

        output += `${propDoc}${indent}var ${propName}: ${kotlinType}${isOptional ? "?" : ""}${nl}`;
    }
    output += `}${nl}${nl}`;
    
    // Add Creator Method
    typeAliases.push(`fun ${generics ? generics + ' ' : ''}${name}(): ${name}${generics} = js("{}")${nl}${nl}`);
    return output;
}


// Main Export Function

function tykon(config: TykonConfig, source: StatementedNode): string {
    let output = "";
    const nl = config.newLine || '\n';

    // Add the package name to the output
    output += `package ${config.package}${nl}${nl}`;

    // Add the imports to the output
    if (config.imports && config.imports.length > 0) {
        for (const imp of config.imports) {
            const imp0 = imp.trim();
            if (!imp0) continue; // Skip empty imports
            output += `import ${imp0}${nl}`;
        }
        output += "\n";
    }

    // variables
    for (const variable of source.getVariableStatements()) {
        for (const decl of variable.getDeclarations()) {
            output += generateVariable(variable, decl, config) + nl;
        }
    }

    // functions
    for (const func of source.getFunctions().filter(f => f.isAmbient())) {
        output += generateFunction(func, config);
    }

    // classes
    for (const clazz of source.getClasses().filter(c => c.isAmbient())) {
        output += generateClass(clazz, config);
    }

    // interfaces
    for (const iface of source.getInterfaces().filter(i => i.isAmbient())) {
        output += generateInterface(iface, config);
    }

    // types
    for (const typeAlias of source.getTypeAliases().filter(t => t.isAmbient())) {
        output += generateTypeAlias(typeAlias, config);
    }

    return output;
}

function tykonFromModule(config: TykonConfig, module: ModuleDeclaration): string {
    let output = "";

    if (!config.imports) {
        config.imports = config.imports || [];
        config.imports.push('kotlin.js.*');
    }

    let moduleName = module.getName();
    if (moduleName.startsWith('"') && moduleName.endsWith('"')) {
        moduleName = moduleName.slice(1, -1);
    }

    output += `// Module: ${moduleName}${config.newLine || '\n'}`;
    output += `@file:JsModule("${moduleName}")${config.newLine || '\n'}`;
    output += tykon(config, module);

    return output;
}

function getValidFileName(moduleName: string): string {
    // Remove quotes if present
    if (moduleName.startsWith('"') && moduleName.endsWith('"')) {
        moduleName = moduleName.slice(1, -1);
    }

    // Lowercase, replace ':' with '-', remove invalid chars, trim trailing '-'
    let fileName = moduleName
        .toLowerCase()
        .replace(/:/g, '-')
        .replace(/[^a-z0-9_-]/g, '')
        .replace(/-+$/, '');
    
    return fileName;
}

function generateStatement(statement: Node, config: TykonConfig): string {
    let output = "";
    const nl = config.newLine || '\n';

    if (Node.isVariableStatement(statement)) {
        for (const decl of statement.getDeclarations()) {
            output += generateVariable(statement, decl, config) + nl;
        }
    }
    else if (Node.isFunctionDeclaration(statement))
        output += generateFunction(statement, config) + nl;
    else if (Node.isClassDeclaration(statement))
        output += generateClass(statement, config) + nl;
    else if (Node.isInterfaceDeclaration(statement))
        output += generateInterface(statement, config) + nl;
    else if (Node.isTypeAliasDeclaration(statement))
        output += generateTypeAlias(statement, config) + nl;

    return output;
}

/**
 * Generates Kotlin code from a TypeScript source file.
 * @param config The configuration for Tykon.
 * @param sourceFile The TypeScript source file to convert.
 * @returns The generated Kotlin code as a map of file names to code strings.
 */
export function tykonFromSource(config: TykonConfig, sourceFile: SourceFile): Map<string, string> {
    let outputs = new Map<string, string>();
    const nl = config.newLine || '\n';

    const rootModule = config.module || sourceFile.getFilePath().replace(/\.d\.ts$/, '').replace(/.*\//, '');
    const baseName = sourceFile.getBaseName();
    const modules = sourceFile.getModules();

    if (!config.imports) {
        config.imports = config.imports || [];
        config.imports.push('kotlin.js.*');
    }

    if (modules.length > 0) {
        for (const module of modules) {
            const moduleName = module.getName();
            let output = `// Generated by Tykon from ${baseName}${nl}`;

            output += tykonFromModule(config, module);
            outputs.set(`${getValidFileName(moduleName)}.d.kt`, output);
        }

        const topLevelStatements = sourceFile.getStatements().filter(s => !Node.isModuleDeclaration(s));
        if (topLevelStatements.length > 0) {
            let output = `// Generated by Tykon from ${baseName}${nl}${nl}`;

            output += `@file:JsModule("${rootModule}")${nl}`;
            output += `@file:JsNonModule${nl}${nl}`;
            output += `package ${config.package}${nl}${nl}`;

            for (const imp of config.imports) {
                const imp0 = imp.trim();
                if (!imp0) continue; // Skip empty imports
                output += `import ${imp0}${nl}`;
            }

            for (const statement of topLevelStatements) {
                output += generateStatement(statement, config);
            }

            outputs.set(`${getValidFileName(sourceFile.getBaseNameWithoutExtension())}.d.kt`, output);
        }
    } else {
        let output = `// Generated by Tykon from ${baseName}${nl}${nl}`;

        output += `@file:JsModule("${rootModule}")${nl}${nl}`;
        output += tykon(config, sourceFile);
        outputs.set(`${getValidFileName(sourceFile.getBaseNameWithoutExtension())}.d.kt`, output);
    }

    const typeAliasOutput = typeAliases.join('');
    if (typeAliasOutput) {
        let output = `// Type Aliases from ${baseName}${nl}${nl}`;
        output += `package ${config.package}${nl}${nl}`;
        output += typeAliasOutput;
        outputs.set(`${getValidFileName(sourceFile.getBaseNameWithoutExtension())}.types.d.kt`, output);
        typeAliases.length = 0; // Clear type aliases after processing
    }

    return outputs;
}