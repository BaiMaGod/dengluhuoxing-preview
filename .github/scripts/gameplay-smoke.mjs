import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN,
  headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const base = process.env.SMOKE_URL || 'http://127.0.0.1:4173';
const failures = [];
const report = [];
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', e => failures.push(e.stack || e.message));
page.on('console', m => {
  if (m.type() === 'error' && !m.text().includes('Failed to load resource')) failures.push(m.text());
});
page.on('response', r => {
  if (r.status() >= 400 && new URL(r.url()).pathname !== '/favicon.ico') failures.push(`${r.status()} ${r.url()}`);
});
const phase = () => page.evaluate(() => globalThis.__MARS_GAME__?.phase);
const waitPhase = value => page.waitForFunction(v => globalThis.__MARS_GAME__?.phase === v, value, { timeout: 25000 });
async function point(x, y) {
  const size = await page.evaluate(() => ({ w: Laya.stage.width, h: Laya.stage.height }));
  const viewport = page.viewportSize();
  return { x: x / size.w * viewport.width, y: y / size.h * viewport.height };
}
async function clickLabel(text) {
  const p = await page.evaluate(text => {
    function find(node) {
      if (node.text === text && node.visible) {
        const p = node.localToGlobal(new Laya.Point(node.width / 2, node.height / 2));
        return { x: p.x, y: p.y };
      }
      for (let i = 0; i < node.numChildren; i++) { const p = find(node.getChildAt(i)); if (p) return p; }
    }
    return find(Laya.stage);
  }, text);
  assert.ok(p, `Visible button ${text}`);
  const screen = await point(p.x, p.y);
  await page.mouse.click(screen.x, screen.y);
}
async function drop(index, x) {
  await page.waitForFunction(i => {
    const g = globalThis.__MARS_GAME__;
    return g.phase === 'building' && g.current && !g.current.released && g.modules.length === i + 1;
  }, index, { timeout: 18000 });
  const y = await page.evaluate(() => globalThis.__MARS_GAME__.current.node.y);
  const screen = await point(x, y);
  await page.mouse.move(screen.x, screen.y);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.up();
}
async function build() {
  const x = await page.evaluate(() => Laya.stage.width / 2);
  for (let i = 0; i < 6; i++) await drop(i, x);
  await waitPhase('launch_ready');
  const metrics = await page.evaluate(() => globalThis.__MARS_GAME__.buildMetrics);
  assert.ok(metrics.stability > .95, `Centered tower stability: ${metrics.stability}`);
  report.push({ check: 'physical six-module build', metrics });
}
try {
  await page.addInitScript(() => {
    globalThis.__phaseTrace = [];
    let last = '';
    setInterval(() => {
      const g = globalThis.__MARS_GAME__;
      if (!g) return;
      const key = g.phase + ':' + g.modules.length;
      if (key === last) return;
      last = key;
      globalThis.__phaseTrace.push({ phase:g.phase, modules:g.modules.map(m => ({
        x:m.node.x,y:m.node.y,width:m.node.width,height:m.node.height,released:m.released,
        fixtureScaleX:m.body.shapes[0].scaleX,fixtureScaleY:m.body.shapes[0].scaleY,
        velocity:m.body.linearVelocity })), platformY:g.platformY });
    }, 100);
  });
  await page.goto(`${base}/?e2e=1&debug=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => globalThis.__MARS_GAME__?.phase === 'home', null, { timeout: 15000 });
  await page.screenshot({ path: 'artifacts/home.png' });
  const artResponse = await page.request.get(`${base}/art/mars_home.png`);
  assert.equal(artResponse.status(), 200, 'Illustrated background must be in published Web bundle');
  const flightArt = await page.request.get(`${base}/art/mars_flight.png`);
  assert.equal(flightArt.status(), 200, 'Illustrated flight sky must be bundled');
  report.push({ check:'mission and flight illustrations bundled and fetchable' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForFunction(() => Laya.stage.screenMode === Laya.Stage.SCREEN_NONE);
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'artifacts/home-desktop.png' });
  report.push({ check:'desktop landscape uses upright portrait letterbox' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => Laya.stage.screenMode === Laya.Stage.SCREEN_VERTICAL);
  await page.waitForTimeout(250);
  await clickLabel('开始造火箭');
  await clickLabel('暂停');
  await page.waitForFunction(() => globalThis.__MARS_GAME__?.userPaused === true);
  const frozenPosition = await page.evaluate(() => globalThis.__MARS_GAME__.current.node.y);
  await page.screenshot({ path: 'artifacts/paused-mobile.png' });
  await page.waitForTimeout(320);
  const frozenAfter = await page.evaluate(() => globalThis.__MARS_GAME__.current.node.y);
  assert.equal(frozenPosition, frozenAfter, 'User pause must freeze physical simulation');
  await clickLabel('继续远征');
  await page.waitForFunction(() => globalThis.__MARS_GAME__?.userPaused === false);
  report.push({ check:'manual pause, full freeze and resume' });
  await build();
  await page.screenshot({ path: 'artifacts/build-ready.png' });
  await clickLabel('点火发射');
  await waitPhase('stage1_flight');
  const pausedBefore = await page.evaluate(() => {
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
    document.dispatchEvent(new Event('visibilitychange'));
    return {fuel:globalThis.__MARS_GAME__.flight.fuelRatio, y:globalThis.__MARS_GAME__.modules[0].node.y};
  });
  await page.waitForTimeout(500);
  const pausedAfter = await page.evaluate(() => ({ fuel:globalThis.__MARS_GAME__.flight.fuelRatio,
    y:globalThis.__MARS_GAME__.modules[0].node.y }));
  assert.deepEqual(pausedBefore,pausedAfter,'Hidden game must pause fuel and physics');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  report.push({ check:'background pause freezes fuel and physics' });
  await page.waitForTimeout(1000);
  const flightBounds = await page.evaluate(() => {
    const g = globalThis.__MARS_GAME__;
    return g.modules.map(m => ({ top: m.node.y - m.node.height / 2, bottom: m.node.y + m.node.height / 2,
      visualWidth: m.node.width, colliderWidth: m.body.shapes[0].width }));
  });
  assert.ok(flightBounds.every(b => b.top > 310), 'Flight modules must remain below HUD');
  assert.ok(flightBounds.every(b => Math.abs(b.visualWidth - b.colliderWidth) < .01), 'Visual/collider size mismatch');
  report.push({ check: 'flight layout and colliders', flightBounds });
  await page.screenshot({ path: 'artifacts/stage1.png' });
  const seen = new Set(['stage1_flight']);
  let targetX = 375;
  let pointerDown = false;
  let heldInput = 0;
  let heldInputAfterSeparation = null;
  let heldInputAfterEscape = null;
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => {
      const g = globalThis.__MARS_GAME__;
      const player = g.phase === 'astronaut_flight' ? [g.astronaut.node] :
        g.modules.slice(g.assembly?.activeStartIndex || 0).map(m => m.node);
      return { phase: g.phase, held: g.controlDragging, hp: g.rocketHp, altitude: g.runAltitudeMeters,
        centerX: player.length ? player.reduce((n,m) => n + m.x, 0) / player.length : 375,
        top: Math.min(...player.map(m => m.y - m.height / 2)),
        bottom: Math.max(...player.map(m => m.y + m.height / 2)),
        width: Math.max(...player.map(m => m.width)),
        input: g.phase === 'astronaut_flight' ? g.astronaut.input : g.flight?.currentInput,
        obstacles: g.obstacleManager.obstacles.map(o => ({ x: o.node.x, y: o.node.y })) };
    });
    if (!seen.has(state.phase)) {
      seen.add(state.phase);
      report.push({ check: 'phase', ...state });
      await page.screenshot({ path: `artifacts/${state.phase}.png` });
      if (state.phase === 'stage2_flight') assert.ok(state.held, 'Pointer must remain active after separation');
      if (state.phase === 'astronaut_flight') assert.ok(state.held, 'Pointer must remain active after escape');
      if (state.phase === 'stage2_flight') {
        assert.ok(Math.abs(state.input-heldInput) < .01, 'Held steering survives separation without another pointer move');
        heldInputAfterSeparation = state.input;
        const masks = await page.evaluate(() => globalThis.__MARS_GAME__.modules.slice(0,2).map(m => m.body.shapes[0].filterData.mask));
        assert.deepEqual(masks, [0,0], 'Detached bodies cannot collide with the active rocket');
      }
      if (state.phase === 'astronaut_flight') {
        assert.ok(Math.abs(state.input-heldInput) < .01, 'Held steering survives escape without another pointer move');
        heldInputAfterEscape = state.input;
      }
    }
    if (state.phase === 'result') break;
    if (['stage1_flight', 'stage2_flight', 'astronaut_flight'].includes(state.phase)) {
      if (!pointerDown) {
        const p = await point(375, 1100);
        await page.mouse.move(p.x, p.y); await page.mouse.down(); pointerDown = true;
      }
      const threats = state.obstacles.filter(o => o.y > state.top - 350 && o.y < state.bottom + 40);
      const lanes = [170, 260, 375, 490, 580];
      const score = x => threats.reduce((n,o) => n + Math.max(0, (state.width + 86)/2 + 42 - Math.abs(o.x-x)) *
        (o.y >= state.top - 80 ? 4 : 1), 0) + Math.abs(x-state.centerX) * .08;
      targetX = lanes.sort((a,b) => score(a)-score(b))[0];
      const startX = await page.evaluate(() => globalThis.__MARS_GAME__.controlPointerStartX);
      const distance = state.phase === 'astronaut_flight' ? 110 : 150;
      const input = Math.max(-1, Math.min(1, (targetX-state.centerX)/45));
      heldInput = input;
      const p = await point(startX + input*distance, 1100);
      await page.mouse.move(p.x, p.y);
    }
    await page.waitForTimeout(200);
  }
  if (pointerDown) await page.mouse.up();
  assert.equal(await phase(), 'result', 'Run must reach settlement');
  assert.ok(seen.has('stage2_flight'), 'Run must verify actual stage separation and second-stage ignition');
  assert.ok(seen.has('astronaut_flight'), 'Run must verify astronaut escape');
  report.push({check:'held steering restored across both transitions', heldInputAfterSeparation, heldInputAfterEscape});
  const performance = await page.evaluate(() => globalThis.__MARS_GAME__.performance.snapshot);
  assert.ok(performance?.fps > 0 && performance.p95FrameMs > 0, 'Debug performance sampler records frames');
  assert.ok(performance.maxSimulationSteps <= 15, 'Simulation catch-up remains bounded');
  report.push({check:'render and simulation sample (CI desktop browser)', performance});
  const settlement = await page.evaluate(() => ({ settlement: globalThis.__MARS_GAME__.lastSettlement,
    progress: globalThis.__MARS_GAME__.progressStore.snapshot }));
  assert.ok(settlement.settlement.altitudeMeters > 0);
  assert.ok(settlement.progress.bestAltitudeMeters > 0);
  assert.equal(settlement.progress.firstFlightRewardClaimed, true);
  assert.ok(settlement.progress.metal >= 4 && settlement.progress.chips >= 1);
  report.push({ check: 'settlement persisted', ...settlement });
  const upgradePoint = await page.evaluate(() => {
    const rows = globalThis.__MARS_GAME__.upgradePanel.container;
    for (let i=0;i<rows.numChildren;i++) {
      const row=rows.getChildAt(i);
      if (row.numChildren && row.getChildAt(0)?.text?.startsWith('燃料仓')) {
        const button=row.getChildAt(row.numChildren-1);
        const p=button.localToGlobal(new Laya.Point(button.width/2,button.height/2));
        return {x:p.x,y:p.y};
      }
    }
  });
  assert.ok(upgradePoint, 'Fuel upgrade row is visible');
  const upgradeScreen=await point(upgradePoint.x,upgradePoint.y);
  await page.mouse.click(upgradeScreen.x,upgradeScreen.y);
  assert.equal(await page.evaluate(() => globalThis.__MARS_GAME__.progressStore.snapshot.upgrades.fuel),2,'Actual upgrade click increases permanent floor');
  await page.screenshot({path:'artifacts/upgraded.png'});
  await clickLabel('再来一枚');
  await waitPhase('building');
  assert.equal(await page.evaluate(() => globalThis.__MARS_GAME__.modules.length), 1, 'Replay clears old modules');
  const resetCounts=[];
  for(let i=0;i<10;i++) {
    await page.evaluate(() => globalThis.__MARS_GAME__.resetBuild());
    await page.waitForTimeout(100);
    resetCounts.push(await page.evaluate(() => ({nodes:globalThis.__MARS_GAME__.world.numChildren,
      bodies:Laya.Physics2D.I._rigiBodyList.length, obstacles:globalThis.__MARS_GAME__.obstacleManager.activeCount,
      pickups:globalThis.__MARS_GAME__.pickupManager.activeCount})));
  }
  assert.ok(resetCounts.every(c => JSON.stringify(c)===JSON.stringify(resetCounts[0])), 'Ten resets retain a fixed number of nodes and rigid bodies');
  report.push({check:'ten resets do not accumulate nodes or physics bodies', counts:resetCounts});

  // Real pointer regression: two disconnected stacks on the platform must fail.
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(200);
  assert.ok(await page.evaluate(() => globalThis.__MARS_GAME__.platformY < Laya.stage.height), 'Resize keeps the platform on screen');
  assert.ok(await page.evaluate(() => !globalThis.__MARS_GAME__.homePanel.container),'Resize during building must not reopen the home overlay');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitPhase('home');
  assert.equal(await page.evaluate(() => globalThis.__MARS_GAME__.progressStore.snapshot.upgrades.fuel),2,'Purchased upgrade persists after reload');
  report.push({check:'upgrade through UI persisted after reload'});
  await clickLabel('开始造火箭');
  await drop(0, 230);
  await drop(1, 530);
  await waitPhase('build_failed');
  report.push({ check: 'disconnected modules rejected at 375x667', phase: await phase() });
  await page.screenshot({ path: 'artifacts/disconnected-build.png' });
  await waitPhase('building');
  await build();
  await page.evaluate(() => { globalThis.__MARS_GAME__.modules[5].body.linearVelocity = {x:2000,y:0}; });
  await waitPhase('build_failed');
  assert.ok(await page.evaluate(() => !globalThis.__MARS_GAME__.actionButton), 'A collapsed ready tower cannot launch');
  await page.waitForTimeout(100);
  assert.ok(await page.evaluate(() => !globalThis.__MARS_GAME__.hud.fuel.visible), 'Failure must hide the launch prompt');
  report.push({ check:'ready tower revalidated after physical displacement' });
  await page.screenshot({path:'artifacts/ready-collapse.png'});
  assert.equal(failures.length, 0, failures.join('\n'));
  console.log('Full gameplay regression passed:', JSON.stringify(report));
} finally {
  await page.screenshot({ path: 'artifacts/smoke.png' }).catch(() => {});
  const state = await page.evaluate(() => {
    const g = globalThis.__MARS_GAME__;
    return g ? { phase:g.phase, stage:{width:Laya.stage.width,height:Laya.stage.height},
      modules:g.modules.map(m => ({x:m.node.x,y:m.node.y,rotation:m.body.rotation,released:m.released,
        settled:m.settled,velocity:m.body.linearVelocity})), connected:g.isStructureConnected(),
      stableMs:g.structureStableMs, trace:globalThis.__phaseTrace } : { mounted:false };
  }).catch(e => ({ error: String(e) }));
  await writeFile('artifacts/gameplay-report.json', JSON.stringify({ report, failures, state }, null, 2));
  await browser.close();
}
