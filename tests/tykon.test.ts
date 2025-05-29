import { Project } from "ts-morph"
import { tykonFromSource } from '../src/generator'

const project = new Project()
project.addSourceFilesAtPaths('tests/*.d.ts')
project.addSourceFilesAtPaths('node_modules/@cloudflare/workers-types/index.d.ts')

describe('Tykon Generator', () => {
    test('example.d.ts', () => {
        const source = project.getSourceFileOrThrow('tests/example.d.ts')
        console.log(tykonFromSource({
            package: 'com.example',
            imports: ['kotlin.collections.List']
        }, source))
    })

    test('@cloudflare/workers-types', () => {
        const source = project.getSourceFileOrThrow('node_modules/@cloudflare/workers-types/index.d.ts')
        console.log(tykonFromSource({
            package: 'com.cloudflare.workers',
        }, source))
    })
})