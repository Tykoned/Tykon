import { ClassDeclaration, FunctionDeclaration, InterfaceDeclaration, ModifierableNode, ModuleDeclaration, Node, SourceFile, StatementedNode, TypeAliasDeclaration, VariableDeclaration, VariableStatement } from "ts-morph";
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
        let propName = utils.findName(prop);
        if (propName.startsWith('__')) continue; // Skip private properties (convention)

        const propType = utils.convertToKotlinType(prop.getType().getText());
        const isOptional = prop.getType().isNullable() ? '?' : '';
        const jsDoc = utils.getJsDoc(prop, nl, indent);

        output += `${jsDoc}${indent}${type} ${propName}${isOptional}: ${propType}${nl}${nl}`;
    }

    return output;
}

function createMethods(declaration: ClassDeclaration | InterfaceDeclaration, config: TykonConfig): string {
    let output = "";
    const nl = config.newLine || '\n';
    const indent = config.tabs ? '\t'.repeat(config.tabs) : ' '.repeat(config.spaces || 4);
    for (const method of declaration.getMethods()) {
        // Skip static methods
        if (method instanceof ModifierableNode && (method as ModifierableNode).getModifiers().some(mod => mod.getText() === 'static')) continue;

        const methodName = utils.findName(method);
        if (methodName.startsWith('__')) continue; // Skip private methods (convention)

        const returnType = utils.convertToKotlinType(method.getReturnType().getText());
        const params = method.getParameters().map(param => {
            const paramName = utils.findName(param);
            const paramType = utils.convertToKotlinType(param.getType().getText());
            const isOptional = param.isOptional() ? '?' : '';
            return `${paramName}: ${paramType}${isOptional}`;
        }).join(', ');

        const generics = method.getTypeParameters().length > 0
            ? `<${method.getTypeParameters().map(tp => tp.getName()).join(', ')}> `
            : '';
        const jsDoc = utils.getJsDoc(method, nl, indent);

        output += `${jsDoc}${indent}fun ${generics}${methodName}(${params}): ${returnType}${nl}${nl}`;
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
        if (propName.startsWith('__')) continue; // Skip private properties (convention)

        const propType = utils.convertToKotlinType(prop.getType().getText());
        const isOptional = prop.getType().isNullable() ? '?' : '';
        const jsDoc = utils.getJsDoc(prop, nl, indent.repeat(2));

        output += `${jsDoc}${indent}${indent}val ${propName}${isOptional}: ${propType}${nl}${nl}`;
    }

    for (const method of declaration.getStaticMethods()) {
        const methodName = utils.findName(method);
        if (methodName.startsWith('__')) continue; // Skip private methods (convention)

        const returnType = utils.convertToKotlinType(method.getReturnType().getText());
        const params = method.getParameters().map(param => {
            const paramName = param.getName();
            const paramType = utils.convertToKotlinType(param.getType().getText());
            return `${paramName}: ${paramType}`;
        }).join(', ');
        const jsDoc = utils.getJsDoc(method, nl, indent.repeat(2));

        output += `${jsDoc}${indent}${indent}fun ${methodName}(${params}): ${returnType}${nl}${nl}`;
    }
    
    output += `${indent}}${nl}${nl}`;

    return output;
}

// Generator Functions

function generateVariable(statement: VariableStatement, declaration: VariableDeclaration, config: TykonConfig): string {
    let output = "";
    const nl = config.newLine || '\n';

    const name = utils.findName(declaration);
    if (name.startsWith('__')) return output; // Skip private variables (convention)

    const type = utils.convertToKotlinType(declaration.getType().getText());

    output += `${utils.getJsDoc(statement, nl)}external val ${name}: ${type}${nl}`;

    return output;
}

function generateFunction(declaration: FunctionDeclaration, config: TykonConfig): string {
    if (!declaration.isAmbient()) throw new Error("Only ambient functions are supported");

    let output = "";
    const nl = config.newLine || '\n';

    const name = utils.findName(declaration);
    if (name.startsWith('__')) return output; // Skip private functions (convention)

    const returnType = utils.convertToKotlinType(declaration.getReturnType().getText());
    const params = declaration.getParameters().map(param => {
        const paramName = param.getName();
        const paramType = utils.convertToKotlinType(param.getType().getText());
        return `${paramName}: ${paramType}`;
    }).join(', ');
    const generics = declaration.getTypeParameters().length > 0
        ? `<${declaration.getTypeParameters().map(tp => tp.getName()).join(', ')}> `
        : '';

    output += `${utils.getJsDoc(declaration, nl)}external fun ${generics}${name}(${params}): ${returnType}${nl}${nl}`;

    return output;
}

