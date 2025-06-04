import * as fs from 'fs';
import { Project } from 'ts-morph';
import { tykonFromSource } from './generator';

const buildGradleKts = (groupId: string, description: string, kotlinVersion: string, npmPackageName: string, npmPackageVersion: string): string => {
    const template = fs.readFileSync('src/templates/build.gradle.kts.template', 'utf-8');

    return template
        .replace(/{{groupId}}/g, groupId)
        .replace(/{{description}}/g, description)
        .replace(/{{kotlinVersion}}/g, kotlinVersion)
        .replace(/{{npmPackageName}}/g, npmPackageName)
        .replace(/{{npmPackageVersion}}/g, npmPackageVersion);
}

const settingsGradleKts = (npmPackageName: string): string => {
    return `rootProject.name = "${npmPackageName.includes('/') ? npmPackageName.split('/')[1] : npmPackageName}"`
}

const gradleProperties = "org.gradle.daemon=true\n" +
    "org.gradle.jvmargs=-Xmx2g -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8\n" +
    "kotlin.incremental=true\n" +
    "org.gradle.parallel=true\n" +
    "org.gradle.cache=true"

/**
 * Exports a Kotlin project structure with Gradle build files and Kotlin source files generated from TypeScript definitions.
 * @param project The TypeScript project containing the source files to convert.
 * @param groupId The group ID for the Kotlin project, typically in reverse domain name format (e.g., `com.example`).
 * @param npmPackageName The name of the npm package, which will be used as the project name.
 * @param npmPackageVersion The version of the npm package, which will be used in the project.
 * @param kotlinVersion The version of Kotlin to use in the project. Defaults to '2.1.21'.
 * @param outputDir The directory where the Kotlin project will be generated. Defaults to the npm package name.
 * @param dependencies An array of dependencies to include in the Gradle build file. 
 * Each dependency should be a string in the format `group:name:version`. 
 * You must include the quotes if you are citing a maven dependency, or you can use the `npm(npmPackageName, npmPackageVersion)` format for npm packages.
 * @param imports An array of Kotlin imports to include in the generated source files.
 */
export function generateKotlinProject(
    project: Project,
    groupId: string,
    description: string,
    npmPackageName: string,
    npmPackageVersion: string,
    kotlinVersion: string = '2.1.21',
    outputDir: string = npmPackageName,
    dependencies: string[] = [],
    imports: string[] = []
) {
    let buildGradleContent = buildGradleKts(groupId, description, kotlinVersion, npmPackageName, npmPackageVersion);
    if (dependencies.length > 0) {
        const dependenciesBlock = dependencies.map(dep => `implementation(${dep})`).join('\n');
        buildGradleContent = buildGradleContent.replace(/{{dependencies}}/g, dependenciesBlock);
    } else {
        buildGradleContent = buildGradleContent.replace(/{{dependencies}}/g, '');
    }


    const settingsGradleContent = settingsGradleKts(npmPackageName);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(`${outputDir}/build.gradle.kts`, buildGradleContent);
    fs.writeFileSync(`${outputDir}/settings.gradle.kts`, settingsGradleContent);
    fs.writeFileSync(`${outputDir}/gradle.properties`, gradleProperties);

    fs.cpSync('src/gradle-template', outputDir, { recursive: true });

    const folder = groupId.replace(/\./g, '/');
    if (!fs.existsSync(`${outputDir}/src/jsMain/kotlin/${folder}`)) {
        fs.mkdirSync(`${outputDir}/src/jsMain/kotlin/${folder}`, { recursive: true });
    }

    const sources = project.getSourceFiles()

    for (const source of sources) {
        const result = tykonFromSource({
            package: groupId,
            module: npmPackageName,
            imports: imports,
        }, source)

        for (const [name, content] of result) {
            fs.writeFileSync(`${outputDir}/src/jsMain/kotlin/${folder}/${name}`, content)
        }
    }

    console.log(`Kotlin project generated in ${outputDir}`);
}