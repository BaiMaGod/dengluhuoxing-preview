import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
const base=process.env.SMOKE_URL||'http://127.0.0.1:4173';
await fs.mkdir('artifacts/visual',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report=[];
for(const view of [{width:390,height:844},{width:375,height:667}]){
 const page=await browser.newPage({viewport:view,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
 page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
 async function snap(name){await page.screenshot({path:`artifacts/visual/${view.width}-${name}.png`});}
 async function click(label){const p=await page.evaluate(label=>{
   function scan(n){if(!n.visible)return null;if(n.text===label){const p=n.localToGlobal(new Laya.Point(n.width/2,n.height/2));return{x:p.x,y:p.y};}for(let i=0;i<n.numChildren;i++){const p=scan(n.getChildAt(i));if(p)return p;}}
   const p=scan(Laya.stage);return p&&{x:p.x/Laya.stage.width,y:p.y/Laya.stage.height};
 },label);assert.ok(p,`Visible ${label}`);await page.touchscreen.tap(p.x*view.width,p.y*view.height);}
 try{
  await page.goto(base+'/?e2e=1');await page.waitForFunction(()=>globalThis.__MARS_GAME__?.phase==='home');
  const assets=await page.evaluate(()=>({cached:['logo','button_gold','button_blue','panel','home','flight','hangar'].every(n=>!!Laya.loader.getRes(`art/mission/${n}.${['home','flight','hangar'].includes(n)?'jpg':'png'}`)),stage:{w:Laya.stage.width,h:Laya.stage.height}}));
  assert.ok(assets.cached,'All reference-led artwork actually loaded into Laya');await snap('home');
  await click('开始造火箭');await page.waitForFunction(()=>globalThis.__MARS_GAME__.phase==='building');await snap('build-start');
  await click('暂停');await page.waitForFunction(()=>globalThis.__MARS_GAME__.userPaused);
  const y=await page.evaluate(()=>globalThis.__MARS_GAME__.current.node.y);await snap('pause');await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>globalThis.__MARS_GAME__.current.node.y),y);await click('继续远征');
  for(let i=0;i<6;i++){
   await page.waitForFunction(i=>{const g=globalThis.__MARS_GAME__;return g.phase==='building'&&g.current&&!g.current.released&&g.modules.length===i+1;},i,{timeout:20000});
   const p=await page.evaluate(()=>{const g=globalThis.__MARS_GAME__;return{x:g.current.node.x/Laya.stage.width,y:g.current.node.y/Laya.stage.height};});
   const session=await page.context().newCDPSession(page);
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x*view.width,y:p.y*view.height}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:view.width/2,y:p.y*view.height}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  }
  await page.waitForFunction(()=>globalThis.__MARS_GAME__.phase==='launch_ready',null,{timeout:24000});await snap('build-ready');
  await click('点火发射');await page.waitForFunction(()=>globalThis.__MARS_GAME__.phase==='stage1_flight');
  await page.waitForTimeout(500);await snap('flight');
  const before=await page.evaluate(()=>globalThis.__MARS_GAME__.modules[0].node.x);
  const session=await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:view.width/2,y:view.height*.8}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:view.width*.69,y:view.height*.8}]});
  await page.waitForTimeout(450);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  const after=await page.evaluate(()=>globalThis.__MARS_GAME__.modules[0].node.x);assert.ok(after>before+5,'Actual touch steering moves the rocket');
  await click('暂停');await snap('flight-pause');await click('继续远征');
  const timings=await page.evaluate(()=>new Promise(resolve=>{const a=[];let last=performance.now();function next(now){a.push(now-last);last=now;if(a.length===120){a.sort((a,b)=>a-b);resolve({p95:a[114],median:a[60]});}else requestAnimationFrame(next);}requestAnimationFrame(next);}));
  assert.ok(timings.p95<=33.4,`Frame budget p95 ${timings.p95}`);
  assert.deepEqual(errors,[]);report.push({viewport:view,passed:true,assets,timings,touchSteering:{before,after},errors});
 }catch(e){await snap('failure');report.push({viewport:view,passed:false,error:e.stack,errors});}
 await page.close();
}
const page=await browser.newPage({viewport:{width:1280,height:800}});await page.goto(base+'/?e2e=1');await page.waitForFunction(()=>globalThis.__MARS_GAME__?.phase==='home');await page.screenshot({path:'artifacts/visual/desktop-home.png'});await page.close();
await browser.close();await fs.writeFile('artifacts/visual/report.json',JSON.stringify(report,null,2));assert.ok(report.every(r=>r.passed),JSON.stringify(report));
console.log('Reference-led visual, touch and frame checks passed',JSON.stringify(report));
