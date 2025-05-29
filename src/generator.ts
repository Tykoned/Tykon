import { ClassDeclaration, FunctionDeclaration, InterfaceDeclaration, SourceFile, TypeAliasDeclaration, VariableDeclaration, VariableStatement } from "ts-morph";
import { TykonConfig } from "./config";
import * as utils from "./utils";

// Generator Utilities

function createProperties(declaration: ClassDeclaration | InterfaceDeclaration, config: TykonConfig): string {
    let output = "";
    const nl = config.newLine || '\n';
    const indent = config.tabs ? '\t'.repeat(config.tabs) : ' '.repeat(config.spaces || 4);

    for (const prop of declaration.getProperties()) {
        const type = prop.isReadonly() ? 'val' : 'var';
        const propName = prop.getName();
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
        const methodName = method.getName();
        const returnType = utils.convertToKotlinType(method.getReturnType().getText());
        const params = method.getParameters().map(param => {
            const paramName = param.getName();
            const paramType = utils.convertToKotlinType(param.getType().getText());
            return `${paramName}: ${paramType}`;
        }).join(', ');
        const jsDoc = utils.getJsDoc(method, nl, indent);

        output += `${jsDoc}${indent}fun ${methodName}(${params}): ${returnType}${nl}${nl}`;
    }

    return output;
}

// Generator Functions

function generateVariable(statement: VariableStatement, declaration: VariableDeclaration, config: TykonConfig): string {
    let output = "";
    const nl = config.newLine || '\n';
    const indent = config.tabs ? '\t'.repeat(config.tabs) : ' '.repeat(config.spaces || 4);

    const name = declaration.getName() || utils.findName(declaration);
    const type = utils.convertToKotlinType(declaration.getType().getText());

    output += `${utils.getJsDoc(statement, nl)}external val ${name}: ${type}${nl}`;

    return output;
}

function generateFunction(declaration: FunctionDeclaration, config: TykonConfig): string {
    if (!declaration.isAmbient()) throw new Error("Only ambient functions are supported");

    let output = "";
    const nl = config.newLine || '\n';

    const name = declaration.getName() || utils.findName(declaration);
    const returnType = utils.convertToKotlinType(declaration.getReturnType().getText());
    const params = declaration.getParameters().map(param => {
        const paramName = param.getName();
        const paramType = utils.convertToKotlinType(param.getType().getText());
        return `${paramName}: ${paramType}`;
    }).join(', ');

    output += `${utils.getJsDoc(declaration, nl)}external fun ${name}(${params}): ${returnType}${nl}${nl}`;

    return output;
}

function generateClass(declaration: ClassDeclaration, config: TykonConfig): string {
    if (!declaration.isAmbient()) throw new Error("Only ambient classes are supported");

    let output = "";
    const nl = config.newLine || '\n';
    const indent = config.tabs ? '\t'.repeat(config.tabs) : ' '.repeat(config.spaces || 4);

    const name = utils.findName(declaration);
    const modifiers = declaration.isAbstract() ? 'abstract ' : '';
    const parent = declaration.getExtends()?.getText() || "";
    const parent0 = parent ? ` : ${parent}` : '';

    output += `${utils.getJsDoc(declaration, nl)}external ${modifiers}class ${name}${parent0} {${nl}`;

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

    output += '}' + nl;

    return output;
}

function generateInterface(declaration: InterfaceDeclaration, config: TykonConfig): string {
    if (!declaration.isAmbient()) throw new Error("Only ambient interfaces are supported");

    let output = "";
    const nl = config.newLine || '\n';

    output += `${utils.getJsDoc(declaration, nl)}external interface ${utils.findName(declaration)} {${nl}`;
    
    // Add interface properties
    output += createProperties(declaration, config);

    // Add interface methods
    output += createMethods(declaration, config);
    
    output += '}' + nl;

    return output;
}

// Main Export Function

export function tykon(config: TykonConfig, source: SourceFile): string {
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

    // export variables
    for (const variable of source.getVariableStatements().filter(v => v.isExported())) {
        for (const decl of variable.getDeclarations()) {
            output += generateVariable(variable, decl, config) + nl;
        }
    }

    // functions
    for (const func of source.getFunctions().filter(f => f.isExported() && f.isAmbient())) {
        output += generateFunction(func, config) + nl;
    }

    // classes
    for (const clazz of source.getClasses().filter(c => c.isExported() && c.isAmbient())) {
        output += generateClass(clazz, config) + nl;
    }

    // interfaces
    for (const iface of source.getInterfaces().filter(i => i.isExported() && i.isAmbient())) {
        output += generateInterface(iface, config) + nl;
    }

    return output;
}