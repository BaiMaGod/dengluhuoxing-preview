import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
const base=process.env.SMOKE_URL||'http://127.0.0.1:4173';
await fs.mkdir('artifacts/visual',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report=[];
for(const profile of [
 {id:'390',width:390,height:844,quality:'default'},
 {id:'375',width:375,height:667,quality:'default'},
 {id:'390-low',width:390,height:844,quality:'low',reducedMotion:'reduce'}
]){
 const view={width:profile.width,height:profile.height};
 const page=await browser.newPage({viewport:view,deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:profile.reducedMotion||'no-preference'});
 const errors=[],network=[],audioEvents=[];
 const audioSession=await page.context().newCDPSession(page);
 audioSession.on('WebAudio.contextCreated',e=>audioEvents.push({event:'created',...e.context}));
 audioSession.on('WebAudio.contextChanged',e=>audioEvents.push({event:'changed',...e.context}));
 await audioSession.send('WebAudio.enable');
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push({message:m.text(),location:m.location()});});
 page.on('response',r=>{network.push({status:r.status(),url:r.url()});if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
 let step='home';
 async function snap(name){await page.screenshot({path:`artifacts/visual/${profile.id}-${name}.png`});}
 async function click(label){const p=await page.evaluate(label=>{
   function scan(n){if(!n.visible)return null;if(n.text===label){const p=n.localToGlobal(new Laya.Point(n.width/2,n.height/2));return{x:p.x,y:p.y};}for(let i=0;i<n.numChildren;i++){const p=scan(n.getChildAt(i));if(p)return p;}}
   const p=scan(Laya.stage);return p&&{x:p.x/Laya.stage.width,y:p.y/Laya.stage.height};
 },label);assert.ok(p,`Visible ${label}`);await page.touchscreen.tap(p.x*view.width,p.y*view.height);}
 const assets={};let timings=null,touchSteering=null;
 try{
  await page.goto(base+`/?e2e=1&quality=${profile.quality}`);await page.waitForFunction(()=>globalThis.__MARS_GAME__?.phase==='home');
  Object.assign(assets,await page.evaluate(()=>({
   textures:Object.fromEntries(['logo','button_gold','button_blue','panel','home','flight','hangar'].map(n=>{const t=Laya.loader.getRes(`art/mission/${n}.${['home','flight','hangar'].includes(n)?'jpg':'png'}`);return[n,{width:t?.width,height:t?.height,destroyed:t?.destroyed}];})),
   stage:{w:Laya.stage.width,h:Laya.stage.height},canvas:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height})),retinal:Laya.Config.useRetinalCanvas,
   reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
   gpu:(()=>{const c=document.querySelector('canvas');const gl=c?.getContext('webgl2')||c?.getContext('webgl');if(!gl)return null;const ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);})()
  })));
  assert.ok(Object.values(assets.textures).every(t=>t.width>0&&t.height>0&&!t.destroyed),'Reference artwork decoded into real Laya textures');
  const homeLayout=await page.evaluate(()=>{
    const root=globalThis.__MARS_GAME__.homePanel.container;
    function find(n,name){if(n.name===name)return n;for(let i=0;i<n.numChildren;i++){const r=find(n.getChildAt(i),name);if(r)return r;}}
    const record=find(root,'home_stats_backdrop'),mascot=find(root,'home_astronaut_mascot'),resources=find(root,'home_resource_card');
    return {recordBottom:record.y+record.height,mascotTop:mascot.y,mascotBottom:mascot.y+mascot.height,resourcesTop:resources.y};
  });
  assert.ok(homeLayout.recordBottom+10<=homeLayout.mascotTop,'History card leaves the astronaut helmet visible');
  assert.ok(homeLayout.mascotBottom+10<=homeLayout.resourcesTop,'Astronaut clears the resource card');
  assets.homeLayout=homeLayout;
  // Inspect the actual downloaded PNG, since a cached placeholder is insufficient.
  assert.equal(await page.evaluate(()=>new Promise(r=>{const i=new Image();i.onload=()=>r(i.naturalWidth);i.onerror=()=>r(0);i.src='art/mission/logo.png';})),900,'Logo PNG is complete and browser-decodable');
  await page.waitForTimeout(250);await snap('home');
  if(profile.id==='390'){
   step='settings and sound';await click('⚙');await click('关闭音效');
   assert.equal(await page.evaluate(()=>localStorage.getItem('mars.audio.muted')),'1','Real settings button saves mute preference');
   await page.reload();await page.waitForFunction(()=>globalThis.__MARS_GAME__?.phase==='home');
   await click('⚙');await click('打开音效');
   assert.equal(await page.evaluate(()=>localStorage.getItem('mars.audio.muted')),'0','Real settings button restores sound');
   await page.waitForFunction(()=>document.visibilityState==='visible');await click('⚙');await snap('settings');await click('返回');
  }
  step='build start';await click('开始造火箭');await page.waitForFunction(()=>globalThis.__MARS_GAME__.phase==='building');await snap('build-start');
  await click('暂停');await page.waitForFunction(()=>globalThis.__MARS_GAME__.userPaused);
  const y=await page.evaluate(()=>globalThis.__MARS_GAME__.current.node.y);await snap('pause');await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>globalThis.__MARS_GAME__.current.node.y),y);await click('继续远征');
  for(let i=0;i<6;i++){
   step=`touch drop ${i+1}`;
   await page.waitForFunction(i=>{const g=globalThis.__MARS_GAME__;return g.phase==='building'&&g.current&&!g.current.released&&g.modules.length===i+1;},i,{timeout:20000});
   const p=await page.evaluate(()=>{const g=globalThis.__MARS_GAME__;return{x:g.current.node.x/Laya.stage.width,y:g.current.node.y/Laya.stage.height};});
   const session=await page.context().newCDPSession(page);
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x*view.width,y:p.y*view.height}]});
   await page.waitForFunction(()=>globalThis.__MARS_GAME__.buildDragging,null,{timeout:4000});
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:view.width*.55,y:p.y*view.height}]});
   await page.waitForFunction(()=>Math.abs(globalThis.__MARS_GAME__.current.node.x-Laya.stage.width*.55)<3,null,{timeout:4000});
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:view.width/2,y:p.y*view.height}]});
   await page.waitForFunction(()=>Math.abs(globalThis.__MARS_GAME__.current.node.x-Laya.stage.width/2)<3,null,{timeout:4000});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(()=>globalThis.__MARS_GAME__.current.released,null,{timeout:4000});await session.detach();
  }
  step='launch';await page.waitForFunction(()=>globalThis.__MARS_GAME__.phase==='launch_ready',null,{timeout:24000});await snap('build-ready');
  await click('点火发射');await page.waitForFunction(()=>globalThis.__MARS_GAME__.phase==='stage1_flight');
  await page.waitForTimeout(500);await snap('flight');
  if(profile.reducedMotion==='reduce')assert.ok(await page.evaluate(()=>{const f=globalThis.__MARS_GAME__.feedback;return f.reducedMotion&&f.sparks.length===0&&f.shockwaves.length===0;}),'Reduced-motion mode suppresses decorative particles and expanding rings');
  step='flight touch steering';const before=await page.evaluate(()=>globalThis.__MARS_GAME__.modules[0].node.x);
  const session=await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:view.width/2,y:view.height*.8}]});
  await page.waitForFunction(()=>globalThis.__MARS_GAME__.controlDragging);
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:view.width*.69,y:view.height*.8}]});
  await page.waitForTimeout(450);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  const after=await page.evaluate(()=>globalThis.__MARS_GAME__.modules[0].node.x);assert.ok(after>before+5,'Actual touch steering moves the rocket');touchSteering={before,after};
  await click('暂停');await snap('flight-pause');await click('继续远征');
  // Subtracting browser timestamps introduces binary floating-point tails.
  // Normalize to integer nanoseconds; retain the original 33.4ms budget.
  step='frame sampling';timings=await page.evaluate(()=>new Promise(resolve=>{const a=[];let last=null;function next(now){if(last!==null)a.push(Math.round((now-last)*1e6)/1e6);last=now;if(a.length===120){a.sort((a,b)=>a-b);resolve({p95:a[114],median:a[60],budgetMs:33.4,timingPrecisionNs:1});}else requestAnimationFrame(next);}requestAnimationFrame(next);}));
  if(profile.id==='390')assert.ok(audioEvents.some(e=>e.contextState==='running'),'Native WebAudio context runs after real input');
  assert.deepEqual(errors,[]);report.push({audioEvents,profile,passed:true,performancePassed:timings.p95<=33.4,assets,timings,touchSteering,errors,network});
 }catch(e){await snap('failure');const state=await page.evaluate(()=>{const g=globalThis.__MARS_GAME__;return g&&{phase:g.phase,userPaused:g.userPaused,buildDragging:g.buildDragging,current:g.current&&{released:g.current.released,x:g.current.node.x,y:g.current.node.y},modules:g.modules.map(m=>({x:m.node.x,y:m.node.y,released:m.released,settled:m.settled,rotation:m.body.rotation})),pointer:{x:Laya.stage.mouseX,y:Laya.stage.mouseY}};}).catch(()=>null);report.push({audioEvents,profile,passed:false,performancePassed:false,step,error:e.stack,state,assets,timings,touchSteering,errors,network});}
 await page.close();
}
const page=await browser.newPage({viewport:{width:1280,height:800}});await page.goto(base+'/?e2e=1');await page.waitForFunction(()=>globalThis.__MARS_GAME__?.phase==='home');await page.waitForTimeout(250);await page.screenshot({path:'artifacts/visual/desktop-home.png'});await page.close();
await browser.close();await fs.writeFile('artifacts/visual/report.json',JSON.stringify(report,null,2));
assert.ok(report.every(r=>r.passed),'Visual/touch/error gate failed: '+JSON.stringify(report.map(({profile,passed,step,error,errors})=>({profile,passed,step,error,errors}))));
assert.ok(report.every(r=>r.performancePassed),'Frame gate failed: '+JSON.stringify(report.map(({profile,timings})=>({profile,timings}))));
console.log('Reference-led visual, touch and frame checks passed',JSON.stringify(report));
