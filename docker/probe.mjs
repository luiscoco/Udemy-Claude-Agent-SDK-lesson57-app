import {writeFile,readFile} from 'node:fs/promises';
import {connect} from 'node:net';
import {networkInterfaces} from 'node:os';
let docsWrite='unexpected-success',rootWrite='unexpected-success';
try{await writeFile('/docs/blocked.txt','probe');}catch(e){docsWrite=e.code;}
try{await writeFile('/probe/blocked.txt','probe');}catch(e){rootWrite=e.code;}
// TEST-NET address; the host verifies --network none before starting this probe.
const network=await new Promise(resolve=>{const s=connect({host:'192.0.2.1',port:80});s.setTimeout(1500);s.on('connect',()=>{s.destroy();resolve('unexpected-connect');});s.on('error',e=>resolve(e.code));s.on('timeout',()=>{s.destroy();resolve('timeout');});});
console.log(JSON.stringify({projectVisible:(await readFile('/docs/guide.md','utf8')).includes('DOCS57'),docsWrite,rootWrite,network,interfaces:Object.keys(networkInterfaces()),apiKeyPresent:Boolean(process.env.ANTHROPIC_API_KEY)}));
