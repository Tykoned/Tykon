export type TykonConfig = {
	/**
	 * The module name for the generated code. Defaults to the name of the current directory.
	 * @example `is-sorted`
	 */
	module?: string;
	/**
	 * The newline string to use in the generated code.
	 * Defaults to `\n`.
	 */
	newLine?: string;
	/**
	 * The package name for the generated code.
	 */
	package: string;
	/**
	 * The number of spaces to use for indentation in the generated code.
	 * Defaults to `4`.
	 */
	spaces?: number;
	/**
	 * The number of tabs to use for indentation in the generated code.
	 * Defaults to `0`.
	 */
	tabs?: number;
	/**
	 * A list of imports to include in the generated code.
	 * @example
	 * ```ts
	 * imports: [
	 *  "com.example.MyClass",
	 *  "com.example.MyOtherClass",
	 *  "com.example.functions.myFunction"
	 * ]
	 */
	imports?: string[];
};
