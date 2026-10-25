import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const pkg = new URL('node_modules/movi-player/', root);
const { version } = JSON.parse(await readFile(new URL('package.json', pkg), 'utf8'));
const output = new URL(`public/vendor/movi-player/${version}/`, root);
await mkdir(output, { recursive: true });
for (const [source, target] of [
  ['dist/element.slim.js', 'element.js'],
  ['dist/movi.wasm', 'movi.wasm'],
  ['LICENSE', 'LICENSE'],
]) {
  await copyFile(new URL(source, pkg), new URL(target, output));
}
console.log(`Prepared Movi Player ${version} at ${fileURLToPath(output)}`);
