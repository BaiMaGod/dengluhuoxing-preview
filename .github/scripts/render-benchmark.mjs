import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report=[];
for(const profile of [{id:'baseline',url:'http://127.0.0.1:4175/?e2e=1'},{id:'current',url:'http://127.0.0.1:4173/?e2e=1'},{id:'no-ubo',url:'http://127.0.0.1:4173/render-benchmark.html?e2e=1&render=no-ubo'},{id:'webgl1',url:'http://127.0.0.1:4173/render-benchmark.html?e2e=1&render=webgl1'}]){
 const view={width:390,height:844};
 const page=await browser.newPage({viewport:view,deviceScaleFactor:2,isMobile:false,hasTouch:false});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.goto(profile.url);await page.waitForFunction(()=>globalThis.__MARS_GAME__?.phase==='home');
  async function click(label){const p=await page.evaluate(label=>{function find(n){if(!n.visible)return;if(n.text===label){const p=n.localToGlobal(new Laya.Point(n.width/2,n.height/2));return{x:p.x/Laya.stage.width,y:p.y/Laya.stage.height};}for(let i=0;i<n.numChildren;i++){const p=find(n.getChildAt(i));if(p)return p;}}return find(Laya.stage);},label);if(!p)throw Error('Missing button '+label);await page.mouse.click(p.x*view.width,p.y*view.height);}
  await click('开始造火箭');
  for(let i=0;i<6;i++){
   await page.waitForFunction(i=>{const g=globalThis.__MARS_GAME__;return g.phase==='building'&&g.current&&!g.current.released&&g.modules.length===i+1;},i,{timeout:20000});
   const y=await page.evaluate(()=>globalThis.__MARS_GAME__.current.node.y/Laya.stage.height);
   await page.mouse.move(view.width/2,y*view.height);await page.mouse.down();await page.waitForTimeout(200);await page.mouse.up();
   await page.waitForFunction(()=>globalThis.__MARS_GAME__.current.released);
  }
  await page.waitForFunction(()=>globalThis.__MARS_GAME__.phase==='launch_ready');await click('点火发射');await page.waitForFunction(()=>globalThis.__MARS_GAME__.phase==='stage1_flight');await page.waitForTimeout(500);
  const timings=await page.evaluate(()=>new Promise(resolve=>{const a=[];let last=null;function next(now){if(last!==null)a.push(now-last);last=now;if(a.length===120){a.sort((a,b)=>a-b);resolve({p95:a[114],median:a[60]});}else requestAnimationFrame(next);}requestAnimationFrame(next);}));
  await page.screenshot({path:`artifacts/${profile.id}-flight.png`});
  report.push({profile,viewport:view,timings,errors,config:await page.evaluate(()=>({ubo:Laya.Config.enableUniformBufferObject,matUbo:Laya.Config.matUseUBO,webgl2:Laya.Config.useWebGL2,canvas:{width:document.querySelector('canvas').width,height:document.querySelector('canvas').height}}))});
 }catch(e){await page.screenshot({path:`artifacts/${profile.id}-failure.png`});report.push({profile,viewport:view,error:e.stack,errors});}await page.close();
}
await browser.close();await fs.writeFile('artifacts/render-benchmark.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
