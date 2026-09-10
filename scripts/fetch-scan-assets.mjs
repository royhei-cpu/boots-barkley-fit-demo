// Restore version-checked model assets omitted from the lightweight transfer ZIP.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
const manifest=JSON.parse(await readFile(new URL('../scan-assets.json',import.meta.url),'utf8'));
const base='https://raw.githubusercontent.com/royhei-cpu/boots-barkley-fit-demo/main/';
for(const [path,expected] of Object.entries(manifest)){
 const destination=new URL('../'+path,import.meta.url);
 let bytes;try{bytes=await readFile(destination);}catch{}
 if(bytes&&createHash('sha256').update(bytes).digest('hex')===expected.sha256)continue;
 const response=await fetch(base+path);if(!response.ok)throw new Error(`Cannot load ${path}: ${response.status}`);
 bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length!==expected.bytes||createHash('sha256').update(bytes).digest('hex')!==expected.sha256)throw new Error(`Asset checksum failed: ${path}`);
 await mkdir(dirname(destination.pathname),{recursive:true});await writeFile(destination,bytes);
 console.log('Restored',path);
}
