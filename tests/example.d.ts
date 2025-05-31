/**
 * An example type that can be either a string or a boolean.
 */
export type ExampleType = string | boolean

/**
 * An example type that represents an object with various properties.
 */
export type ExampleType2 = {
    /**
     * A string property of ExampleType2.
     * @example "example string"
     */
    a: string;
    /**
     * A number property of ExampleType2.
     * @example 42
     */
    b: number;
    /**
     * A boolean property of ExampleType2.
     * @example true
     */
    c: boolean;
}

/**
 * An example class with various methods and properties.
 * @example
 * const example = new ExampleClass("example");
 * example.method1(42, "test");
 */
export class ExampleClass {
    /**
     * A string property of the ExampleClass.
     */
    a: string;

    /**
     * A number property of the ExampleClass.
     * @example 42
     */
    b: number;

    /**
     * A boolean property of the ExampleClass.
     * @example true
     */
    c: boolean;

    /**
     * An array of numbers property of the ExampleClass.
     * @example [1, 2, 3]
     */
    d: number[];

    /**
     * A static string property of the ExampleClass.
     * @example "static example"
     * @static
     */
    static e: string;

    /**
     * A read-only number property of the ExampleClass.
     * @example 100
     */
    readonly f: number;

    /**
     * A static readonly two-dimensional array of strings property of the ExampleClass.
     * @example [["a", "b"], ["c", "d"]]
     * @deprecated This property is deprecated and will be removed in future versions.
     */
    static readonly g: string[][];

    /**
     * An example constructor for the ExampleClass.
     * @param a A string parameter for the constructor.
     */
    constructor(a: string)

    /**
     * A method that takes two parameters and returns a boolean.
     * @param param1 A number parameter for the method.
     * @param param2 A string parameter for the method.
     * @returns A boolean value indicating the result of the method.
     */
    method1(param1: number, param2: string): boolean

    /**
     * A method that takes a string parameter and returns void.
     * @param param1 A string parameter for the method.
     */
    method2(param1: string): void

    /**
     * A method that takes a record parameter and returns void.
     * @param param1 A record parameter for the method.
     */
    method3(param1: Record<string, any>, param2: Record<number, any>[]): void

    /**
     * A method that returns a promise that resolves to a string.
     * @returns A promise that resolves to a string.
     */
    method4(): Promise<string>

    /**
     * A static method that takes two parameters and returns a boolean.
     * @param param1 A string parameter for the static method.
     * @param param2 A number parameter for the static method.
     */
    static method5(param1: string, param2: number): boolean;
}

/**
 * An example interface with various properties.
 * @abstract
 */
export interface ExampleInterface {
    /**
     * A string property of the ExampleInterface.
     * @example "example string"
     */
    a: string;
    /**
     * A number property of the ExampleInterface.
     * @example 42
     */
    b: number;
    /**
     * A boolean property of the ExampleInterface.
     * @example true
     */
    c: boolean;
}

/**
 * An example variable of type string.
 */
export const exampleVariable: string;

/**
 * An example function that takes two parameters and returns a boolean.
 * @param param1 A number parameter for the function.
 * @param param2 A string parameter for the function.
 * @returns A boolean value indicating the result of the function.
 */
export const exampleFunction: (param1: number, param2: string) => boolean;

/**
 * An example function that takes a string parameter and returns void.
 * @param param1 A string parameter for the function.
 */
export function exampleFunction2(param1: string): void;

/**
 * An example function that takes a three-dimensional array of strings and a one-dimensional array of numbers, and returns bigint.
 * @param param1 A three-dimensional array of strings.
 * @param param2 A one-dimensional array of numbers.
 * @returns bigint
 */
export function exampleFunction3(param1: string[][][], param2: number[]): bigint;