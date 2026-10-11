import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const base=process.env.PREVIEW_URL;
const local=JSON.parse(await fs.readFile('web/_build-evidence.json','utf8'));
const live=await fetch(new URL('_build-evidence.json?rev='+process.env.GITHUB_SHA,base),{cache:'no-store'});
assert.equal(live.status,200);
assert.deepEqual(await live.json(),local,'The live site must contain this exact verified release');
for(const [file,hash] of Object.entries(local.files)){
 const r=await fetch(new URL(file+'?rev='+process.env.GITHUB_SHA,base),{cache:'no-store'});
 assert.equal(r.status,200,file);
 assert.equal(createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex'),hash,file);
}
await fs.mkdir('live-qa',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report=[];
try{for(const view of [{width:390,height:844},{width:375,height:667}]){
 const id=String(view.width),errors=[];
 const page=await browser.newPage({viewport:view,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 page.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 async function visible(label){return page.evaluate(label=>{function scan(n){if(!n.visible)return null;if(n.text===label){const p=n.localToGlobal(new Laya.Point(n.width/2,n.height/2));return {x:p.x/Laya.stage.width,y:p.y/Laya.stage.height};}for(let i=0;i<n.numChildren;i++){const p=scan(n.getChildAt(i));if(p)return p;}}return scan(Laya.stage);},label);}
 async function tap(label){const p=await visible(label);assert.ok(p,'Visible live button '+label);await page.touchscreen.tap(p.x*view.width,p.y*view.height);}
 async function waitLabel(label,timeout=30000){await page.waitForFunction(label=>{function scan(n){if(!n.visible)return false;if(n.text===label)return true;for(let i=0;i<n.numChildren;i++)if(scan(n.getChildAt(i)))return true;return false;}return !!globalThis.Laya?.stage&&scan(Laya.stage);},label,{timeout});}
 try{
  await page.goto(base+'?e2e=1',{waitUntil:'domcontentloaded'});
  await waitLabel('开始造火箭');
  assert.equal(await page.evaluate(()=>typeof globalThis.__MARS_GAME__),'undefined','No production diagnostic bridge');
  const layout=await page.evaluate(()=>{const nodes={};function scan(n){if(!n.visible)return;if(['home_stats_backdrop','home_astronaut_mascot','home_resource_card'].includes(n.name))nodes[n.name]={top:n.y,bottom:n.y+n.height};for(let i=0;i<n.numChildren;i++)scan(n.getChildAt(i));}scan(Laya.stage);return nodes;});
  assert.ok(layout.home_stats_backdrop.bottom+10<=layout.home_astronaut_mascot.top);
  assert.ok(layout.home_astronaut_mascot.bottom+10<=layout.home_resource_card.top);
  await page.screenshot({path:`live-qa/${id}-home.png`});
  await tap('开始造火箭');await waitLabel('暂停');
  await tap('暂停');await waitLabel('继续远征');await page.screenshot({path:`live-qa/${id}-paused.png`});await tap('继续远征');
  for(let i=0;i<6;i++){
   await page.waitForFunction(i=>{function scan(n){if(!n.visible)return false;if(n.name?.startsWith('rocket_module_'+i+'_'))return true;for(let j=0;j<n.numChildren;j++)if(scan(n.getChildAt(j)))return true;return false;}return scan(Laya.stage);},i,{timeout:25000});
   const p=await page.evaluate(i=>{function scan(n){if(!n.visible)return null;if(n.name?.startsWith('rocket_module_'+i+'_')){const p=n.localToGlobal(new Laya.Point(n.width/2,n.height/2));return{x:p.x/Laya.stage.width,y:p.y/Laya.stage.height};}for(let j=0;j<n.numChildren;j++){const p=scan(n.getChildAt(j));if(p)return p;}}return scan(Laya.stage);},i);
   const cdp=await page.context().newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x*view.width,y:p.y*view.height}]});
   await page.waitForTimeout(70);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:view.width/2,y:p.y*view.height}]});
   await page.waitForTimeout(70);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }
  await waitLabel('点火发射',25000);await page.screenshot({path:`live-qa/${id}-ready.png`});await tap('点火发射');
  await page.waitForFunction(()=>{function scan(n){if(!n.visible)return false;if(n.text?.startsWith('一级燃料'))return true;for(let i=0;i<n.numChildren;i++)if(scan(n.getChildAt(i)))return true;return false;}return scan(Laya.stage);});
  await page.waitForTimeout(500);await page.screenshot({path:`live-qa/${id}-flight.png`});
  await tap('暂停');await waitLabel('继续远征');await tap('继续远征');
  await waitLabel('再来一枚',150000);await page.screenshot({path:`live-qa/${id}-result.png`});
  assert.deepEqual(errors,[]);report.push({viewport:view,passed:true,layout,errors,sourceCommit:local.sourceCommit});
 }catch(e){report.push({viewport:view,passed:false,error:e.stack,errors});await page.screenshot({path:`live-qa/${id}-failed.png`}).catch(()=>{});throw e;}
 finally{await fs.writeFile('live-qa/report.json',JSON.stringify(report,null,2));await page.close();}
}}finally{await browser.close();}
console.log('Live exact-file, touch assembly, flight and settlement checks passed',JSON.stringify(report));
