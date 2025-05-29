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