function generateClass(declaration: ClassDeclaration, config: TykonConfig): string {
    if (!declaration.isAmbient()) throw new Error("Only ambient classes are supported");

    let output = "";
    const nl = config.newLine || '\n';
    const indent = config.tabs ? '\t'.repeat(config.tabs) : ' '.repeat(config.spaces || 4);

    const name = utils.findName(declaration);
    const modifiers = declaration.isAbstract() ? 'abstract ' : '';

    // Handle class type parameters
    const typeParams = declaration.getTypeParameters();
    let generics = "";
    let constraints: string[] = [];

    if (typeParams.length > 0) {
        generics = `<${typeParams.map(tp => tp.getName()).join(', ')}>`;
        for (const tp of typeParams) {
            const constraint = tp.getConstraint();
            const type = constraint ? utils.convertToKotlinType(constraint.getText()) : 'Any';
            if (constraint) {
                constraints.push(`${tp.getName()} : ${type}`);
            }
        }
    }

    // Handle class inheritance
    const parent = declaration.getExtends()?.getText() || "";
    const parent0 = parent ? ` : ${parent}` : '';

    // Implement where clause for type parameters
    let whereClause = "";
    if (constraints.length > 0) {
        whereClause = ` where ${constraints.join(', ')}`;
    }

    output += `${utils.getJsDoc(declaration, nl)}external ${modifiers}class ${name}${generics}${parent0}${whereClause} {${nl}`;

    // Add class constructors
    for (const constructor of declaration.getConstructors()) {
        const params = constructor.getParameters().map(param => {
            const paramName = param.getName();
            const paramType = utils.convertToKotlinType(param.getType().getText());
            const isOptional = param.getType().isNullable() ? '?' : '';
            return `${paramName}${isOptional}: ${paramType}`;
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
                constraints.push(`${tp.getName()} : ${type}`);
            }
        }
    }

    // Handle interface inheritance
    const parents = declaration.getExtends();
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

function generateTypeAlias(declaration: TypeAliasDeclaration, config: TykonConfig): string {
    if (!declaration.isAmbient()) throw new Error("Only ambient type aliases are supported");

    const nl = config.newLine || '\n';
    const indent = config.tabs ? '\t'.repeat(config.tabs) : ' '.repeat(config.spaces || 4);

    const name = declaration.getName();
    const type = declaration.getType();
    const typeText = type.getText();
    const typeParams = declaration.getTypeParameters();
    const generics = typeParams.length > 0 ? `<${typeParams.map(tp => tp.getName()).join(', ')}>` : '';

    const doc = utils.getJsDoc(declaration, nl);

    // If it's a union or something not object-like, fallback to typealias with Any
    if (!type.isObject() || type.isUnion()) {
        return `${doc}typealias ${name}${generics} = dynamic /* ${typeText} */${nl}${nl}`;
    }

    const properties = type.getProperties();

    // Convert to Kotlin interface
    let output = `${doc}external interface ${name}${generics} {${nl}`;
    for (const prop of properties) {
        const declarations = prop.getDeclarations();
        const propDecl = declarations[0];
        if (!Node.isPropertySignature(propDecl)) continue;

        const propName = prop.getName();
        if (propName.startsWith('__')) continue; // Skip private properties (convention)

        const propType = propDecl.getType().getText();
        const isOptional = propDecl.hasQuestionToken();
        const kotlinType = utils.convertToKotlinType(propType);
        const propDoc = utils.getJsDoc(propDecl, nl, indent);

        output += `${propDoc}${indent}var ${propName}: ${kotlinType}${isOptional ? "?" : ""}${nl}`;
    }

    output += `}${nl}${nl}`;
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
            output += `import ${imp}${nl}`;
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
        output += generateFunction(func, config) + nl;
    }

    // classes
    for (const clazz of source.getClasses().filter(c => c.isAmbient())) {
        output += generateClass(clazz, config) + nl;
    }

    // interfaces
    for (const iface of source.getInterfaces().filter(i => i.isAmbient())) {
        output += generateInterface(iface, config) + nl;
    }

    // types
    for (const typeAlias of source.getTypeAliases().filter(t => t.isAmbient())) {
        output += generateTypeAlias(typeAlias, config) + nl;
    }

    return output;
}

/**
 * Generates Kotlin code from a TypeScript module declaration.
 * @param config The configuration for Tykon.
 * @param module The TypeScript module declaration to convert.
 * @returns The generated Kotlin code as a string.
 */
export function tykonFromModule(config: TykonConfig, module: ModuleDeclaration): string {
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

    utils.currentConstants.clear(); // Clear constants after each module to avoid conflicts
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

            for (const statement of topLevelStatements) {
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
            }

            outputs.set(`${getValidFileName(sourceFile.getBaseNameWithoutExtension())}.d.kt`, output);
        }
    } else {
        let output = `// Generated by Tykon from ${baseName}${nl}${nl}`;

        config.imports = config.imports || [];
        config.imports.push('kotlin.js.*');

        output += `@file:JsModule("${rootModule}")${nl}${nl}`;
        output += tykon(config, sourceFile);
        outputs.set(`${getValidFileName(sourceFile.getBaseNameWithoutExtension())}.d.kt`, output);
    }

    return outputs;
}