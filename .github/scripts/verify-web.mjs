import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(process.argv[2]||'web');
const evidence=JSON.parse(await fs.readFile(path.join(root,'_build-evidence.json'),'utf8'));
assert.equal(evidence.sourceRepository,'BaiMaGod/dengluhuoxing');
assert.equal(evidence.sourceCommit,process.env.SOURCE_SHA);
assert.equal(evidence.engine,'LayaAir 3.4.0 official CLI');
assert.equal(evidence.browserSmokePassed,true);
for(const size of ['390x844','375x667'])assert.ok(evidence.browserSmokeViewport.includes(size));
const expected=Object.keys(evidence.files).sort();
assert.ok(expected.includes('index.html'));
assert.ok(expected.some(p=>p.endsWith('libs/laya.core.js')));
async function walk(dir){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);assert.ok(!e.isSymbolicLink(),'Symlinks are forbidden');if(e.isDirectory())out.push(...await walk(p));else out.push(path.relative(root,p).replaceAll('\\','/'));}return out;}
const actual=(await walk(root)).filter(p=>p!=='_build-evidence.json').sort();
assert.deepEqual(actual,expected,'Every deployed file must have an original build hash');
for(const file of expected){
 assert.ok(!file.startsWith('.')&&!file.includes('..')&&!file.includes('\\'));
 assert.ok(!/\.(ts|map|laya|md)$/i.test(file),'Source files must remain private: '+file);
 const bytes=await fs.readFile(path.join(root,file));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),evidence.files[file],file);
}
console.log('Verified exact official Web files',expected.length,evidence.sourceCommit);
