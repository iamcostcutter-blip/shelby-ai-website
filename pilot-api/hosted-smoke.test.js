'use strict';
const assert=require('node:assert/strict');
const {setTimeout:sleep}=require('node:timers/promises');
const base='https://shelby-receptionist-test-api.onrender.com';
async function call(path,init={}){
  const response=await fetch(base+path,{...init,signal:AbortSignal.timeout(30000)});
  const data=await response.json();
  return {status:response.status,data};
}
async function ready(){
  for(let attempt=0;attempt<8;attempt++){
    try{
      const result=await call('/api/health');
      if(result.status===200 && result.data.ok===true)return result;
    }catch(e){if(attempt===7)throw e;}
    await sleep(2500);
  }
  throw new Error('Render test API failed health check');
}
async function main(){
  const health=await ready();
  assert.equal(health.data.environment,'synthetic-only');
  assert.equal(health.data.real_customer_enquiries,false);
  assert.equal(health.data.persistent_storage,false);
  const before=await call('/api/test-stats');
  assert.equal(before.status,200);
  const payload=JSON.stringify({synthetic:true,name:'TEST ENQUIRY',contact:'test@example.invalid'});
  const request={method:'POST',headers:{'Content-Type':'application/json'},body:payload};
  const result=await call('/api/test-enquiry',request);
  assert.equal(result.status,201);
  assert.equal(result.data.ok,true);
  assert.equal(result.data.synthetic,true);
  assert.equal(result.data.real_customer_data_accepted,false);
  assert.equal(result.data.delivery,'disabled');
  assert.match(result.data.enquiry_id,/^[0-9a-f-]{36}$/);
  const after=await call('/api/test-stats');
  assert.ok(after.data.synthetic_enquiries>=before.data.synthetic_enquiries+1);
  const rejected=await call('/api/test-enquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'REAL CONTACT',contact:'real@example.com'})});
  assert.equal(rejected.status,422);
  const blocked=await call('/api/test-enquiry',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.invalid'},body:payload});
  assert.equal(blocked.status,403);
  console.log('PASS hosted Render API: health, fictional POST accepted, count incremented, real input rejected, foreign origin rejected. No real data, payments or notifications sent.');
}
main().catch(err=>{console.error(err);process.exitCode=1});
