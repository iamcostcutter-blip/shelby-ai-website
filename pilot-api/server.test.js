'use strict';
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {setTimeout: sleep} = require('node:timers/promises');
const port = 20000 + Math.floor(Math.random()*10000);
const root = 'http://127.0.0.1:' + port;
const proc = spawn(process.execPath, ['pilot-api/server.js'], {env:{...process.env,PORT:String(port)},stdio:'pipe'});
let output = '';
proc.stderr.on('data',x=>{output+=String(x)});
async function request(path, opts){ const r=await fetch(root+path,opts);return {status:r.status,body:await r.json()};}
async function main(){
 try {
  let up = false;
  for(let i=0;i<40;i++){try{await request('/api/health');up=true;break}catch{await sleep(100)}}
  assert.ok(up, 'server did not start: '+output);
  const health=await request('/api/health');
  assert.equal(health.status,200);
  assert.equal(health.body.environment,'synthetic-only');
  assert.equal(health.body.real_customer_enquiries,false);
  assert.equal(health.body.persistent_storage,false);
  const initial=await request('/api/test-stats');
  assert.equal(initial.body.synthetic_enquiries,0);
  const post=(o)=>request('/api/test-enquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)});
  assert.equal((await post({name:'Real Name',contact:'real@example.com'})).status,422);
  assert.equal((await post({synthetic:true,name:'TEST ENQUIRY',contact:'other@example.com'})).status,422);
  const accepted=await post({synthetic:true,name:'TEST ENQUIRY',contact:'test@example.invalid'});
  assert.equal(accepted.status,201);
  assert.equal(accepted.body.synthetic,true);
  assert.equal(accepted.body.delivery,'disabled');
  assert.equal(accepted.body.real_customer_data_accepted,false);
  assert.ok(/^[0-9a-f-]{36}$/.test(accepted.body.enquiry_id));
  const stats=await request('/api/test-stats');
  assert.equal(stats.body.synthetic_enquiries,1);
  const bad=await request('/api/test-enquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:'not-json'});
  assert.equal(bad.status,400);
  const forbidden=await request('/api/test-enquiry',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://attacker.invalid'},body:JSON.stringify({synthetic:true,name:'TEST ENQUIRY',contact:'test@example.invalid'})});
  assert.equal(forbidden.status,403);
  console.log('PASS: synthetic-only API, rejection, stats, invalid JSON, origin control');
 } finally {proc.kill('SIGTERM')}
}
main().catch(e=>{console.error(e);process.exitCode=1});
