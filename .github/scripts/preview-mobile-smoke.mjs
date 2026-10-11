import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
const chrome=process.env.CHROME_BIN;
assert.ok(chrome, "Chrome required for real mobile QA");
await mkdir("qa-images",{recursive:true});
const browser=await chromium.launch({executablePath:chrome,headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
  userAgent:"Mozilla/5.0 (Linux; Android 15; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36"});
const errors=[], results=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("response",r=>{if(r.status()>=400&&!r.url().endsWith("/favicon.ico"))errors.push(r.status()+" "+r.url())});
page.on("console",m=>{if(m.type()==="error"&&!m.text().includes("favicon"))errors.push(m.text())});
try {
  await page.goto("http://127.0.0.1:4173/?e2e=1",{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForFunction(()=>globalThis.__MARS_GAME__?.phase==="home",null,{timeout:30000});
  await page.waitForTimeout(450);
  await page.screenshot({path:"qa-images/home-390x844.png"});
  results.push("Home loaded in mobile portrait");
  const checks=await page.evaluate(()=>{
    const g=globalThis.__MARS_GAME__;
    const assets=["home.jpg","hangar.jpg","flight.jpg","logo.png","astronaut.png","panel.png","metal.png","chip.png"];
    return {loaded:assets.map(name=>({name,ok:!!Laya.loader.getRes("art/mission/"+name)})),
      width:Laya.stage.width,height:Laya.stage.height,home:g.homePanel.container?.visible};
  });
  for(const a of checks.loaded)assert.ok(a.ok,"Missing art "+a.name);
  assert.ok(checks.home,"Home panel missing");
  results.push({loadedArt:checks.loaded,screen:[checks.width,checks.height]});

  await page.evaluate(()=>{
    const g=globalThis.__MARS_GAME__,p=g.progressStore.snapshot;
    g.homePanel.show(p,g.createUpgradeOptions(),()=>{},()=>{},true);
  });
  await page.waitForTimeout(130);
  await page.screenshot({path:"qa-images/permanent-upgrades-390x844.png"});
  results.push("Upgrades page rendered in portrait");

  await page.evaluate(()=>{
    const g=globalThis.__MARS_GAME__;
    g.homePanel.hide();g.world.visible=false;g.hud.setVisible(false);
    g.pauseUI?.setActive(false);
    if(g.buildBackdrop)g.buildBackdrop.visible=false;
    g.backdrop.setVisible(true);
  });
  for(const [altitude,expected,name] of [[89,0,"launch-city"],[2000,1,"mountain-sky"],
    [7000,2,"cloud-airplanes"],[18000,3,"stratosphere"],[45000,4,"high-atmosphere"],
    [80000,5,"near-space"],[110000,6,"orbit"]]){
    const state=await page.evaluate(alt=>{
      const g=globalThis.__MARS_GAME__;
      g.backdrop.update(0,0,alt);
      return {band:g.backdrop.band,blend:g.backdrop._upperSky?.alpha,
        baseCommands:g.backdrop.scenery.graphics.cmds?.length||0,
        topCommands:g.backdrop._upperSky?.graphics.cmds?.length||0};
    },altitude);
    assert.equal(state.band,expected,"Wrong scene at "+altitude+"m");
    assert.ok(state.baseCommands>0,"No backdrop at "+altitude+"m");
    if(expected>0&&expected<6)assert.ok(state.blend>=0&&state.blend<=1);
    await page.screenshot({path:"qa-images/"+name+"-"+altitude+"m.png"});
    results.push({scene:name,altitude,...state});
  }
  const physics=await page.evaluate(()=>{
    const g=globalThis.__MARS_GAME__;
    g.phase="stage1_flight";g.runStats={stage1EngineMultiplier:1,stage2EngineMultiplier:1};
    g._ascent=null;g.runAltitudeMeters=0;g.milestone=0;
    for(let i=0;i<300;i++)g.updateRunAltitude(100);
    const first={height:g.runAltitudeMeters,speed:g._ascent.v};
    g.phase="stage_separation";for(let i=0;i<10;i++)g.updateRunAltitude(100);
    g.phase="stage2_flight";for(let i=0;i<220;i++)g.updateRunAltitude(100);
    return {first,second:{height:g.runAltitudeMeters,speed:g._ascent.v}};
  });
  assert.ok(physics.first.height>7000&&physics.first.height<10000,"Expected ~8km after stage 1, got "+physics.first.height);
  assert.ok(physics.first.speed>500,"Stage 1 must accelerate beyond 500m/s");
  assert.ok(physics.second.height>26000&&physics.second.speed>physics.first.speed,
    "Stage 2 must continue accelerating into stratosphere");
  results.push({ascent:physics});
  assert.deepEqual(errors,[],"Browser JS/resource errors: "+errors.join("; "));
  results.push("No runtime/page/resource errors");
  await writeFile("qa-images/report.json",JSON.stringify(results,null,2));
  console.log("Mars preview mobile Chromium QA SUCCESS "+JSON.stringify(results));
} finally {
  await browser.close();
}
