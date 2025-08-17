import * as fs from 'fs';
import { Project } from 'ts-morph';
import { tykonFromSource } from '../src/generator';
import { generateKotlinProject } from '../src/gradle';

describe('Tykon Generator', () => {
	const project = new Project();
	project.addSourceFilesAtPaths('tests/*.d.ts');
	project.addSourceFilesAtPaths('node_modules/@cloudflare/workers-types/index.d.ts');

	beforeAll(() => {
		if (!fs.existsSync('tests/out')) {
			fs.mkdirSync('tests/out');
		}
	});

	test('example.d.ts', () => {
		const source = project.getSourceFileOrThrow('tests/example.d.ts');
		const result = tykonFromSource(
			{
				package: 'com.example',
				imports: ['kotlin.collections.List']
			},
			source
		);
		expect(result.size).toBe(2);

		if (!fs.existsSync('tests/out/example')) {
			fs.mkdirSync('tests/out/example', { recursive: true });
		}

		for (const [name, content] of result) {
			fs.writeFileSync(`tests/out/example/${name}`, content);
		}
	});

	test('@cloudflare/workers-types', () => {
		const source = project.getSourceFileOrThrow('node_modules/@cloudflare/workers-types/index.d.ts');
		const result = tykonFromSource(
			{
				package: 'com.cloudflare.workers',
				module: 'workers-types'
			},
			source
		);

		console.log(Array.from(result.values()).join('\n\n'));

		if (!fs.existsSync('tests/out/cloudflare-workers')) {
			fs.mkdirSync('tests/out/cloudflare-workers', { recursive: true });
		}

		for (const [name, content] of result) {
			fs.writeFileSync(`tests/out/cloudflare-workers/${name}`, content);
		}
	});
});

describe('Gradle Project Generation', () => {
	const project = new Project();
	project.addSourceFilesAtPaths('node_modules/@cloudflare/workers-types/index.d.ts');

	beforeAll(() => {
		if (!fs.existsSync('tests/gradle-out')) {
			fs.mkdirSync('tests/gradle-out');
		}
	});

	test('@cloudflare/workers-types', () => {
		generateKotlinProject(
			project,
			'com.cloudflare.workers',
			'Cloudflare Workers Types',
			'@cloudflare/workers-types',
			'1.0.0',
			'2.1.21',
			'tests/gradle-out',
			['"org.jetbrains.kotlin-wrappers:kotlin-web:2025.6.0"'],
			[
				'js.serialization.*',
				'js.iterable.*',
				'kotlin.js.*',
				'org.khronos.webgl.*',
				'org.w3c.dom.*',
				'org.w3c.dom.events.*',
				'org.w3c.fetch.*',
				'org.w3c.files.*',
				'org.w3c.workers.*',
				'org.w3c.xhr.*',
				'web.abort.*',
				'web.assembly.*',
				'web.crypto.*',
				'web.streams.*'
			]
		);
	});
});
