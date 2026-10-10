import {build} from 'vite';
import {cpSync,mkdirSync} from 'node:fs';
import manifest from '../src/transport-manifest.js';
import {FLOWER_SPECS} from '../src/lookback.js';
const output=process.argv.includes('--site')?'dist':'dist-ending';
await build({configFile:false,root:'studies/ending',publicDir:false,build:{outDir:`../../${output}`,emptyOutDir:true}});
mkdirSync(`${output}/assets/companion-display`,{recursive:true});mkdirSync(`${output}/assets/model-transport`,{recursive:true});
for(const [,name] of FLOWER_SPECS){const path=`assets/companion-display/${name}.glb`;cpSync(`public/${path}`,`${output}/${path}`);cpSync(`public/${manifest[path].url}`,`${output}/${manifest[path].url}`);}
