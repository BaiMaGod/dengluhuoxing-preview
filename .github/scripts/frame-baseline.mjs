import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report=[];
for(const view of [{width:390,height:844},{width:375,height:667}]){
 const page=await browser.newPage({viewport:view,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 try{
  await page.goto('http://127.0.0.1:4175/?e2e=1');await page.waitForFunction(()=>globalThis.__MARS_GAME__?.phase==='home');
  async function click(label){const p=await page.evaluate(label=>{function find(n){if(!n.visible)return;if(n.text===label){const p=n.localToGlobal(new Laya.Point(n.width/2,n.height/2));return{x:p.x/Laya.stage.width,y:p.y/Laya.stage.height};}for(let i=0;i<n.numChildren;i++){const p=find(n.getChildAt(i));if(p)return p;}}return find(Laya.stage);},label);if(!p)throw Error('Missing button '+label);await page.touchscreen.tap(p.x*view.width,p.y*view.height);}
  await click('开始造火箭');
  for(let i=0;i<6;i++){
   await page.waitForFunction(i=>{const g=globalThis.__MARS_GAME__;return g.phase==='building'&&g.current&&!g.current.released&&g.modules.length===i+1;},i,{timeout:20000});
   const y=await page.evaluate(()=>globalThis.__MARS_GAME__.current.node.y/Laya.stage.height);
   await page.touchscreen.tap(view.width/2,y*view.height);
   await page.waitForFunction(()=>globalThis.__MARS_GAME__.current.released);
  }
  await page.waitForFunction(()=>globalThis.__MARS_GAME__.phase==='launch_ready');await click('点火发射');await page.waitForFunction(()=>globalThis.__MARS_GAME__.phase==='stage1_flight');await page.waitForTimeout(500);
  const timings=await page.evaluate(()=>new Promise(resolve=>{const a=[];let last=null;function next(now){if(last!==null)a.push(now-last);last=now;if(a.length===120){a.sort((a,b)=>a-b);resolve({p95:a[114],median:a[60]});}else requestAnimationFrame(next);}requestAnimationFrame(next);}));
  report.push({viewport:view,revision:'44cacf6eb13b6d9725a0b34300c3285df20085dd',timings});
 }catch(e){report.push({viewport:view,error:e.stack});}await page.close();
}
await browser.close();await fs.writeFile('artifacts/visual/baseline-frame-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
