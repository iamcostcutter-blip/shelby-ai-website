'use strict';
const http = require('node:http');
const {randomUUID} = require('node:crypto');
const PORT = Number(process.env.PORT || 10000);
const LIMIT = 8192;
const leads = new Map();
const rate = new Map();
function respond(res,status,obj){res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'https://shelby-ai-website.onrender.com','Vary':'Origin'});res.end(JSON.stringify(obj));}
function cleanup(){const now=Date.now();for(const [id,l] of leads)if(now-l.created>3600000)leads.delete(id);for(const [ip,r]of rate)if(now-r.start>60000)rate.delete(ip);}
const server=http.createServer((req,res)=>{
  cleanup();
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/api/health' && req.method==='GET')return respond(res,200,{ok:true,service:'shelby-receptionist-test',environment:'synthetic-only',persistent_storage:false,real_customer_enquiries:false,notifications:false});
  if(path==='/api/test-stats' && req.method==='GET')return respond(res,200,{synthetic_enquiries:leads.size,storage:'in-memory',ttl_minutes:60});
  if(path==='/api/test-enquiry' && req.method==='POST'){
    const ip=req.socket.remoteAddress||'unknown';let rec=rate.get(ip);
    if(!rec || Date.now()-rec.start>=60000){rec={start:Date.now(),count:0};rate.set(ip,rec);}
    if(++rec.count>10)return respond(res,429,{ok:false,error:'Rate limit'});
    if(req.headers.origin && req.headers.origin!=='https://shelby-ai-website.onrender.com')return respond(res,403,{ok:false,error:'Origin not allowed'});
    let body='',exceeded=false;req.on('data',chunk=>{body+=chunk;if(body.length>LIMIT){exceeded=true;req.destroy();}});req.on('end',()=>{
      if(exceeded)return;
      let data;try{data=JSON.parse(body)}catch{return respond(res,400,{ok:false,error:'Invalid JSON'});}
      if(data.synthetic!==true || data.name!=='TEST ENQUIRY' || data.contact!=='test@example.invalid')return respond(res,422,{ok:false,error:'Only the documented synthetic enquiry is permitted. Do not enter real personal information.'});
      if(leads.size>=100)return respond(res,503,{ok:false,error:'Test capacity reached'});
      const id=randomUUID();leads.set(id,{created:Date.now()});
      return respond(res,201,{ok:true,synthetic:true,enquiry_id:id,stored:'temporary-in-memory',delivery:'disabled',real_customer_data_accepted:false});
    });
    return;
  }
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'https://shelby-ai-website.onrender.com','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'});return res.end();}
  respond(res,404,{ok:false,error:'Not found'});
});
server.listen(PORT,'0.0.0.0',()=>console.log('Shelby synthetic-only pilot API listening'));
