import * as fs from 'fs'
import { Project } from "ts-morph"
import { tykonFromSource } from '../src/generator'

const project = new Project()
project.addSourceFilesAtPaths('tests/*.d.ts')
project.addSourceFilesAtPaths('node_modules/@cloudflare/workers-types/index.d.ts')

describe('Tykon Generator', () => {
    beforeAll(() => {
        if (!fs.existsSync('tests/out')) {
            fs.mkdirSync('tests/out')
        }
    })

    test('example.d.ts', () => {
        const source = project.getSourceFileOrThrow('tests/example.d.ts')
        const result = tykonFromSource({
            package: 'com.example',
            imports: ['kotlin.collections.List']
        }, source)
        expect(result.size).toBe(1)

        const first = result.values().next().value
        console.log(first)
        fs.writeFileSync('tests/out/example.d.kt', first)
    })

    test('@cloudflare/workers-types', () => {
        const source = project.getSourceFileOrThrow('node_modules/@cloudflare/workers-types/index.d.ts')
        const result = tykonFromSource({
            package: 'com.cloudflare.workers',
            module: 'workers-types'
        }, source)

        console.log(Array.from(result.values()).join('\n\n'))

        if (!fs.existsSync('tests/out/cloudflare-workers')) {
            fs.mkdirSync('tests/out/cloudflare-workers', { recursive: true })
        }

        for (const [name, content] of result) {
            fs.writeFileSync(`tests/out/cloudflare-workers/${name}`, content)
        }
    })
})