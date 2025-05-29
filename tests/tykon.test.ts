import { Project } from "ts-morph"
import { tykon } from '../src/generator'

const project = new Project()
project.addSourceFilesAtPaths('tests/*.d.ts')

const source = project.getSourceFileOrThrow('tests/example.d.ts')

test('tykon', () => {
    console.log(tykon({
        package: 'com.example',
        imports: ['kotlin.collections.List'],
        newLine: '\n'
    }, source))
})