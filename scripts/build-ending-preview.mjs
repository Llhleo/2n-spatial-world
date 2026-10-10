import {build} from 'vite';
import {cpSync,mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import manifest from '../src/transport-manifest.js';
import {FLOWER_SPECS} from '../src/lookback.js';
const output=process.argv.includes('--site')?'dist':'dist-ending';
await build({configFile:false,root:'studies/ending',publicDir:false,build:{outDir:`../../${output}`,emptyOutDir:true}});
mkdirSync(`${output}/assets/companion-display`,{recursive:true});mkdirSync(`${output}/assets/model-transport`,{recursive:true});
for(const [,name] of FLOWER_SPECS){const path=`assets/companion-display/${name}.glb`;cpSync(`public/${path}`,`${output}/${path}`);const packed=`public/${manifest[path].url}`,target=`${output}/${manifest[path].url}`;if(existsSync(packed))cpSync(packed,target);else writeFileSync(target,gzipSync(readFileSync(`public/${path}`),{level:9,mtime:0}));}
