<div align="center">
  <h1>🚀 Tykon</h1>
  <p><strong>Transform TypeScript declarations into beautiful Kotlin/JS externals</strong></p>
  
  [![npm version](https://img.shields.io/npm/v/tykon)](https://www.npmjs.com/package/@tykoned/tykon)
  [![License](https://img.shields.io/github/license/Tykoned/Tykon)](LICENSE)
</div>

---

## ✨ What is Tykon?

Tykon is a powerful code generation tool that **automatically converts TypeScript declaration files (\*.d.ts) into fully-functional Kotlin/JS external declarations**. Say goodbye to manually writing Kotlin externals for your favorite JavaScript libraries!

🎯 **Perfect for**: Kotlin Multiplatform developers who want to use JavaScript libraries with type safety  
⚡ **Lightning fast**: Processes entire npm packages in seconds  
🏗️ **Production ready**: Generates complete Gradle projects with publishing support

### 🌟 Key Benefits

- **🔄 Seamless Integration**: Drop-in Kotlin externals for any JavaScript library
- **📝 Type Safety**: Preserve TypeScript's type information in Kotlin
- **🚀 Zero Setup**: Complete Gradle projects generated automatically
- **📚 Documentation**: JSDoc comments converted to KDoc
- **🔧 Smart Merging**: Handles complex TypeScript patterns intelligently

---

## 🏁 Quick Start

### Prerequisites

- **Node.js** 16+ (LTS recommended)
- **Java** 11+
- **Gradle** (wrapper included in generated projects)

### 🎮 Basic Usage

Transform your first TypeScript library in under 2 minutes:

```typescript
// example.ts
import { Project } from 'ts-morph';
import { generateKotlinProject } from 'tykon';

// 🔍 Load TypeScript declarations
const project = new Project({
	skipAddingFilesFromTsConfig: true,
	compilerOptions: { allowJs: false, declaration: true }
});

// Add any .d.ts file (from node_modules, local files, etc.)
project.addSourceFileAtPath('node_modules/lodash/index.d.ts');
project.addSourceFileAtPath('node_modules/@types/node/index.d.ts');

// ✨ Generate complete Kotlin project
generateKotlinProject(
	project,
	'com.mycompany.externals', // Your package structure
	'Kotlin externals for Lodash and Node.js', // Project description
	'lodash', // npm package name
	'4.17.21', // npm version
	'2.2.0', // Kotlin version (optional)
	'lodash-kotlin', // output directory (optional)
	[
		// 📦 Additional dependencies
		'npm("lodash", "4.17.21")',
		'"org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0"'
	],
	[
		// 📥 Kotlin imports for generated files
		'kotlin.js.*',
		'kotlinx.coroutines.*'
	],
	{
		// ⚙️ Custom Gradle properties
		'org.gradle.parallel': 'true',
		'kotlin.js.compiler': 'ir'
	}
);

console.log('🎉 Your Kotlin project is ready!');
```

### 🏗️ What Gets Generated

```
my-awesome-project/
├── 📄 build.gradle.kts           # Complete Kotlin Multiplatform setup
├── 📄 settings.gradle.kts        # Project configuration
├── 📄 gradle.properties          # Optimized build settings
├── 📁 gradle/wrapper/           # Gradle wrapper (ready to build!)
└── 📁 src/jsMain/kotlin/
    └── 📁 com/mycompany/externals/
        ├── 📄 lodash.d.kt        # Your generated externals
        ├── 📄 utils.d.kt         # Organized by module
        └── 📄 types.d.kt         # Type aliases & creators
```

### 🚀 Build & Use

```bash
cd my-awesome-project

# Build your Kotlin library
./gradlew build

# Publish to Maven repository (if configured)
./gradlew publish

# Generate documentation with Dokka
./gradlew dokkaGeneratePublicationHtml
```

---

## 🔧 API Reference

### Core Functions

#### `tykonFromSource(config, sourceFile)`

Converts a single TypeScript source file to Kotlin externals.

```typescript
const kotlinFiles = tykonFromSource(
	{
		package: 'com.example.mylib',
		module: 'my-awesome-lib',
		spaces: 2,
		imports: ['kotlin.js.*']
	},
	sourceFile
);

// Returns: Map<string, string> (filename -> content)
```

#### `generateKotlinProject(...)`

Creates a complete, buildable Kotlin Multiplatform project.

| Parameter           | Type                    | Description                                  |
| ------------------- | ----------------------- | -------------------------------------------- |
| `project`           | `Project`               | ts-morph project with loaded .d.ts files     |
| `groupId`           | `string`                | Maven group ID (e.g., `com.mycompany`)       |
| `description`       | `string`                | Human-readable project description           |
| `npmPackageName`    | `string`                | NPM package name (supports scoped packages)  |
| `npmPackageVersion` | `string`                | NPM package version                          |
| `kotlinVersion?`    | `string`                | Kotlin version (default: `2.2.0`)            |
| `outputDir?`        | `string`                | Output directory (default: npm package name) |
| `dependencies?`     | `string[]`              | Additional Gradle dependencies               |
| `imports?`          | `string[]`              | Kotlin imports for generated files           |
| `gradleProperties?` | `Record<string,string>` | Custom Gradle properties                     |

---

## 🔄 Type Conversion Magic

Tykon intelligently converts TypeScript types to their Kotlin equivalents:

### 🎯 Primitives & Built-ins

```typescript
// TypeScript → Kotlin
string          → String
number          → Double
boolean         → Boolean
bigint          → Long
any | unknown   → Any
void | undefined → Unit
never           → Nothing
```

### 📚 Arrays & Collections

```typescript
string[]               → Array<String>
Uint8Array            → ByteArray
Map<string, number>   → Map<String, Double>
Set<boolean>          → Set<Boolean>
```

### 🔗 Functions & Lambdas

```typescript
// TypeScript
(name: string, age: number) => boolean

// Kotlin
(String, Double) -> Boolean
```

### 🎭 Unions & Nullability

```typescript
string | undefined    → String?
string | null        → String?
string | number      → dynamic /* string | number */
```

### 🏗️ Interfaces & Classes

```typescript
// TypeScript
interface User {
  readonly id: string;
  name: string;
  email?: string;
}

// Generated Kotlin
external interface User {
  val id: String
  var name: String
  var email: String?
}

// Bonus: Creator function included!
fun User(apply: User.() -> Unit = {}): User = js("{}").apply(apply)
```

### 🧩 Advanced Patterns

**Intersection Types** → Smart interface merging  
**Conditional Types** → Nullable types or interfaces  
**Generic Constraints** → Kotlin where clauses  
**Module Declarations** → `@file:JsModule` annotations

---

## 🏭 Generated Project Features

### 📦 Kotlin Multiplatform Setup

- **JS target** with Node.js support
- **Source JARs** for better IDE experience
- **TypeScript definitions** generated automatically
- **Tree-shaking friendly** library configuration

### 📖 Documentation Ready

- **Dokka v2** integration for beautiful API docs
- **JSDoc → KDoc** conversion (`@returns` → `@return`)
- **Type information** preserved in comments

### 🚀 Publishing Support

Built-in support for publishing to:

- **Maven Central** (with signing)
- **Private repositories**
- **GitHub Packages**

Control via gradle.properties:

```txt
publishing.enabled=true
publishing.url=https://my-repo.com/maven
publishing.username=myuser
publishing.password=secret

# Maven Central support
publishing.enabled.central=true
```

---

## 🎨 Configuration Options

### TykonConfig

```typescript
interface TykonConfig {
	package: string; // Kotlin package name
	module?: string; // JS module name
	newLine?: string; // Line endings (\n, \r\n)
	spaces?: number; // Indentation spaces (default: 4)
	tabs?: number; // Indentation tabs (default: 0)
	imports?: string[]; // Kotlin imports to include
}
```

### Advanced Examples

**Custom spacing:**

```typescript
const config = {
	package: 'com.example',
	spaces: 2, // Use 2-space indentation
	newLine: '\r\n' // Windows line endings
};
```

**Multiple libraries:**

```typescript
// Process multiple related libraries together
project.addSourceFileAtPath('node_modules/react/index.d.ts');
project.addSourceFileAtPath('node_modules/@types/react-dom/index.d.ts');

generateKotlinProject(project, 'com.example.react', ...);
```

---

## ⚠️ Current Limitations

- **Ambient declarations only**: Implementation code is not converted
- **Complex mapped types**: May fall back to `dynamic` with comments
- **Advanced TypeScript features**: Conditional types have limited support
- **Name collisions**: Resolved by merging rules, edge cases possible

> 💡 **Tip**: Tykon prefers safe fallbacks over failed generation. Check generated comments for complex types that need manual adjustment.

---

## 🤝 Contributing

We love contributions! Here's how to help:

### 🐛 Found a Bug?

1. Create a **minimal .d.ts file** that reproduces the issue
2. **Open an issue** with the file and expected output
3. **Bonus points** for a failing test case!

### 💡 Want a Feature?

1. **Check existing issues** first
2. **Describe your use case** clearly
3. **Consider contributing** the implementation!

### 🔧 Development Setup

```bash
git clone https://github.com/gmitch215/tykon.git
cd tykon
npm install
npm test
```

### 📝 Coding Guidelines

- **Conservative transformations**: Prefer safe fallbacks
- **Comment complex cases**: Help users understand generated code
- **Test thoroughly**: Include test cases for new features

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
