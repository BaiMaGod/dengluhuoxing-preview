"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // assets/scripts/platform/PlatformManager.ts
  var BrowserPlatform = class {
    constructor() {
      this.name = "web";
    }
    onVisibilityChange(callback) {
      const doc = globalThis.document;
      if (!doc) return () => {
      };
      const handler = () => callback(!doc.hidden);
      doc.addEventListener("visibilitychange", handler);
      return () => doc.removeEventListener("visibilitychange", handler);
    }
    saveData(key, value) {
      var _a;
      try {
        (_a = globalThis.localStorage) == null ? void 0 : _a.setItem(key, value);
      } catch (e) {
      }
    }
    loadData(key) {
      var _a, _b;
      try {
        return (_b = (_a = globalThis.localStorage) == null ? void 0 : _a.getItem(key)) != null ? _b : null;
      } catch (e) {
        return null;
      }
    }
    vibrate() {
      var _a, _b;
      try {
        (_b = (_a = globalThis.navigator) == null ? void 0 : _a.vibrate) == null ? void 0 : _b.call(_a, 18);
      } catch (e) {
      }
    }
  };
  var MiniGamePlatform = class {
    constructor(name, api) {
      this.name = name;
      this.api = api;
    }
    onVisibilityChange(callback) {
      var _a, _b, _c, _d;
      const hide = () => callback(false), show = () => callback(true);
      (_b = (_a = this.api).onHide) == null ? void 0 : _b.call(_a, hide);
      (_d = (_c = this.api).onShow) == null ? void 0 : _d.call(_c, show);
      return () => {
        var _a2, _b2, _c2, _d2;
        (_b2 = (_a2 = this.api).offHide) == null ? void 0 : _b2.call(_a2, hide);
        (_d2 = (_c2 = this.api).offShow) == null ? void 0 : _d2.call(_c2, show);
      };
    }
    saveData(key, value) {
      try {
        this.api.setStorageSync(key, value);
      } catch (e) {
      }
    }
    loadData(key) {
      try {
        const v = this.api.getStorageSync(key);
        return v == null ? null : String(v);
      } catch (e) {
        return null;
      }
    }
    vibrate(type = "light") {
      try {
        if (this.api.vibrateShort) this.api.vibrateShort({ type });
      } catch (e) {
      }
    }
  };
  var PlatformManager = class {
    static get current() {
      if (!this._current) this._current = this.detect();
      return this._current;
    }
    static detect() {
      const g = globalThis;
      if (g.wx) return new MiniGamePlatform("wechat", g.wx);
      if (g.tt) return new MiniGamePlatform("douyin", g.tt);
      return new BrowserPlatform();
    }
  };
  PlatformManager._current = null;

  // assets/scripts/prototype/PhysicsSimulation.ts
  var configured = false;
  function configurePhysicsCompatibility() {
    const physics = Laya.Physics2D.I;
    if (configured || typeof physics.update === "function") return;
    configured = true;
    for (const axis of ["X", "Y"]) {
      Object.defineProperty(Laya.Physics2DShapeBase.prototype, `scale${axis}`, {
        configurable: true,
        get() {
          var _a;
          let scale = 1;
          let node = (_a = this._body) == null ? void 0 : _a.owner;
          while (node && node !== Laya.stage) {
            scale *= axis === "X" ? node.scaleX : node.scaleY;
            node = node.parent;
          }
          return scale;
        }
      });
    }
  }
  var positionScratch;
  var vectorScratch;
  var localScratch;
  function designPosition(node) {
    positionScratch = positionScratch || new Laya.Point();
    positionScratch.setTo(node.pivotX, node.pivotY);
    return node.localToGlobal(positionScratch);
  }
  function syncBodyToNode(body) {
    const physics = Laya.Physics2D.I;
    const node = body.owner;
    const point = designPosition(node);
    let rotation = node.rotation;
    let parent = node.parent;
    while (parent instanceof Laya.Sprite && parent !== Laya.stage) {
      rotation += parent.rotation;
      parent = parent.parent;
    }
    physics._factory.set_RigibBody_Transform(
      body.getBox2DBody(),
      point.x,
      point.y,
      rotation * Math.PI / 180
    );
    if (typeof physics.update !== "function") {
      body.getWorldPoint = (x, y) => node.localToGlobal(new Laya.Point(node.pivotX + x, node.pivotY + y));
    }
  }
  function stepPhysics(deltaSeconds) {
    const physics = Laya.Physics2D.I;
    if (typeof physics.update === "function") {
      physics.update(deltaSeconds);
      return;
    }
    const list = physics._rigiBodyList;
    for (let i = 0; i < list.length; i++) {
      const body = list.elements[i];
      if (body.type !== "dynamic") syncBodyToNode(body);
    }
    physics._factory.update(deltaSeconds);
    for (let i = 0; i < list.length; i++) {
      const body = list.elements[i];
      if (body.type === "static") continue;
      const raw = body.getBox2DBody();
      if (!raw || !physics._factory.get_rigidBody_IsAwake(raw)) continue;
      const point = vectorScratch = vectorScratch || new Laya.Vector2();
      physics._factory.get_RigidBody_Position(raw, point);
      const node = body.owner;
      const local = localScratch = localScratch || new Laya.Point();
      local.setTo(point.x, point.y);
      if (node.parent instanceof Laya.Sprite) node.parent.globalToLocal(local);
      node.pos(local.x, local.y);
      let parentRotation = 0;
      let parent = node.parent;
      while (parent instanceof Laya.Sprite && parent !== Laya.stage) {
        parentRotation += parent.rotation;
        parent = parent.parent;
      }
      node.rotation = physics._factory.get_RigidBody_Angle(raw) * 180 / Math.PI - parentRotation;
    }
  }

  // assets/scripts/prototype/GameAudio.ts
  var GameAudio = class {
    static get isMuted() {
      if (this.muted === null) this.muted = PlatformManager.current.loadData("mars.audio.muted") === "1";
      return this.muted;
    }
    static toggle() {
      this.muted = !this.isMuted;
      PlatformManager.current.saveData("mars.audio.muted", this.muted ? "1" : "0");
      if (!this.muted) {
        this.unlock();
        this.play("pickup");
      }
    }
    static unlock() {
      var _a, _b, _c, _d;
      if (this.isMuted) return;
      const g = globalThis, AudioContext = g.AudioContext || g.webkitAudioContext;
      if (!this.context && AudioContext) {
        try {
          this.context = new AudioContext();
        } catch (e) {
          return;
        }
      }
      (_d = (_c = (_b = (_a = this.context) == null ? void 0 : _a.resume) == null ? void 0 : _b.call(_a)) == null ? void 0 : _c.catch) == null ? void 0 : _d.call(_c, () => {
      });
    }
    static suspend() {
      var _a, _b, _c, _d;
      (_d = (_c = (_b = (_a = this.context) == null ? void 0 : _a.suspend) == null ? void 0 : _b.call(_a)) == null ? void 0 : _c.catch) == null ? void 0 : _d.call(_c, () => {
      });
    }
    static note(ctx, at, frequency, duration, volume, wave = "sine", endFrequency = frequency) {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(frequency, at);
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), at + duration);
      gain.gain.setValueAtTime(1e-4, at);
      gain.gain.exponentialRampToValueAtTime(Math.max(2e-4, volume), at + Math.min(0.018, duration / 5));
      gain.gain.exponentialRampToValueAtTime(1e-4, at + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
      osc.start(at);
      osc.stop(at + duration + 0.01);
    }
    static play(sound) {
      const ctx = this.context;
      if (this.isMuted || !ctx || ctx.state !== "running") return;
      const now = Date.now();
      const cooldown = sound === "pickup" ? 105 : sound === "hit" ? 165 : 75;
      if (now - (this.lastPlayed.get(sound) || 0) < cooldown) return;
      this.lastPlayed.set(sound, now);
      const t = ctx.currentTime + 5e-3;
      try {
        switch (sound) {
          case "land":
            this.note(ctx, t, 228, 0.135, 0.065, "triangle", 115);
            this.note(ctx, t + 0.027, 392, 0.105, 0.021, "sine", 250);
            break;
          case "ignite":
            this.note(ctx, t, 110, 0.48, 0.065, "sawtooth", 430);
            this.note(ctx, t + 0.085, 215, 0.38, 0.035, "triangle", 585);
            this.note(ctx, t + 0.28, 760, 0.16, 0.02, "sine", 950);
            break;
          case "separate":
            this.note(ctx, t, 420, 0.2, 0.065, "triangle", 155);
            this.note(ctx, t + 0.13, 260, 0.32, 0.045, "sawtooth", 82);
            break;
          case "hit":
            this.note(ctx, t, 205, 0.28, 0.09, "sawtooth", 55);
            this.note(ctx, t + 0.04, 97, 0.23, 0.05, "triangle", 48);
            break;
          case "pickup":
            this.note(ctx, t, 650, 0.16, 0.047, "sine", 850);
            this.note(ctx, t + 0.075, 988, 0.23, 0.038, "sine", 1175);
            break;
          case "record":
            [523, 659, 784, 1047, 1318].forEach((hz, i) => {
              this.note(ctx, t + i * 0.088, hz, 0.26, 0.037, "sine", hz * 1.04);
            });
            break;
          case "upgrade":
            [440, 660, 880, 1320].forEach((hz, i) => {
              this.note(ctx, t + i * 0.075, hz, 0.23, 0.041, "triangle", hz * 1.08);
            });
            break;
        }
      } catch (e) {
      }
    }
  };
  GameAudio.context = null;
  GameAudio.muted = null;
  GameAudio.lastPlayed = /* @__PURE__ */ new Map();

  // assets/scripts/prototype/PauseOverlay.ts
  var PauseOverlay = class {
    constructor(root, onToggle) {
      this.root = root;
      this.onToggle = onToggle;
      this.button = new Laya.Sprite();
      this.modal = null;
      this.active = false;
      this.paused = false;
      this.button.name = "mission_pause_button";
      this.button.size(120, 60);
      this.button.mouseEnabled = true;
      this.button.graphics.drawRect(0, 0, 120, 60, "#16304BCC", "#83D6E9", 2);
      this.button.graphics.drawRect(9, 8, 102, 4, "#FFFFFF55");
      this.label(this.button, "暂停", 0, 0, 120, 60, 26, "#EFF9FF", true);
      this.button.on(Laya.Event.CLICK, this, () => {
        if (this.active && !this.paused) this.onToggle(true);
      });
      this.root.addChild(this.button);
      this.button.visible = false;
      this.layout();
    }
    get isPaused() {
      return this.paused;
    }
    get isActive() {
      return this.active;
    }
    setActive(value) {
      this.active = value;
      this.button.visible = value && !this.paused;
    }
    setPaused(value) {
      var _a;
      if (this.paused === value) return;
      this.paused = value;
      this.button.visible = this.active && !value;
      if (value) this.drawModal();
      else {
        (_a = this.modal) == null ? void 0 : _a.destroy(true);
        this.modal = null;
      }
    }
    layout() {
      this.button.pos(Laya.stage.width - 137, 16);
      if (this.paused) this.drawModal();
    }
    drawModal() {
      var _a;
      (_a = this.modal) == null ? void 0 : _a.destroy(true);
      const w = Laya.stage.width, h = Laya.stage.height;
      const overlay = this.modal = new Laya.Sprite();
      overlay.name = "pause_overlay";
      overlay.size(w, h);
      overlay.mouseEnabled = true;
      overlay.graphics.drawRect(0, 0, w, h, "#03091BCB");
      this.root.addChild(overlay);
      const cw = Math.min(594, w - 48), ch = 520;
      const x = (w - cw) / 2, y = (h - ch) / 2;
      overlay.graphics.drawRect(x + 9, y + 12, cw, ch, "#050B18AA");
      overlay.graphics.drawRect(x, y, cw, ch, "#152946", "#7BCFDF", 4);
      overlay.graphics.drawRect(x + 11, y + 11, cw - 22, 8, "#6AC9E1");
      overlay.graphics.drawRect(x + 30, y + 137, cw - 60, 2, "#567B97");
      this.label(overlay, "远征已暂停", x + 22, y + 44, cw - 44, 68, 45, "#FFF2D9", true);
      this.label(overlay, "火箭燃料和物理模拟均已冻结", x + 18, y + 154, cw - 36, 52, 25, "#B9DDE9", false);
      this.label(overlay, "可随时继续当前火箭，不会丢失进度", x + 18, y + 205, cw - 36, 52, 23, "#94B7CD", false);
      const resume = this.makeButton("继续远征", 360, 87, "#2584BF");
      resume.pos((w - 360) / 2, y + 310);
      resume.on(Laya.Event.CLICK, this, () => this.onToggle(false));
      overlay.addChild(resume);
      const sound = this.makeButton(GameAudio.isMuted ? "打开音效" : "关闭音效", 280, 58, "#26445C");
      sound.pos((w - 280) / 2, y + 422);
      sound.on(Laya.Event.CLICK, this, () => {
        GameAudio.toggle();
        this.drawModal();
      });
      overlay.addChild(sound);
    }
    makeButton(title, w, h, color) {
      const node = new Laya.Sprite();
      node.size(w, h);
      node.mouseEnabled = true;
      node.graphics.drawRect(5, 7, w - 10, h - 7, "#071425");
      node.graphics.drawRect(0, 0, w, h - 5, "#142C47", "#9BE7F6", 2);
      node.graphics.drawRect(6, 6, w - 12, h - 18, color);
      node.graphics.drawRect(16, 11, w - 32, 4, "#FFFFFF45");
      this.label(node, title, 0, 0, w, h - 4, h > 70 ? 32 : 25, "#FFFFFF", true);
      return node;
    }
    label(root, text, x, y, w, h, size, color, bold) {
      const label = new Laya.Text();
      label.text = text;
      label.color = color;
      label.bold = bold;
      label.fontSize = size;
      label.align = "center";
      label.valign = "middle";
      label.size(w, h);
      label.pos(x, y);
      root.addChild(label);
    }
  };

  // assets/scripts/prototype/FlightFeedback.ts
  var FlightFeedback = class {
    constructor(root) {
      this.root = root;
      this.labels = [];
      this.sparks = [];
      this.textPool = [];
      this.sparkPool = [];
      this.serial = 0;
    }
    show(x, y, message, color = "#FFE7AE", tier = "small") {
      if (this.labels.length >= 12) this.recycleText(this.labels.shift().node);
      const text = this.textPool.pop() || new Laya.Text();
      const font = tier === "major" ? 42 : tier === "medium" ? 33 : 28;
      text.text = message;
      text.fontSize = font;
      text.bold = true;
      text.color = color;
      text.stroke = 2;
      text.strokeColor = "#102842";
      text.align = "center";
      text.valign = "middle";
      text.size(380, 64).pivot(190, 32).pos(x, y);
      text.alpha = 1;
      text.visible = true;
      this.root.addChild(text);
      this.labels.push({ node: text, age: 0, y, duration: tier === "major" ? 1250 : 850 });
      this.burst(x, y + 18, color, tier);
    }
    burst(x, y, color, tier = "medium") {
      const count = tier === "major" ? 15 : tier === "medium" ? 9 : 5;
      const radius = tier === "major" ? 11 : tier === "medium" ? 7 : 5;
      const duration = tier === "major" ? 680 : 500;
      for (let i = 0; i < count; i++) {
        if (this.sparks.length >= 48) this.recycleSpark(this.sparks.shift().node);
        const sprite = this.sparkPool.pop() || new Laya.Sprite();
        sprite.graphics.clear();
        sprite.graphics.drawCircle(0, 0, radius * (0.65 + i % 4 * 0.13), color);
        sprite.graphics.drawCircle(-1, -1, Math.max(1, radius * 0.28), "#FFFFFF");
        const angle = i / count * Math.PI * 2 + this.serial % 7 * 0.08;
        const speed = (tier === "major" ? 0.25 : 0.17) * (0.75 + i % 3 * 0.2);
        sprite.alpha = 1;
        sprite.visible = true;
        sprite.scale(1, 1);
        sprite.pos(x, y);
        this.root.addChild(sprite);
        this.sparks.push({ node: sprite, age: 0, lifetime: duration + i % 3 * 70, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 0.05, x, y });
      }
      this.serial++;
    }
    update(dt) {
      for (let i = this.labels.length - 1; i >= 0; i--) {
        const item = this.labels[i];
        item.age += dt;
        const t = Math.min(1, item.age / item.duration);
        item.node.y = item.y - 64 * (1 - Math.pow(1 - t, 2));
        item.node.scale(1 + 0.08 * (1 - t), 1 + 0.08 * (1 - t));
        item.node.alpha = t < 0.64 ? 1 : Math.max(0, (1 - t) / 0.36);
        if (t >= 1) {
          this.recycleText(item.node);
          this.labels.splice(i, 1);
        }
      }
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const item = this.sparks[i];
        item.age += dt;
        const t = Math.min(1, item.age / item.lifetime);
        item.node.pos(item.x + item.vx * item.age, item.y + item.vy * item.age + 2e-4 * item.age * item.age);
        item.node.alpha = Math.max(0, 1 - t * t);
        const scale = Math.max(0.12, 1 - t * 0.8);
        item.node.scale(scale, scale);
        if (t >= 1) {
          this.recycleSpark(item.node);
          this.sparks.splice(i, 1);
        }
      }
    }
    clear() {
      for (const item of this.labels) this.recycleText(item.node);
      this.labels.length = 0;
      for (const item of this.sparks) this.recycleSpark(item.node);
      this.sparks.length = 0;
    }
    recycleText(node) {
      node.removeSelf();
      node.visible = false;
      if (this.textPool.length < 12) this.textPool.push(node);
      else node.destroy(true);
    }
    recycleSpark(node) {
      node.removeSelf();
      node.visible = false;
      if (this.sparkPool.length < 48) this.sparkPool.push(node);
      else node.destroy(true);
    }
  };

  // assets/scripts/prototype/PerformanceMonitor.ts
  var PerformanceMonitor = class {
    constructor(root, enabled) {
      this.enabled = enabled;
      this.frames = [];
      this.elapsed = 0;
      this.maxSteps = 0;
      this.snapshot = null;
      this.label = enabled ? new Laya.Text() : null;
      if (this.label) {
        this.label.fontSize = 18;
        this.label.color = "#B2F0D1";
        this.label.size(700, 55);
        root.addChild(this.label);
      }
    }
    record(delta, steps, counts) {
      if (!this.enabled) return;
      if (delta > 0 && delta < 2e3) {
        this.frames.push(delta);
        if (this.frames.length > 120) this.frames.shift();
      }
      this.elapsed += Math.max(0, delta);
      this.maxSteps = Math.max(this.maxSteps, steps);
      if (this.elapsed < 1e3 || !this.frames.length) return;
      this.elapsed = 0;
      const sorted = this.frames.slice().sort((a, b) => a - b);
      const mean = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
      this.snapshot = __spreadProps(__spreadValues({}, counts), {
        fps: Math.round(1e3 / mean),
        p95FrameMs: Math.round(sorted[Math.floor((sorted.length - 1) * 0.95)] * 10) / 10,
        simulationSteps: steps,
        maxSimulationSteps: this.maxSteps
      });
      if (this.label) {
        this.label.pos(18, Laya.stage.height - 65);
        this.label.text = `FPS ${this.snapshot.fps} · P95 ${this.snapshot.p95FrameMs}ms · 刚体 ${counts.bodies}
障碍 ${counts.obstacles} · 资源 ${counts.pickups} · 补步 ${this.maxSteps}`;
      }
    }
  };

  // assets/scripts/config/GameConfig.ts
  var GameConfig = {
    designWidth: 750,
    designHeight: 1334,
    platformWidth: 520,
    platformHeight: 36,
    platformBottom: 120,
    spawnGap: 230,
    settleMs: 550,
    nextModuleDelayMs: 220,
    restartDelayMs: 1100,
    maxSafeTilt: 58,
    velocitySettleThreshold: 5,
    angularSettleThreshold: 6,
    dragMargin: 70,
    launchDelayMs: 480,
    verticalFlightSpeed: 92,
    maxHorizontalSpeed: 96,
    steeringResponseMs: 420,
    stabilityDriftSpeed: 28,
    flightControlDragDistance: 150,
    flightEdgeMargin: 125,
    flightAnchorY: 760,
    flightModuleScale: 0.64,
    stage1FuelSeconds: 30,
    stage2FuelSeconds: 22,
    stage2SpeedMultiplier: 1.18,
    stageSeparationMs: 1e3,
    stage2IgnitionBoostMs: 1500,
    stage2IgnitionBoostMultiplier: 1.2,
    rocketMaxHp: 3,
    damageCooldownMs: 600,
    obstacleWidth: 86,
    obstacleHeight: 66,
    obstacleSpawnY: -80,
    obstacleStage1SpawnMs: 3400,
    obstacleStage2SpawnMs: 2200,
    obstacleAstronautSpawnMs: 1800,
    obstacleStage1Speed: 112,
    obstacleStage2Speed: 145,
    obstacleAstronautSpeed: 165,
    pickupSize: 58,
    pickupSpawnY: -80,
    pickupStage1SpawnMs: 2450,
    pickupStage2SpawnMs: 2150,
    pickupAstronautSpawnMs: 1900,
    pickupStage1Speed: 102,
    pickupStage2Speed: 132,
    pickupAstronautSpeed: 152,
    stage1FuelPickupRatio: 0.2,
    stage2FuelPickupRatio: 0.18,
    suitEnergyPickupRatio: 0.25,
    suitEnergyRestoreSeconds: 5,
    maxBuildFuelPenalty: 0.12,
    milestoneStepMeters: 500,
    routeWaveMs: 5400,
    routePickupGapMs: 700,
    pickupWeights: {
      stage1: { supply: 0.2, metal: 0.75, chip: 0.05 },
      stage2: { supply: 0.26, metal: 0.44, chip: 0.3 },
      astronaut: { supply: 0.25, metal: 0.35, chip: 0.4 }
    },
    stage1AltitudeMetersPerSecond: 16,
    stageSeparationAltitudeMetersPerSecond: 8,
    stage2AltitudeMetersPerSecond: 20,
    astronautAltitudeMetersPerSecond: 12,
    escapeTransitionMs: 700,
    astronautEnergySeconds: 20,
    astronautObstacleEnergyDamage: 0.25,
    astronautMaxHorizontalSpeed: 155,
    astronautSteeringResponseMs: 190,
    astronautControlDragDistance: 110,
    astronautEdgeMargin: 55,
    modules: [
      { kind: "stage1_engine", label: "一级发动机", width: 220, height: 104, color: "#E95D4E", density: 1.25 },
      { kind: "stage1_tank", label: "一级燃料仓", width: 190, height: 182, color: "#F0B64D", density: 1.15 },
      { kind: "stage2_engine", label: "二级发动机", width: 188, height: 92, color: "#4B9BE8", density: 1.1 },
      { kind: "stage2_tank", label: "二级燃料仓", width: 168, height: 160, color: "#52C7B8", density: 1 },
      { kind: "escape", label: "逃生舱", width: 142, height: 100, color: "#B68BE8", density: 0.72 },
      { kind: "cockpit", label: "驾驶舱", width: 126, height: 90, color: "#EDEFF4", density: 0.62 }
    ]
  };

  // assets/scripts/prototype/FlightRoutes.ts
  function rollRoutePickup(mode, random) {
    const weights = GameConfig.pickupWeights[mode];
    if (random < weights.supply) return mode === "astronaut" ? "suit_energy" : "fuel";
    return random < weights.supply + weights.metal ? "metal" : "chip";
  }
  function createRouteWave(mode, width, index, random) {
    const lanes = [160, width / 2, width - 160];
    const safeIndex = index === 0 ? 1 : Math.min(2, Math.floor(random() * 3));
    const safeX = lanes[safeIndex];
    const others = lanes.filter((_, i) => i !== safeIndex);
    const pattern = index % 3;
    const obstacleXs = index === 0 ? [] : pattern === 2 ? others : [others[index % 2]];
    const type = index === 0 ? mode === "astronaut" ? "suit_energy" : "fuel" : pattern === 1 ? "chip" : rollRoutePickup(mode, random());
    return { safeX, obstacleXs, pickups: [0, 1, 2].map((i) => ({
      x: safeX,
      type: i === 1 ? type : "metal",
      delayMs: i * GameConfig.routePickupGapMs
    })) };
  }
  var FlightRoutes = class {
    constructor(spawnObstacle, spawnPickup) {
      this.spawnObstacle = spawnObstacle;
      this.spawnPickup = spawnPickup;
      this.mode = null;
      this.elapsedMs = 0;
      this.wave = 0;
      this.pending = [];
      this.seed = 1;
    }
    setSeed(value) {
      this.seed = value >>> 0;
    }
    setMode(mode) {
      this.mode = mode;
      this.elapsedMs = 0;
      this.wave = 0;
      this.pending.length = 0;
      if (mode) this.emitWave();
    }
    update(dt) {
      if (!this.mode) return;
      for (let i = this.pending.length - 1; i >= 0; i--) {
        this.pending[i].delayMs -= dt;
        if (this.pending[i].delayMs <= 0) {
          const pickup = this.pending.splice(i, 1)[0];
          this.spawnPickup(pickup.x, pickup.type);
        }
      }
      this.elapsedMs += dt;
      const interval = this.mode === "stage1" ? GameConfig.routeWaveMs : this.mode === "stage2" ? 4800 : 4200;
      if (this.elapsedMs >= interval) {
        this.elapsedMs -= interval;
        this.emitWave();
      }
    }
    emitWave() {
      const wave = createRouteWave(this.mode, Laya.stage.width, this.wave++, () => this.random());
      for (const x of wave.obstacleXs) this.spawnObstacle(x);
      this.pending.push(...wave.pickups);
    }
    random() {
      this.seed = Math.imul(this.seed, 1664525) + 1013904223 >>> 0;
      return this.seed / 4294967296;
    }
  };

  // assets/scripts/progression/ModuleRoller.ts
  var ModuleRoller = class {
    static roll(kind, progress) {
      const key = this.getUpgradeKey(
        kind
      );
      const baseLevel = progress.upgrades[key];
      const random = Math.random();
      const bonusLevel = random < 0.03 ? 2 : random < 0.2 ? 1 : 0;
      return {
        baseLevel,
        level: baseLevel + bonusLevel,
        bonusLevel
      };
    }
    static getUpgradeKey(kind) {
      if (kind === "stage1_engine" || kind === "stage2_engine") {
        return "engine";
      }
      if (kind === "stage1_tank" || kind === "stage2_tank") {
        return "fuel";
      }
      if (kind === "cockpit") {
        return "cockpit";
      }
      return "escape";
    }
  };

  // assets/scripts/progression/PlayerProgress.ts
  var SAVE_KEY = "dengluhuoxing.progress.v1";
  var MAX_LEVEL = 5;
  var DEFAULT_PROGRESS = {
    marsCoins: 0,
    metal: 0,
    chips: 0,
    bestAltitudeMeters: 0,
    firstFlightRewardClaimed: false,
    upgrades: {
      engine: 1,
      fuel: 1,
      cockpit: 1,
      escape: 1
    }
  };
  var BASE_COSTS = {
    engine: {
      marsCoins: 100,
      metal: 4,
      chips: 1
    },
    fuel: {
      marsCoins: 90,
      metal: 4,
      chips: 1
    },
    cockpit: {
      marsCoins: 110,
      metal: 3,
      chips: 1
    },
    escape: {
      marsCoins: 90,
      metal: 3,
      chips: 1
    }
  };
  var PlayerProgressStore = class {
    constructor() {
      this.progress = this.load();
    }
    get snapshot() {
      return {
        marsCoins: this.progress.marsCoins,
        metal: this.progress.metal,
        chips: this.progress.chips,
        bestAltitudeMeters: this.progress.bestAltitudeMeters,
        firstFlightRewardClaimed: this.progress.firstFlightRewardClaimed,
        upgrades: __spreadValues({}, this.progress.upgrades)
      };
    }
    get maxLevel() {
      return MAX_LEVEL;
    }
    getUpgradeCost(key) {
      const level = this.progress.upgrades[key];
      if (level >= MAX_LEVEL) {
        return {
          marsCoins: 0,
          metal: 0,
          chips: 0
        };
      }
      const base = BASE_COSTS[key];
      const multiplier = Math.pow(
        1.6,
        level - 1
      );
      return {
        marsCoins: Math.ceil(
          base.marsCoins * multiplier / 10
        ) * 10,
        metal: Math.ceil(
          base.metal * multiplier
        ),
        chips: Math.ceil(
          base.chips * multiplier
        )
      };
    }
    canUpgrade(key) {
      const level = this.progress.upgrades[key];
      if (level >= MAX_LEVEL) {
        return false;
      }
      const cost = this.getUpgradeCost(key);
      return this.progress.marsCoins >= cost.marsCoins && this.progress.metal >= cost.metal && this.progress.chips >= cost.chips;
    }
    tryUpgrade(key) {
      if (!this.canUpgrade(key)) {
        return false;
      }
      const cost = this.getUpgradeCost(key);
      this.progress.marsCoins -= cost.marsCoins;
      this.progress.metal -= cost.metal;
      this.progress.chips -= cost.chips;
      this.progress.upgrades[key] += 1;
      this.save();
      return true;
    }
    settleRun(altitudeMeters, metalEarned, chipsEarned) {
      const altitude = Math.max(
        0,
        Math.floor(
          altitudeMeters
        )
      );
      metalEarned = this.safeInt(metalEarned, 0);
      chipsEarned = this.safeInt(chipsEarned, 0);
      if (!this.progress.firstFlightRewardClaimed && altitude >= 200) {
        metalEarned = Math.max(4, metalEarned);
        chipsEarned = Math.max(1, chipsEarned);
        this.progress.firstFlightRewardClaimed = true;
      }
      const newRecord = altitude > this.progress.bestAltitudeMeters;
      if (newRecord) {
        this.progress.bestAltitudeMeters = altitude;
      }
      const marsCoinsEarned = 40 + Math.floor(
        altitude / 10
      ) + (newRecord ? 30 : 0);
      this.progress.marsCoins += marsCoinsEarned;
      this.progress.metal += Math.max(
        0,
        Math.floor(
          metalEarned
        )
      );
      this.progress.chips += Math.max(
        0,
        Math.floor(
          chipsEarned
        )
      );
      this.save();
      return {
        altitudeMeters: altitude,
        newRecord,
        marsCoinsEarned,
        metalEarned: Math.max(
          0,
          Math.floor(
            metalEarned
          )
        ),
        chipsEarned: Math.max(
          0,
          Math.floor(
            chipsEarned
          )
        )
      };
    }
    load() {
      var _a, _b, _c, _d;
      const raw = PlatformManager.current.loadData(SAVE_KEY);
      if (!raw) {
        return this.cloneDefault();
      }
      try {
        const parsed = JSON.parse(raw);
        return {
          marsCoins: this.safeInt(
            parsed.marsCoins,
            0
          ),
          metal: this.safeInt(
            parsed.metal,
            0
          ),
          chips: this.safeInt(
            parsed.chips,
            0
          ),
          bestAltitudeMeters: this.safeInt(
            parsed.bestAltitudeMeters,
            0
          ),
          firstFlightRewardClaimed: parsed.firstFlightRewardClaimed === true || this.safeInt(parsed.bestAltitudeMeters, 0) >= 200,
          upgrades: {
            engine: this.safeLevel(
              (_a = parsed.upgrades) == null ? void 0 : _a.engine
            ),
            fuel: this.safeLevel(
              (_b = parsed.upgrades) == null ? void 0 : _b.fuel
            ),
            cockpit: this.safeLevel(
              (_c = parsed.upgrades) == null ? void 0 : _c.cockpit
            ),
            escape: this.safeLevel(
              (_d = parsed.upgrades) == null ? void 0 : _d.escape
            )
          }
        };
      } catch (e) {
        return this.cloneDefault();
      }
    }
    save() {
      PlatformManager.current.saveData(
        SAVE_KEY,
        JSON.stringify(
          this.progress
        )
      );
    }
    cloneDefault() {
      return {
        marsCoins: DEFAULT_PROGRESS.marsCoins,
        metal: DEFAULT_PROGRESS.metal,
        chips: DEFAULT_PROGRESS.chips,
        bestAltitudeMeters: DEFAULT_PROGRESS.bestAltitudeMeters,
        firstFlightRewardClaimed: false,
        upgrades: __spreadValues({}, DEFAULT_PROGRESS.upgrades)
      };
    }
    safeLevel(value) {
      return Math.max(
        1,
        Math.min(
          MAX_LEVEL,
          this.safeInt(
            value,
            1
          )
        )
      );
    }
    safeInt(value, fallback) {
      return typeof value === "number" && Number.isFinite(value) ? Math.max(
        0,
        Math.floor(value)
      ) : fallback;
    }
  };

  // assets/scripts/progression/RunRocketStats.ts
  function createRunRocketStats(rolls) {
    const level = (kind) => {
      var _a, _b;
      return Math.max(
        1,
        (_b = (_a = rolls[kind]) == null ? void 0 : _a.level) != null ? _b : 1
      );
    };
    const stage1EngineLevel = level("stage1_engine");
    const stage1FuelLevel = level("stage1_tank");
    const stage2EngineLevel = level("stage2_engine");
    const stage2FuelLevel = level("stage2_tank");
    const cockpitLevel = level("cockpit");
    const escapeLevel = level("escape");
    return {
      stage1EngineLevel,
      stage1FuelLevel,
      stage2EngineLevel,
      stage2FuelLevel,
      cockpitLevel,
      escapeLevel,
      stage1EngineMultiplier: 1 + (stage1EngineLevel - 1) * 0.12,
      stage1FuelMultiplier: 1 + (stage1FuelLevel - 1) * 0.14,
      stage2EngineMultiplier: 1 + (stage2EngineLevel - 1) * 0.12,
      stage2FuelMultiplier: 1 + (stage2FuelLevel - 1) * 0.14,
      cockpitControlMultiplier: 1 + (cockpitLevel - 1) * 0.1,
      escapeEnergyMultiplier: 1 + (escapeLevel - 1) * 0.12
    };
  }

  // assets/scripts/prototype/GameplayArt.ts
  var GameplayArt = class {
    static async preload() {
      await Promise.all(["stage1_engine","stage1_tank","stage2_engine","stage2_tank","escape","cockpit","astronaut","asteroid","fuel","metal","chip","suit_energy","hud_panel"].map(async name => {
        const url = `art/kit/${name}.png`;
        try { await Laya.loader.load(url); } catch(e) { console.warn("[MarsArt] texture preload failed:",url,e); }
      }));
    }
    static paint(g, name, w, h) {
      const texture = Laya.loader.getRes(`art/kit/${name}.png`);
      if (!texture) return false;
      g.clear();
      g.drawTexture(texture, 0, 0, w, h);
      return true;
    }
    static module(g, kind, w, h, lucky = false) {
      if (GameplayArt.paint(g, kind, w, h)) {
        if(lucky) g.drawCircle(w*.89, h*.17, Math.min(w,h)*.095,"#FFF1A3","#E9A839",2);
        return;
      }
      g.clear();
      const colors = {
        stage1_engine: "#F48258",
        stage1_tank: "#F6CA65",
        stage2_engine: "#699CEC",
        stage2_tank: "#55C8BC",
        escape: "#B99BEA",
        cockpit: "#EDF5FF"
      };
      const color = colors[kind], edge = lucky ? "#FFE890" : "#304B70";
      const r = Math.min(w * 0.08, h * 0.16);
      g.drawRect(r, 0, w - 2 * r, h, color);
      g.drawRect(0, r, w, h - 2 * r, color);
      for (const x of [r, w - r]) for (const y of [r, h - r]) g.drawCircle(x, y, r, color);
      g.drawRect(r, 0, w - 2 * r, 5, edge);
      g.drawRect(r, h - 5, w - 2 * r, 5, edge);
      g.drawRect(5, r, w * 0.08, h - 2 * r, "#FFFFFF55");
      g.drawRect(w * 0.86, r, w * 0.08, h - 2 * r, "#15305033");
      g.drawRect(0, h * 0.12, w, h * 0.055, "#E0EDFF");
      g.drawRect(0, h * 0.83, w, h * 0.055, "#42658B");
      if (kind.endsWith("engine")) {
        g.drawRect(w * 0.25, h * 0.27, w * 0.5, h * 0.42, "#315572", "#A4CFEA", 2);
        g.drawPoly(0, 0, [w * 0.18, h * 0.8, w * 0.33, h * 0.66, w * 0.67, h * 0.66, w * 0.82, h * 0.8], "#254863");
        g.drawRect(w * 0.28, h * 0.78, w * 0.44, h * 0.16, "#456B86", "#B0DCEF", 2);
        for (const x of [0.36, 0.5, 0.64]) g.drawRect(w * x - 2, h * 0.82, 4, h * 0.08, "#91BACD");
      } else if (kind === "cockpit") {
        g.drawCircle(w * 0.5, h * 0.48, h * 0.3, "#284D71", "#9BDDF2", 3);
        g.drawCircle(w * 0.5, h * 0.48, h * 0.22, "#7CCEE3");
        g.drawCircle(w * 0.42, h * 0.4, h * 0.07, "#DBF8FF");
        g.drawRect(w * 0.34, h * 0.75, w * 0.32, h * 0.07, "#EF936D");
      } else if (kind === "escape") {
        g.drawCircle(w * 0.5, h * 0.45, h * 0.23, "#E7DFFF", "#8058B1", 2);
        g.drawPoly(0, 0, [w * 0.5, h * 0.27, w * 0.38, h * 0.58, w * 0.62, h * 0.58], "#8861BB");
        g.drawRect(w * 0.4, h * 0.59, w * 0.2, h * 0.06, "#7953A6");
      } else {
        g.drawRect(w * 0.27, h * 0.25, w * 0.46, h * 0.44, "#F4FCFF", "#56839C", 2);
        for (let i = 0; i < 3; i++) g.drawRect(w * 0.33, h * (0.32 + i * 0.095), w * 0.34, h * 0.06, color);
        g.drawCircle(w * 0.79, h * 0.47, h * 0.07, "#314A68", "#DFEFFF", 2);
      }
      if (lucky) {
        g.drawPoly(0, 0, [w - 12, 5, w - 9, 12, w - 2, 15, w - 9, 18, w - 12, 25, w - 15, 18, w - 22, 15, w - 15, 12], "#FFF2A9");
      }
    }
    static pickup(g, type, size) {
      if(GameplayArt.paint(g,type,size,size))return;
      g.clear();
      const center = size / 2;
      const color = type === "fuel" ? "#85D891" : type === "metal" ? "#B4CBDF" : type === "chip" ? "#B39BFA" : "#60D9EE";
      g.drawCircle(center, center, center - 2, "#17314C", color, 3);
      if (type === "fuel") {
        g.drawRect(size * 0.29, size * 0.26, size * 0.4, size * 0.51, "#8CDF9A", "#E5FFDF", 2);
        g.drawRect(size * 0.38, size * 0.16, size * 0.22, size * 0.12, "#DFFFD7");
        g.drawPoly(0, 0, [size * 0.51, size * 0.34, size * 0.4, size * 0.55, size * 0.5, size * 0.55, size * 0.46, size * 0.7, size * 0.62, size * 0.48, size * 0.51, size * 0.48], "#F0FFBE");
      } else if (type === "metal") {
        g.drawPoly(0, 0, [size * 0.23, size * 0.57, size * 0.34, size * 0.32, size * 0.69, size * 0.32, size * 0.79, size * 0.57, size * 0.67, size * 0.72, size * 0.31, size * 0.72], "#BED4E8", "#F1FAFF", 2);
        g.drawPoly(0, 0, [size * 0.34, size * 0.32, size * 0.69, size * 0.32, size * 0.6, size * 0.47, size * 0.28, size * 0.47], "#E6F4FF");
      } else if (type === "chip") {
        g.drawRect(size * 0.29, size * 0.29, size * 0.42, size * 0.42, "#A987EA", "#E5DAFF", 2);
        for (let i = 0; i < 3; i++) {
          const a = size * (0.35 + i * 0.15);
          g.drawRect(a, size * 0.19, 3, size * 0.12, "#DECFFF");
          g.drawRect(a, size * 0.69, 3, size * 0.12, "#DECFFF");
        }
        g.drawRect(size * 0.4, size * 0.4, size * 0.2, size * 0.2, "#D9C9FC");
      } else {
        g.drawPoly(0, 0, [size * 0.54, size * 0.19, size * 0.29, size * 0.52, size * 0.46, size * 0.52, size * 0.4, size * 0.81, size * 0.74, size * 0.42, size * 0.56, size * 0.42], "#B7F5FF", "#F0FDFF", 2);
      }
    }
    static obstacle(g, w, h) {
      if(GameplayArt.paint(g,"asteroid",w,h))return;
      g.clear();
      g.drawPoly(
        0,
        0,
        [w * 0.18, 0, w * 0.75, h * 0.04, w, h * 0.36, w * 0.87, h * 0.83, w * 0.61, h, w * 0.16, h * 0.88, 0, h * 0.39],
        "#D48670",
        "#F7C19A",
        3
      );
      g.drawCircle(w * 0.32, h * 0.31, h * 0.13, "#995E61");
      g.drawCircle(w * 0.68, h * 0.65, h * 0.16, "#AF6C63");
      g.drawLine(w * 0.45, h * 0.15, w * 0.58, h * 0.34, "#F6CAA2", 3);
    }
    static astronaut(g, w, h) {
      if(GameplayArt.paint(g,"astronaut",w,h))return;
      g.clear();
      g.drawRect(2, h * 0.36, w * 0.18, h * 0.36, "#F09B6C", "#4C6986", 2);
      g.drawRect(w * 0.26, h * 0.4, w * 0.5, h * 0.38, "#EAF4FF", "#567D9B", 2);
      g.drawRect(w * 0.12, h * 0.48, w * 0.17, h * 0.2, "#EAF4FF", "#567D9B", 2);
      g.drawRect(w * 0.73, h * 0.48, w * 0.17, h * 0.2, "#EAF4FF", "#567D9B", 2);
      g.drawRect(w * 0.3, h * 0.77, w * 0.17, h * 0.18, "#CEE3F5", "#567D9B", 2);
      g.drawRect(w * 0.58, h * 0.77, w * 0.17, h * 0.18, "#CEE3F5", "#567D9B", 2);
      g.drawCircle(w * 0.5, h * 0.25, w * 0.34, "#EFF8FF", "#5B859D", 2);
      g.drawCircle(w * 0.5, h * 0.25, w * 0.25, "#428CA8");
      g.drawCircle(w * 0.43, h * 0.19, w * 0.08, "#A7ECFA");
      g.drawRect(w * 0.43, h * 0.49, w * 0.17, h * 0.13, "#FFBA73");
    }
  };

  // assets/scripts/prototype/AstronautController.ts
  var AstronautController = class {
    constructor(parent, spawn, energySeconds, callbacks) {
      this.energySeconds = energySeconds;
      this.callbacks = callbacks;
      this.active = false;
      this.input = 0;
      this.energyRatio = 1;
      this.horizontalVelocity = 0;
      this.lastEnergyPercent = -1;
      this.thrust = new Laya.Sprite();
      this.animationMs = 0;
      const node = this.node = new Laya.Sprite();
      node.name = "astronaut_player";
      const width = 54;
      const height = 72;
      node.size(
        width,
        height
      );
      node.pivot(
        width / 2,
        height / 2
      );
      node.pos(
        Math.max(
          GameConfig.astronautEdgeMargin,
          Math.min(
            Laya.stage.width - GameConfig.astronautEdgeMargin,
            spawn.x
          )
        ),
        Math.max(
          300,
          Math.min(
            GameConfig.flightAnchorY,
            spawn.y
          )
        )
      );
      GameplayArt.astronaut(node.graphics, width, height);
      this.thrust.graphics.drawPoly(0, 0, [-5, 0, 0, 22, 5, 0], "#FFB87B");
      this.thrust.pos(8, 56);
      node.addChild(this.thrust);
      parent.addChild(node);
      const body = this.body = node.addComponent(
        Laya.RigidBody
      );
      body.type = "dynamic";
      body.gravityScale = 0;
      body.allowRotation = false;
      body.allowSleep = false;
      body.bullet = true;
      body.linearDamping = 0.08;
      const shape = new Laya.BoxShape2D();
      shape.width = 46;
      shape.height = 66;
      shape.friction = 0;
      shape.restitution = 0;
      body.shapes = [
        shape
      ];
      syncBodyToNode(body);
    }
    start() {
      this.active = true;
      this.input = 0;
      this.energyRatio = 1;
      this.horizontalVelocity = 0;
      this.lastEnergyPercent = -1;
      this.emitEnergy(true);
    }
    setInput(value) {
      this.input = Math.max(
        -1,
        Math.min(
          1,
          value
        )
      );
      this.emitEnergy(true);
    }
    addEnergySeconds(seconds) {
      this.addEnergy(Math.max(0, seconds) / Math.max(1, this.energySeconds));
    }
    setDamageFlash(active) {
      this.node.alpha = active ? 0.45 : 1;
    }
    addEnergy(amountRatio) {
      if (!this.active) {
        return;
      }
      this.energyRatio = Math.min(
        1,
        this.energyRatio + Math.max(
          0,
          amountRatio
        )
      );
      this.emitEnergy(true);
    }
    update(deltaMs) {
      if (!this.active) {
        return;
      }
      this.animationMs += deltaMs;
      this.thrust.scale(1, 0.75 + Math.sin(this.animationMs / 85) * 0.2);
      this.energyRatio = Math.max(
        0,
        this.energyRatio - deltaMs / (Math.max(
          1,
          this.energySeconds
        ) * 1e3)
      );
      let targetVelocity = this.input * GameConfig.astronautMaxHorizontalSpeed;
      if (this.node.x < GameConfig.astronautEdgeMargin) {
        targetVelocity = Math.max(
          targetVelocity,
          42
        );
      } else if (this.node.x > Laya.stage.width - GameConfig.astronautEdgeMargin) {
        targetVelocity = Math.min(
          targetVelocity,
          -42
        );
      }
      const alpha = 1 - Math.exp(
        -deltaMs / GameConfig.astronautSteeringResponseMs
      );
      this.horizontalVelocity += (targetVelocity - this.horizontalVelocity) * alpha;
      this.body.linearVelocity = {
        x: this.horizontalVelocity,
        y: 0
      };
      this.emitEnergy();
      if (this.energyRatio <= 0) {
        this.finish();
      }
    }
    damageEnergy(amountRatio) {
      if (!this.active) {
        return;
      }
      this.energyRatio = Math.max(
        0,
        this.energyRatio - amountRatio
      );
      this.emitEnergy(true);
      if (this.energyRatio <= 0) {
        this.finish();
      }
    }
    stop() {
      this.active = false;
      this.input = 0;
      this.horizontalVelocity = 0;
      this.body.linearVelocity = {
        x: 0,
        y: 0
      };
    }
    destroy() {
      this.stop();
      this.node.destroy(true);
    }
    emitEnergy(force = false) {
      const percent = Math.round(
        this.energyRatio * 100
      );
      if (!force && percent === this.lastEnergyPercent) {
        return;
      }
      this.lastEnergyPercent = percent;
      this.callbacks.onEnergy(
        this.energyRatio,
        this.input
      );
    }
    finish() {
      if (!this.active) {
        return;
      }
      this.stop();
      this.callbacks.onComplete();
    }
  };

  // assets/scripts/prototype/FlightBackdropController.ts
  var FlightBackdropController = class {
    constructor(root) {
      this.node = new Laya.Sprite();
      this.overlay = new Laya.Sprite();
      this.markers = [];
      this.visible = true;
      this.band = -1;
      this.scenery = new Laya.Sprite();
      this.illustratedAtmosphere = new Laya.Sprite();
      this.node.name = "flight_backdrop";
      this.node.size(
        Laya.stage.width,
        Laya.stage.height
      );
      this.overlay.size(
        Laya.stage.width,
        Laya.stage.height
      );
      this.overlay.graphics.drawRect(
        0,
        0,
        Laya.stage.width,
        Laya.stage.height,
        "#020712"
      );
      this.overlay.alpha = 0;
      this.node.addChild(
        this.overlay
      );
      root.addChildAt(
        this.node,
        0
      );
      this.node.addChildAt(this.scenery, 0);
      this.illustratedAtmosphere.name = "flight_illustrated_background";
      this.illustratedAtmosphere.mouseEnabled = false;
      this.scenery.addChild(this.illustratedAtmosphere);
      this.layoutIllustration();
      this.illustratedAtmosphere.loadImage("art/mars_flight.png");
      this.drawTheme(0);
      this.createMarkers();
    }
    resize() {
      const w = Laya.stage.width, h = Laya.stage.height;
      this.node.size(w, h);
      this.overlay.size(w, h);
      this.overlay.graphics.clear();
      this.overlay.graphics.drawRect(0, 0, w, h, "#020712");
      this.band = -1;
      this.drawTheme(0);
      this.layoutIllustration();
    }
    layoutIllustration() {
      const w = Laya.stage.width, h = Laya.stage.height;
      const scale = Math.max(w / 750, h / 1334);
      this.illustratedAtmosphere.scale(scale, scale);
      this.illustratedAtmosphere.pos((w - 750 * scale) / 2, (h - 1334 * scale) / 2);
    }
    setVisible(value) {
      this.visible = value;
      this.node.visible = value;
    }
    update(deltaMs, scrollSpeed, altitudeMeters) {
      if (!this.visible) return;
      this.drawTheme(altitudeMeters);
      const dt = deltaMs / 1e3;
      for (const marker of this.markers) {
        marker.node.y += scrollSpeed * marker.factor * dt;
        if (marker.node.y > Laya.stage.height + 60) {
          marker.node.y = -60;
          marker.node.x = 30 + Math.random() * Math.max(
            1,
            Laya.stage.width - 60
          );
        }
      }
      this.overlay.alpha = Math.max(
        0,
        Math.min(
          0.58,
          altitudeMeters / 1800 * 0.58
        )
      );
    }
    drawTheme(altitude) {
      const band = altitude < 500 ? 0 : altitude < 1500 ? 1 : 2;
      if (band === this.band) return;
      this.band = band;
      const w = Laya.stage.width, h = Laya.stage.height, g = this.scenery.graphics;
      g.clear();
      g.drawRect(0, 0, w, h, band === 0 ? "#123D62" : band === 1 ? "#132B52" : "#091A35");
      g.drawRect(0, h * 0.7, w, h * 0.3, band === 0 ? "#255E78" : "#173C58");
      if (band < 2) {
        const r = w * 0.82;
        g.drawCircle(w * 0.5, h + r - (band === 0 ? 90 : 30), r, "#3D8895", "#76CBBE", 5);
        g.drawCircle(w * 0.7, h + r - (band === 0 ? 75 : 15), r * 0.16, "#6DAF9B");
      } else {
        g.drawCircle(w * 0.84, h * 0.3, 40, "#B9CADF");
        g.drawCircle(w * 0.82, h * 0.29, 9, "#839BB6");
      }
    }
    createMarkers() {
      const width = Laya.stage.width;
      const height = Laya.stage.height;
      for (let i = 0; i < 24; i++) {
        const star = new Laya.Sprite();
        star.graphics.drawCircle(
          0,
          0,
          i % 5 === 0 ? 3 : 2,
          i % 3 === 0 ? "#A7D8FF" : "#688AA9"
        );
        star.pos(
          25 + i * 97 % Math.max(
            50,
            width - 50
          ),
          80 + i * 149 % Math.max(
            100,
            height - 140
          )
        );
        this.node.addChild(star);
        this.markers.push({
          node: star,
          factor: 0.45 + i % 4 * 0.18
        });
      }
      for (let i = 0; i < 7; i++) {
        const wisp = new Laya.Sprite();
        const w = 130 + i % 3 * 48;
        wisp.graphics.drawRect(
          -w / 2,
          -4,
          w,
          8,
          "#7190AC"
        );
        wisp.alpha = 0.12 + i % 2 * 0.06;
        wisp.pos(
          80 + i * 123 % Math.max(
            120,
            width - 120
          ),
          280 + i * 173 % Math.max(
            200,
            height - 350
          )
        );
        this.node.addChild(wisp);
        this.markers.push({
          node: wisp,
          factor: 0.78 + i % 3 * 0.16
        });
      }
    }
  };

  // assets/scripts/progression/UpgradeBenefits.ts
  function upgradeBenefit(key, level) {
    const next = level + 1;
    const fuel = (n) => 1 + (n - 1) * 0.14;
    const energy = (n) => 1 + (n - 1) * 0.12;
    if (key === "engine") return `一级上升 ${(16 * (1 + (level - 1) * 0.12)).toFixed(1)} → ${(16 * (1 + level * 0.12)).toFixed(1)} 米/秒`;
    if (key === "fuel") return `一级续航 ${(30 * fuel(level)).toFixed(1)} → ${(30 * fuel(next)).toFixed(1)} 秒`;
    if (key === "escape") return `宇航服 ${(GameConfig.astronautEnergySeconds * energy(level)).toFixed(1)} → ${(GameConfig.astronautEnergySeconds * energy(next)).toFixed(1)} 秒`;
    return `转向灵敏度 ${100 + (level - 1) * 10}% → ${100 + level * 10}%`;
  }

  // assets/scripts/prototype/HomePanel.ts
  var HomePanel = class {
    constructor(root) {
      this.root = root;
      this.container = null;
      this.refreshView = null;
    }
    show(progress, options, onStart, onUpgrade, startInUpgrade = false) {
      this.hide();
      this.refreshView = () => this.show(progress, options, onStart, onUpgrade, startInUpgrade);
      const panel = this.container = new Laya.Sprite();
      panel.name = "home_panel";
      panel.size(
        Laya.stage.width,
        Laya.stage.height
      );
      panel.graphics.drawRect(
        0,
        0,
        Laya.stage.width,
        Laya.stage.height,
        "#081426"
      );
      panel.mouseEnabled = true;
      this.root.addChild(panel);
      if (startInUpgrade) {
        this.renderUpgrade(
          panel,
          progress,
          options,
          onStart,
          onUpgrade
        );
      } else {
        this.renderMain(
          panel,
          progress,
          options,
          onStart,
          onUpgrade
        );
      }
    }
    resize() {
      var _a;
      if (this.container) (_a = this.refreshView) == null ? void 0 : _a.call(this);
    }
    hide() {
      if (!this.container) return;
      this.container.destroy(true);
      this.container = null;
      this.refreshView = null;
    }
    renderMain(panel, progress, options, onStart, onUpgrade) {
      panel.destroyChildren();
      this.refreshView = () => this.show(progress, options, onStart, onUpgrade, false);
      const width = Laya.stage.width;
      const height = Laya.stage.height;
      panel.graphics.clear();
      panel.graphics.drawRect(0, 0, width, height, "#10162F");
      this.addIllustration(panel);
      this.addText(panel, "抢先登陆火星", 0, 97, width, 75, 56, "#FFF2DF", true);
      this.addText(panel, "亲手搭火箭 · 穿越星空 · 挑战新高度", 30, 190, width - 60, 45, 26, "#C4E3F6", false);
      const target = (Math.floor(progress.bestAltitudeMeters / 500) + 1) * 500;
      this.addText(panel, `下一目标  ${this.formatAltitude(target)}`, 0, 257, width, 50, 31, "#FFD999", true);
      let y = 307;
      for (const definition of [...GameConfig.modules].reverse()) {
        const module = new Laya.Sprite();
        const w = definition.width * 0.60, h = definition.height * 0.60;
        GameplayArt.module(module.graphics, definition.kind, w, h);
        module.pos((width - w) / 2, y);
        panel.addChild(module);
        y += h - 1;
      }
      const flame = new Laya.Sprite();
      flame.graphics.drawPoly(0, 0, [-13, 0, 0, 67, 13, 0], "#F69760");
      flame.graphics.drawPoly(0, 0, [-7, 0, 0, 43, 7, 0], "#FFE3A5");
      flame.pos(width / 2, y);
      panel.addChild(flame);
      this.addText(panel, `历史最高  ${this.formatAltitude(progress.bestAltitudeMeters)}`, 0, 827, width, 48, 33, "#FFE6A9", true);
      this.addText(panel, `火星币 ${progress.marsCoins}  ·  金属 ${progress.metal}  ·  芯片 ${progress.chips}`, 20, 881, width - 40, 42, 26, "#ADE6DF", false);
      const start = this.createButton("开始造火箭", 440, 96, "#2588C3");
      start.pos((width - 440) / 2, 945);
      start.once(Laya.Event.CLICK, this, onStart);
      panel.addChild(start);
      const available = options.filter((o) => o.canUpgrade).length;
      const upgrade = this.createButton(available ? `升级  ·  ${available} 项可提升` : "升级", 340, 76, "#284963");
      upgrade.pos((width - 340) / 2, 1060);
      upgrade.once(Laya.Event.CLICK, this, () => {
        this.refreshView = () => this.show(progress, options, onStart, onUpgrade, true);
        this.renderUpgrade(panel, progress, options, onStart, onUpgrade);
      });
      panel.addChild(upgrade);
      const audio = this.createButton(GameAudio.isMuted ? "音效：关" : "音效：开", 180, 54, "#24415D");
      audio.pos((width - 180) / 2, 1160);
      audio.on(Laya.Event.CLICK, this, () => {
        GameAudio.toggle();
        this.renderMain(panel, progress, options, onStart, onUpgrade);
      });
      panel.addChild(audio);
      this.addText(panel, "搭稳  ·  点火  ·  分离  ·  逃生  ·  升级", 20, height - 98, width - 40, 44, 23, "#96C3D7", false);
    }
    /** Art stays separate from physics and falls back to the solid fill if unavailable. */
    addIllustration(panel) {
      const w = Laya.stage.width, h = Laya.stage.height;
      const scene = new Laya.Sprite();
      scene.name = "mission_illustrated_background";
      const scale = Math.max(w / 750, h / 1334);
      scene.scale(scale, scale);
      scene.pos((w - 750 * scale) / 2, (h - 1334 * scale) / 2);
      scene.loadImage("art/mars_home.png");
      scene.mouseEnabled = false;
      panel.addChildAt(scene, 0);
      const footShade = new Laya.Sprite();
      footShade.mouseEnabled = false;
      footShade.graphics.drawRect(0, h - 130, w, 130, "#081A32B8");
      panel.addChildAt(footShade, 1);
    }
    renderUpgrade(panel, progress, options, onStart, onUpgrade) {
      panel.destroyChildren();
      this.refreshView = () => this.show(progress, options, onStart, onUpgrade, true);
      panel.graphics.clear();
      panel.graphics.drawRect(0, 0, Laya.stage.width, Laya.stage.height, "#10162F");
      this.addIllustration(panel);
      const veil = new Laya.Sprite();
      veil.mouseEnabled = false;
      veil.graphics.drawRect(0, 0, Laya.stage.width, Laya.stage.height, "#08152ACC");
      panel.addChild(veil);
      const width = Laya.stage.width;
      this.addText(
        panel,
        "永久升级",
        0,
        92,
        width,
        58,
        36,
        "#FFFFFF",
        true
      );
      this.addText(
        panel,
        `火星币 ${progress.marsCoins} · 金属 ${progress.metal} · 芯片 ${progress.chips}`,
        30,
        156,
        width - 60,
        36,
        19,
        "#A9BED2",
        false
      );
      let y = 230;
      for (const option of options) {
        this.addUpgradeRow(
          panel,
          option,
          y,
          () => onUpgrade(option.key)
        );
        y += 122;
      }
      const back = this.createButton(
        "返回首页",
        250,
        68,
        "#3F5367"
      );
      back.pos(
        width / 2 - 270,
        y + 25
      );
      back.once(
        Laya.Event.CLICK,
        this,
        () => this.renderMain(
          panel,
          progress,
          options,
          onStart,
          onUpgrade
        )
      );
      panel.addChild(back);
      const start = this.createButton(
        "开始造火箭",
        250,
        68,
        "#2D7FD2"
      );
      start.pos(
        width / 2 + 20,
        y + 25
      );
      start.once(
        Laya.Event.CLICK,
        this,
        onStart
      );
      panel.addChild(start);
    }
    addUpgradeRow(parent, option, y, onClick) {
      const width = Math.min(
        620,
        Laya.stage.width - 60
      );
      const row = new Laya.Sprite();
      row.pos(
        (Laya.stage.width - width) / 2,
        y
      );
      row.graphics.drawRect(
        0,
        0,
        width,
        108,
        "#152A43",
        "#365C80",
        2
      );
      parent.addChild(row);
      this.addText(
        row,
        `${option.label}  Lv.${option.level}`,
        18,
        8,
        200,
        30,
        21,
        "#FFFFFF",
        true,
        "left"
      );
      const maxed = option.level >= option.maxLevel;
      const costText = maxed ? "已满级" : `${option.cost.marsCoins}币 / ${option.cost.metal}金属 / ${option.cost.chips}芯片`;
      this.addText(
        row,
        costText,
        18,
        46,
        width - 170,
        28,
        20,
        "#99B0C8",
        false,
        "left"
      );
      this.addText(
        row,
        maxed ? "同类模块最低等级已提升至 Lv.5" : upgradeBenefit(option.key, option.level),
        18,
        76,
        width - 36,
        26,
        23,
        "#B1DCCB",
        false,
        "left"
      );
      const button = this.createButton(
        maxed ? "满级" : "升级",
        120,
        50,
        option.canUpgrade ? "#2D8B65" : "#4B5665"
      );
      button.pos(
        width - 140,
        17
      );
      if (option.canUpgrade) {
        button.once(
          Laya.Event.CLICK,
          this,
          onClick
        );
      }
      row.addChild(button);
    }
    createButton(textValue, width, height, color) {
      const button = new Laya.Sprite();
      button.size(width, height);
      button.graphics.drawRect(5, 8, width - 10, height - 8, "#071321");
      button.graphics.drawRect(0, 0, width, height - 5, "#10243F", "#92D3F5", 3);
      button.graphics.drawRect(6, 6, width - 12, height - 17, color);
      button.graphics.drawRect(14, 12, width - 28, 5, "#FFFFFF33");
      button.mouseEnabled = true;
      this.addText(
        button,
        textValue,
        0,
        0,
        width,
        height,
        28,
        "#FFFFFF",
        true
      );
      return button;
    }
    addText(parent, textValue, x, y, width, height, fontSize, color, bold, align = "center") {
      const text = new Laya.Text();
      text.text = textValue;
      text.color = color;
      if (bold) {
        text.stroke = 1;
        text.strokeColor = "#19243B";
      }
      text.fontSize = fontSize;
      text.bold = bold;
      text.align = align;
      text.valign = "middle";
      text.size(width, height);
      text.pos(x, y);
      parent.addChild(text);
      return text;
    }
    formatAltitude(meters) {
      return meters >= 1e3 ? `${(meters / 1e3).toFixed(2)} KM` : `${Math.floor(meters)} M`;
    }
  };

  // assets/scripts/prototype/FlightObstacleManager.ts
  var FlightObstacle = class {
    constructor(x, y, speed, onHit) {
      this.speed = speed;
      this.onHit = onHit;
      this.consumed = false;
      const node = this.node = new Laya.Sprite();
      node.name = "flight_obstacle";
      node.size(
        GameConfig.obstacleWidth,
        GameConfig.obstacleHeight
      );
      node.pivot(
        GameConfig.obstacleWidth / 2,
        GameConfig.obstacleHeight / 2
      );
      node.pos(x, y);
      GameplayArt.obstacle(node.graphics, GameConfig.obstacleWidth, GameConfig.obstacleHeight);
      const body = node.addComponent(
        Laya.RigidBody
      );
      body.type = "kinematic";
      body.gravityScale = 0;
      body.allowRotation = false;
      body.allowSleep = false;
      const shape = new Laya.BoxShape2D();
      shape.width = GameConfig.obstacleWidth;
      shape.height = GameConfig.obstacleHeight;
      shape.isSensor = true;
      body.shapes = [shape];
      node.on(
        Laya.Event.TRIGGER_ENTER,
        this,
        this.handleTriggerEnter
      );
    }
    update(deltaMs) {
      this.node.y += this.speed * (deltaMs / 1e3);
    }
    destroy() {
      this.node.off(
        Laya.Event.TRIGGER_ENTER,
        this,
        this.handleTriggerEnter
      );
      this.node.destroy(true);
    }
    handleTriggerEnter(colliderB, colliderA) {
      var _a;
      if (this.consumed) return;
      const names = [
        this.getOwnerName(
          colliderB
        ),
        this.getOwnerName(
          colliderA
        )
      ];
      const targetNodeName = (_a = names.find(
        (name) => name.startsWith(
          "rocket_module_"
        )
      )) != null ? _a : names.find(
        (name) => name === "astronaut_player"
      );
      if (!targetNodeName) {
        return;
      }
      this.consumed = this.onHit({
        target: targetNodeName === "astronaut_player" ? "astronaut" : "rocket",
        targetNodeName
      });
    }
    getOwnerName(collider) {
      if (typeof collider !== "object" || collider === null) {
        return "";
      }
      const owner = collider.owner;
      return typeof (owner == null ? void 0 : owner.name) === "string" ? owner.name : "";
    }
  };
  var FlightObstacleManager = class {
    constructor(root, onHit) {
      this.root = root;
      this.onHit = onHit;
      this.mode = null;
      this.obstacles = [];
      this.spawnElapsedMs = 0;
      this.seed = 5370206;
      this.automaticSpawning = true;
    }
    get activeCount() {
      return this.obstacles.length;
    }
    setAutomaticSpawning(value) {
      this.automaticSpawning = value;
    }
    spawnAt(x) {
      if (!this.mode) return;
      const obstacle = new FlightObstacle(x, GameConfig.obstacleSpawnY, this.getObstacleSpeed(), this.onHit);
      this.root.addChild(obstacle.node);
      this.obstacles.push(obstacle);
    }
    setMode(mode) {
      if (this.mode === mode) {
        return;
      }
      this.clear();
      this.mode = mode;
      this.spawnElapsedMs = 0;
      if (mode && this.automaticSpawning) {
        this.spawnObstacle();
      }
    }
    update(deltaMs) {
      if (!this.mode) return;
      this.spawnElapsedMs += deltaMs;
      const interval = this.getSpawnInterval();
      if (this.automaticSpawning && this.spawnElapsedMs >= interval) {
        this.spawnElapsedMs = 0;
        this.spawnObstacle();
      }
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obstacle = this.obstacles[i];
        obstacle.update(deltaMs);
        if (obstacle.consumed || obstacle.node.y > Laya.stage.height + 120) {
          obstacle.destroy();
          this.obstacles.splice(
            i,
            1
          );
        }
      }
    }
    clear() {
      for (const obstacle of this.obstacles) {
        obstacle.destroy();
      }
      this.obstacles.length = 0;
      this.spawnElapsedMs = 0;
    }
    spawnObstacle() {
      if (!this.mode) return;
      const margin = 90;
      const width = Math.max(
        1,
        Laya.stage.width - margin * 2
      );
      const x = margin + this.random() * width;
      const obstacle = new FlightObstacle(
        x,
        GameConfig.obstacleSpawnY,
        this.getObstacleSpeed(),
        this.onHit
      );
      this.root.addChild(
        obstacle.node
      );
      this.obstacles.push(
        obstacle
      );
    }
    getSpawnInterval() {
      if (this.mode === "stage1") {
        return GameConfig.obstacleStage1SpawnMs;
      }
      if (this.mode === "stage2") {
        return GameConfig.obstacleStage2SpawnMs;
      }
      return GameConfig.obstacleAstronautSpawnMs;
    }
    getObstacleSpeed() {
      if (this.mode === "stage1") {
        return GameConfig.obstacleStage1Speed;
      }
      if (this.mode === "stage2") {
        return GameConfig.obstacleStage2Speed;
      }
      return GameConfig.obstacleAstronautSpeed;
    }
    random() {
      this.seed = Math.imul(
        this.seed,
        1664525
      ) + 1013904223 >>> 0;
      return this.seed / 4294967296;
    }
  };

  // assets/scripts/prototype/FlightPickupManager.ts
  var FlightPickup = class {
    constructor(type, x, y, speed, onHit) {
      this.type = type;
      this.speed = speed;
      this.onHit = onHit;
      this.consumed = false;
      const node = this.node = new Laya.Sprite();
      node.name = `flight_pickup_${type}`;
      node.size(
        GameConfig.pickupSize,
        GameConfig.pickupSize
      );
      node.pivot(
        GameConfig.pickupSize / 2,
        GameConfig.pickupSize / 2
      );
      node.pos(x, y);
      GameplayArt.pickup(node.graphics, type, GameConfig.pickupSize);
      const body = node.addComponent(
        Laya.RigidBody
      );
      body.type = "kinematic";
      body.gravityScale = 0;
      body.allowRotation = false;
      body.allowSleep = false;
      const shape = new Laya.CircleShape2D();
      shape.radius = GameConfig.pickupSize / 2;
      shape.x = GameConfig.pickupSize / 2;
      shape.y = GameConfig.pickupSize / 2;
      shape.isSensor = true;
      body.shapes = [
        shape
      ];
      node.on(
        Laya.Event.TRIGGER_ENTER,
        this,
        this.handleTriggerEnter
      );
    }
    update(deltaMs) {
      this.node.y += this.speed * deltaMs / 1e3;
    }
    destroy() {
      this.node.off(
        Laya.Event.TRIGGER_ENTER,
        this,
        this.handleTriggerEnter
      );
      this.node.destroy(true);
    }
    handleTriggerEnter(colliderB, colliderA) {
      var _a;
      if (this.consumed) {
        return;
      }
      const names = [
        this.getOwnerName(
          colliderB
        ),
        this.getOwnerName(
          colliderA
        )
      ];
      const targetNodeName = (_a = names.find(
        (name) => name.startsWith(
          "rocket_module_"
        )
      )) != null ? _a : names.find(
        (name) => name === "astronaut_player"
      );
      if (!targetNodeName) {
        return;
      }
      this.consumed = this.onHit({
        type: this.type,
        target: targetNodeName === "astronaut_player" ? "astronaut" : "rocket",
        targetNodeName
      });
    }
    getOwnerName(collider) {
      if (typeof collider !== "object" || collider === null) {
        return "";
      }
      const owner = collider.owner;
      return typeof (owner == null ? void 0 : owner.name) === "string" ? owner.name : "";
    }
    getColor(type) {
      if (type === "fuel") {
        return "#56C97A";
      }
      if (type === "metal") {
        return "#9FAFC1";
      }
      if (type === "chip") {
        return "#A46CFF";
      }
      return "#42CFE8";
    }
    getLabel(type) {
      if (type === "fuel") {
        return "燃";
      }
      if (type === "metal") {
        return "铁";
      }
      if (type === "chip") {
        return "芯";
      }
      return "能";
    }
  };
  var FlightPickupManager = class {
    constructor(root, onHit) {
      this.root = root;
      this.onHit = onHit;
      this.mode = null;
      this.pickups = [];
      this.spawnElapsedMs = 0;
      this.seed = 2447445413;
      this.automaticSpawning = true;
    }
    get activeCount() {
      return this.pickups.length;
    }
    setAutomaticSpawning(value) {
      this.automaticSpawning = value;
    }
    spawnAt(x, type) {
      if (!this.mode) return;
      const pickup = new FlightPickup(type, x, GameConfig.pickupSpawnY, this.getSpeed(), this.onHit);
      this.root.addChild(pickup.node);
      this.pickups.push(pickup);
    }
    setMode(mode) {
      if (this.mode === mode) {
        return;
      }
      this.clear();
      this.mode = mode;
      this.spawnElapsedMs = 0;
      if (mode && this.automaticSpawning) {
        this.spawnPickup();
      }
    }
    update(deltaMs) {
      if (!this.mode) {
        return;
      }
      this.spawnElapsedMs += deltaMs;
      const interval = this.getSpawnInterval();
      if (this.automaticSpawning && this.spawnElapsedMs >= interval) {
        this.spawnElapsedMs = 0;
        this.spawnPickup();
      }
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const pickup = this.pickups[i];
        pickup.update(deltaMs);
        if (pickup.consumed || pickup.node.y > Laya.stage.height + 100) {
          pickup.destroy();
          this.pickups.splice(
            i,
            1
          );
        }
      }
    }
    clear() {
      for (const pickup of this.pickups) {
        pickup.destroy();
      }
      this.pickups.length = 0;
      this.spawnElapsedMs = 0;
    }
    spawnPickup() {
      if (!this.mode) {
        return;
      }
      const margin = 85;
      const width = Math.max(
        1,
        Laya.stage.width - margin * 2
      );
      const x = margin + this.random() * width;
      const pickup = new FlightPickup(
        this.rollType(),
        x,
        GameConfig.pickupSpawnY,
        this.getSpeed(),
        this.onHit
      );
      this.root.addChild(
        pickup.node
      );
      this.pickups.push(
        pickup
      );
    }
    rollType() {
      return rollRoutePickup(this.mode, this.random());
    }
    getSpawnInterval() {
      if (this.mode === "stage1") {
        return GameConfig.pickupStage1SpawnMs;
      }
      if (this.mode === "stage2") {
        return GameConfig.pickupStage2SpawnMs;
      }
      return GameConfig.pickupAstronautSpawnMs;
    }
    getSpeed() {
      if (this.mode === "stage1") {
        return GameConfig.pickupStage1Speed;
      }
      if (this.mode === "stage2") {
        return GameConfig.pickupStage2Speed;
      }
      return GameConfig.pickupAstronautSpeed;
    }
    random() {
      this.seed = Math.imul(
        this.seed,
        1664525
      ) + 1013904223 >>> 0;
      return this.seed / 4294967296;
    }
  };

  // assets/scripts/prototype/RocketAssembly.ts
  var RocketAssembly = class {
    constructor(modules) {
      this.modules = modules;
      this.connectionJoints = /* @__PURE__ */ new Map();
      this.locked = false;
      this.activeStartIndex = 0;
    }
    calculateMetrics(thrustAxisX) {
      let totalWeight = 0;
      let weightedCenterX = 0;
      let weightedAbsTilt = 0;
      let weightedSignedTilt = 0;
      let alignmentTotal = 0;
      for (let i = this.activeStartIndex; i < this.modules.length; i++) {
        const module = this.modules[i];
        const weight = Math.max(
          1,
          module.approximateWeight
        );
        const tilt = this.normalizedAngle(
          module.body.rotation
        );
        totalWeight += weight;
        weightedCenterX += module.node.x * weight;
        weightedAbsTilt += Math.abs(tilt) * weight;
        weightedSignedTilt += tilt * weight;
        if (i > this.activeStartIndex) {
          alignmentTotal += Math.abs(
            module.node.x - this.modules[i - 1].node.x
          );
        }
      }
      const safeWeight = Math.max(
        1,
        totalWeight
      );
      const centerX = weightedCenterX / safeWeight;
      const centerOffsetPx = centerX - thrustAxisX;
      const averageTiltDeg = weightedAbsTilt / safeWeight;
      const signedTiltDeg = weightedSignedTilt / safeWeight;
      const alignmentErrorPx = this.modules.length - this.activeStartIndex > 1 ? alignmentTotal / (this.modules.length - this.activeStartIndex - 1) : 0;
      const offsetPenalty = Math.min(
        1,
        Math.abs(centerOffsetPx) / 145
      );
      const tiltPenalty = Math.min(
        1,
        averageTiltDeg / 24
      );
      const alignmentPenalty = Math.min(
        1,
        alignmentErrorPx / 92
      );
      const penalty = offsetPenalty * 0.45 + tiltPenalty * 0.3 + alignmentPenalty * 0.25;
      const stability = this.clamp(
        1 - penalty,
        0,
        1
      );
      const drift = this.clamp(
        centerOffsetPx / 145,
        -1,
        1
      ) * 0.68 + this.clamp(
        signedTiltDeg / 22,
        -1,
        1
      ) * 0.32;
      return {
        stability,
        centerOffsetPx,
        averageTiltDeg,
        alignmentErrorPx,
        drift: this.clamp(
          drift,
          -1,
          1
        )
      };
    }
    lockStructure() {
      if (this.locked) return;
      this.activeStartIndex = 0;
      const centerY = this.getActiveCenterY();
      const centerX = this.getActiveCenterX();
      for (const module of this.modules) {
        module.prepareForFlight();
        const scale = GameConfig.flightModuleScale;
        module.resizeForFlight(scale);
        module.node.pos(
          centerX + (module.node.x - centerX) * scale,
          centerY + (module.node.y - centerY) * scale
        );
        syncBodyToNode(module.body);
      }
      for (let i = 1; i < this.modules.length; i++) {
        const previous = this.modules[i - 1];
        const current = this.modules[i];
        const joint = new Laya.WeldJoint();
        joint.otherBody = previous.body;
        joint.selfBody = current.body;
        joint.anchor = [
          0,
          0
        ];
        joint.frequency = 0;
        joint.damping = 1;
        joint.collideConnected = false;
        current.node.addComponentInstance(
          joint
        );
        this.connectionJoints.set(
          i,
          joint
        );
      }
      this.locked = true;
    }
    setEngineEffect(stage, pulse = 1) {
      var _a, _b;
      (_a = this.modules[0]) == null ? void 0 : _a.setThrust(stage === 1, pulse);
      (_b = this.modules[2]) == null ? void 0 : _b.setThrust(stage === 2, pulse);
    }
    deactivateDebris(index) {
      var _a;
      if (index >= this.activeStartIndex) return;
      for (const key of [index, index + 1]) {
        (_a = this.connectionJoints.get(key)) == null ? void 0 : _a.destroy();
        this.connectionJoints.delete(key);
      }
      const module = this.modules[index];
      module.node.visible = false;
      module.body.enabled = false;
    }
    separateStage1(horizontalVelocity, verticalVelocity, drift) {
      var _a, _b, _c, _d;
      if (!this.locked || this.activeStartIndex >= 2) {
        return;
      }
      const stageBoundaryJoint = this.connectionJoints.get(2);
      if (stageBoundaryJoint) {
        stageBoundaryJoint.destroy();
        this.connectionJoints.delete(2);
      }
      const spinDirection = Math.abs(drift) > 0.08 ? Math.sign(drift) : ((_b = (_a = this.modules[0]) == null ? void 0 : _a.node.x) != null ? _b : 0) <= ((_d = (_c = this.modules[1]) == null ? void 0 : _c.node.x) != null ? _d : 0) ? -1 : 1;
      for (const module of this.modules.slice(0, 2)) {
        module.prepareForDetachedStage(
          horizontalVelocity * 0.82,
          verticalVelocity + 34,
          spinDirection * 11
        );
      }
      this.activeStartIndex = 2;
      this.setEngineEffect(0);
    }
    releaseActiveAsWreck(horizontalVelocity, verticalVelocity, drift) {
      this.setEngineEffect(0);
      for (const joint of this.connectionJoints.values()) {
        joint.destroy();
      }
      this.connectionJoints.clear();
      const spinDirection = Math.abs(drift) > 0.08 ? Math.sign(drift) : 1;
      for (let i = this.activeStartIndex; i < this.modules.length; i++) {
        const offset = i - this.activeStartIndex;
        this.modules[i].prepareForDetachedStage(
          horizontalVelocity * (0.78 + offset * 0.03),
          verticalVelocity + 26 + offset * 7,
          spinDirection * (7 + offset * 1.4)
        );
      }
      this.activeStartIndex = this.modules.length;
      this.locked = false;
    }
    unlockStructure() {
      for (const joint of this.connectionJoints.values()) {
        joint.destroy();
      }
      this.connectionJoints.clear();
      this.locked = false;
      this.activeStartIndex = 0;
    }
    setActiveVelocity(x, y) {
      for (let i = this.activeStartIndex; i < this.modules.length; i++) {
        this.modules[i].setVelocity(
          x,
          y
        );
      }
    }
    getActiveCenterX() {
      return this.getActiveCenter("x");
    }
    getActiveCenterY() {
      return this.getActiveCenter("y");
    }
    getEscapeSpawnPoint() {
      const cockpit = this.modules[this.modules.length - 1];
      if (!cockpit) {
        return {
          x: Laya.stage.width / 2,
          y: 420
        };
      }
      return {
        x: cockpit.node.x,
        y: cockpit.node.y - cockpit.node.height * 0.35
      };
    }
    isActiveNodeName(nodeName) {
      const index = this.modules.findIndex(
        (module) => module.node.name === nodeName
      );
      return index >= this.activeStartIndex && index >= 0;
    }
    getActiveCenter(axis) {
      const count = this.modules.length - this.activeStartIndex;
      if (count <= 0) return 0;
      let total = 0;
      for (let i = this.activeStartIndex; i < this.modules.length; i++) {
        total += axis === "x" ? this.modules[i].node.x : this.modules[i].node.y;
      }
      return total / count;
    }
    normalizedAngle(angle) {
      let value = angle % 360;
      if (value > 180) {
        value -= 360;
      }
      if (value < -180) {
        value += 360;
      }
      return value;
    }
    clamp(value, min, max) {
      return Math.max(
        min,
        Math.min(max, value)
      );
    }
  };

  // assets/scripts/prototype/RocketFlightController.ts
  var RocketFlightController = class {
    constructor(assembly, metrics, runStats, callbacks) {
      this.assembly = assembly;
      this.metrics = metrics;
      this.runStats = runStats;
      this.callbacks = callbacks;
      this.state = "stage1";
      this.input = 0;
      this.horizontalVelocity = 0;
      this.verticalVelocity = 0;
      this.fuelRatio = 1;
      this.separationElapsedMs = 0;
      this.stage2IgnitionElapsedMs = 0;
      this.stage1IgnitionElapsedMs = 0;
      this.lastFuelPercent = -1;
    }
    start() {
      this.state = "stage1";
      this.input = 0;
      this.fuelRatio = 1;
      this.separationElapsedMs = 0;
      this.stage2IgnitionElapsedMs = 0;
      this.stage1IgnitionElapsedMs = 0;
      this.lastFuelPercent = -1;
      this.horizontalVelocity = this.metrics.drift * GameConfig.stabilityDriftSpeed;
      this.verticalVelocity = 0;
      this.assembly.setEngineEffect(1);
      this.emitTelemetry(1, true);
    }
    get currentInput() {
      return this.input;
    }
    get fuelConsumptionMultiplier() {
      return 1 + (1 - this.metrics.stability) * GameConfig.maxBuildFuelPenalty;
    }
    setInput(value) {
      this.input = this.clamp(
        value,
        -1,
        1
      );
      if (this.state === "stage1") {
        this.emitTelemetry(
          1,
          true
        );
      } else if (this.state === "stage2") {
        this.emitTelemetry(
          2,
          true
        );
      }
    }
    addFuel(amountRatio) {
      if (this.state !== "stage1" && this.state !== "stage2") {
        return;
      }
      const capacityMultiplier = this.state === "stage1" ? this.runStats.stage1FuelMultiplier : this.runStats.stage2FuelMultiplier;
      this.fuelRatio = Math.min(1, this.fuelRatio + Math.max(0, amountRatio) / capacityMultiplier);
      this.emitTelemetry(
        this.state === "stage1" ? 1 : 2,
        true
      );
    }
    requestEscape(reason) {
      if (this.state === "complete") {
        return;
      }
      this.beginEscape(reason);
    }
    update(deltaMs) {
      if (this.state === "complete") {
        return;
      }
      if (this.state === "stage1") {
        this.updateStage1(
          deltaMs
        );
        return;
      }
      if (this.state === "separating") {
        this.updateStageSeparation(
          deltaMs
        );
        return;
      }
      this.updateStage2(
        deltaMs
      );
    }
    stop() {
      if (this.state === "complete") {
        return;
      }
      this.state = "complete";
      this.input = 0;
      this.horizontalVelocity = 0;
      this.verticalVelocity = 0;
      this.assembly.setActiveVelocity(
        0,
        0
      );
    }
    updateStage1(deltaMs) {
      this.stage1IgnitionElapsedMs += deltaMs;
      const durationMs = GameConfig.stage1FuelSeconds * this.runStats.stage1FuelMultiplier * 1e3;
      this.fuelRatio = Math.max(
        0,
        this.fuelRatio - deltaMs * this.fuelConsumptionMultiplier / durationMs
      );
      const boost = this.stage1IgnitionElapsedMs < 750 ? 1.18 - this.stage1IgnitionElapsedMs / 750 * 0.18 : 1;
      this.updateFlightMotion(
        deltaMs,
        boost * this.runStats.stage1EngineMultiplier
      );
      this.emitTelemetry(1);
      if (this.fuelRatio <= 0) {
        this.beginStageSeparation();
      }
    }
    beginStageSeparation() {
      this.state = "separating";
      this.fuelRatio = 0;
      this.separationElapsedMs = 0;
      const stage1VerticalVelocity = this.verticalVelocity;
      this.assembly.separateStage1(
        this.horizontalVelocity,
        stage1VerticalVelocity,
        this.metrics.drift
      );
      const coastVertical = stage1VerticalVelocity === 0 ? 0 : stage1VerticalVelocity * 0.62;
      this.verticalVelocity = this.getAnchoredVerticalVelocity(
        coastVertical
      );
      this.assembly.setActiveVelocity(
        this.horizontalVelocity * 0.92,
        this.verticalVelocity
      );
      this.metrics = this.assembly.calculateMetrics(this.assembly.modules[2].node.x);
      this.callbacks.onStageSeparation();
    }
    updateStageSeparation(deltaMs) {
      this.separationElapsedMs += deltaMs;
      const progress = this.clamp(
        this.separationElapsedMs / GameConfig.stageSeparationMs,
        0,
        1
      );
      const requestedCoastVertical = -GameConfig.verticalFlightSpeed * (0.62 - progress * 0.12);
      this.verticalVelocity = this.getAnchoredVerticalVelocity(
        requestedCoastVertical
      );
      this.assembly.setActiveVelocity(
        this.horizontalVelocity * 0.92,
        this.verticalVelocity
      );
      if (this.separationElapsedMs >= GameConfig.stageSeparationMs) {
        this.beginStage2();
      }
    }
    beginStage2() {
      this.state = "stage2";
      this.fuelRatio = 1;
      this.stage2IgnitionElapsedMs = 0;
      this.lastFuelPercent = -1;
      this.assembly.setEngineEffect(2);
      this.callbacks.onStage2Ignition();
      this.emitTelemetry(
        2,
        true
      );
    }
    updateStage2(deltaMs) {
      this.stage2IgnitionElapsedMs += deltaMs;
      const durationMs = GameConfig.stage2FuelSeconds * this.runStats.stage2FuelMultiplier * 1e3;
      this.fuelRatio = Math.max(
        0,
        this.fuelRatio - deltaMs * this.fuelConsumptionMultiplier / durationMs
      );
      const boostProgress = this.clamp(
        this.stage2IgnitionElapsedMs / GameConfig.stage2IgnitionBoostMs,
        0,
        1
      );
      const ignitionBoost = 1 + (GameConfig.stage2IgnitionBoostMultiplier - 1) * (1 - boostProgress);
      this.updateFlightMotion(
        deltaMs,
        GameConfig.stage2SpeedMultiplier * ignitionBoost * this.runStats.stage2EngineMultiplier
      );
      this.emitTelemetry(2);
      if (this.fuelRatio <= 0) {
        this.beginEscape(
          "fuel"
        );
      }
    }
    beginEscape(reason) {
      if (this.state === "complete") {
        return;
      }
      const motion = {
        horizontalVelocity: this.horizontalVelocity,
        verticalVelocity: this.verticalVelocity
      };
      this.state = "complete";
      this.input = 0;
      this.callbacks.onEscapeRequested(
        reason,
        motion
      );
    }
    updateFlightMotion(deltaMs, verticalMultiplier) {
      const controlMultiplier = this.runStats.cockpitControlMultiplier;
      const driftVelocity = this.metrics.drift * GameConfig.stabilityDriftSpeed;
      let targetVelocity = this.input * GameConfig.maxHorizontalSpeed * controlMultiplier + driftVelocity;
      const centerX = this.assembly.getActiveCenterX();
      if (centerX < GameConfig.flightEdgeMargin) {
        targetVelocity = Math.max(
          targetVelocity,
          32
        );
      } else if (centerX > Laya.stage.width - GameConfig.flightEdgeMargin) {
        targetVelocity = Math.min(
          targetVelocity,
          -32
        );
      }
      const responseMs = GameConfig.steeringResponseMs / controlMultiplier;
      const alpha = 1 - Math.exp(
        -deltaMs / responseMs
      );
      this.horizontalVelocity += (targetVelocity - this.horizontalVelocity) * alpha;
      const requestedVerticalVelocity = -GameConfig.verticalFlightSpeed * verticalMultiplier;
      this.verticalVelocity = this.getAnchoredVerticalVelocity(
        requestedVerticalVelocity
      );
      this.assembly.setActiveVelocity(
        this.horizontalVelocity,
        this.verticalVelocity
      );
    }
    getAnchoredVerticalVelocity(requestedVelocity) {
      const anchor = Math.min(GameConfig.flightAnchorY, Laya.stage.height - 280);
      const difference = anchor - this.assembly.getActiveCenterY();
      return this.clamp(difference * 1.8, -Math.abs(requestedVelocity), Math.abs(requestedVelocity));
    }
    emitTelemetry(stage, force = false) {
      const fuelPercent = Math.round(
        this.fuelRatio * 100
      );
      if (!force && fuelPercent === this.lastFuelPercent) {
        return;
      }
      this.lastFuelPercent = fuelPercent;
      this.callbacks.onTelemetry(
        stage,
        this.fuelRatio,
        this.input
      );
    }
    clamp(value, min, max) {
      return Math.max(
        min,
        Math.min(
          max,
          value
        )
      );
    }
  };

  // assets/scripts/prototype/PrototypeHud.ts
  var PrototypeHud = class {
    constructor(root) {
      this.root = root;
      this.panel = new Laya.Sprite();
      this.toast = new Laya.Text();
      this.toastRemainingMs = 0;
      this.fuelBar = new Laya.Sprite();
      this.lastBarKey = "";
      this.title = new Laya.Text();
      this.status = new Laya.Text();
      this.hint = new Laya.Text();
      this.fuel = new Laya.Text();
      this.health = new Laya.Text();
      this.runInfo = new Laya.Text();
      this.panel.alpha = 0.96;
      this.root.addChild(this.panel);
      this.root.addChild(this.fuelBar);
      this.title.text = "抢先登陆火星";
      this.title.color = "#FFFFFF";
      this.title.fontSize = 28;
      this.title.bold = true;
      this.title.align = "center";
      this.root.addChild(
        this.title
      );
      this.status.color = "#8ED8FF";
      this.status.fontSize = 26;
      this.status.align = "center";
      this.root.addChild(
        this.status
      );
      this.hint.color = "#B8C8DA";
      this.hint.fontSize = 23;
      this.hint.align = "center";
      this.root.addChild(
        this.hint
      );
      this.fuel.color = "#FFE08A";
      this.fuel.fontSize = 24;
      this.fuel.bold = true;
      this.fuel.align = "center";
      this.root.addChild(
        this.fuel
      );
      this.health.color = "#FFAAA4";
      this.health.fontSize = 24;
      this.health.bold = true;
      this.health.align = "center";
      this.root.addChild(
        this.health
      );
      this.runInfo.color = "#A9D8B6";
      this.runInfo.fontSize = 23;
      this.runInfo.bold = true;
      this.runInfo.align = "center";
      this.root.addChild(
        this.runInfo
      );
      this.toast.color = "#FFE08A";
      this.toast.fontSize = 25;
      this.toast.bold = true;
      this.toast.align = "center";
      this.root.addChild(this.toast);
      this.setBuildingHint();
      this.layout();
    }
    setVisible(value) {
      this.panel.visible = value;
      this.fuelBar.visible = value && this.fuel.visible;
      this.title.visible = value;
      this.status.visible = value;
      this.hint.visible = value;
      this.fuel.visible = value;
      this.health.visible = value;
      this.runInfo.visible = value;
      this.toast.visible = value;
      if (!value) this.toast.text = "";
    }
    layout() {
      const width = Laya.stage.width;
      this.panel.size(width, 270);
      this.panel.graphics.clear();
      if (!GameplayArt.paint(this.panel.graphics, "hud_panel", width, 270)) {
        this.panel.graphics.drawRect(0, 0, width, 270, "#091B2F");
        this.panel.graphics.drawRect(0, 268, width, 2, "#345777");
      }
      this.title.size(width, 36).pos(0, 14);
      this.status.size(width, 34).pos(0, 53);
      this.hint.size(width, 32).pos(0, 93);
      this.fuel.size(width, 32).pos(0, 130);
      this.fuelBar.pos(30, 165);
      this.health.size(width, 32).pos(0, 181);
      this.runInfo.size(width, 52).pos(0, 215);
      this.toast.size(width, 42).pos(0, 320);
      this.lastBarKey = "";
    }
    showMilestone(meters) {
      this.showToast(`突破 ${this.formatAltitude(meters)}！`);
    }
    showPlacement(offset) {
      this.showToast(offset < 12 ? "完美对齐！" : offset < 40 ? "落稳了 · 继续搭建" : "偏移较大 · 下一块注意重心");
    }
    drawFuelBar(ratio) {
      const width = Laya.stage.width - 60, percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
      const key = `${width}:${percent}`;
      this.fuelBar.visible = true;
      if (key === this.lastBarKey) return;
      this.lastBarKey = key;
      const g = this.fuelBar.graphics;
      g.clear();
      g.drawRect(0,0,width,16,"#0A2037","#72ACD0",2);
      if(percent>0) {
        g.drawRect(2,2,Math.max(0,(width-4)*percent/100),12,percent<25?"#FF796B":"#F9CD6E");
        g.drawRect(3,3,Math.max(0,(width-6)*percent/100),3,percent<25?"#FFC1AD":"#FFF2B9");
      }
    }
    update(deltaMs) {
      if (this.toastRemainingMs <= 0) return;
      this.toastRemainingMs -= deltaMs;
      if (this.toastRemainingMs <= 0) {
        this.toast.text = "";
        this.toast.visible = false;
      }
    }
    showToast(message) {
      this.toast.visible = true;
      this.toast.text = message;
      this.toastRemainingMs = 1200;
    }
    setProgress(current, total, message = "") {
      this.status.text = message || `搭建进度 ${current} / ${total}`;
      this.fuel.text = "";
      this.health.text = "";
      this.fuel.visible = false;
      this.fuelBar.visible = false;
      this.health.visible = false;
      this.toast.visible = false;
      this.toastRemainingMs = 0;
      this.setBuildingHint();
    }
    setFailure() {
      this.status.text = "建造失败 · 正在重新准备";
      this.hint.text = "火箭倒塌，约 1 秒后自动重开";
      this.fuel.text = "";
      this.health.text = "";
      this.fuel.visible = false;
      this.fuelBar.visible = false;
      this.health.visible = false;
      this.toast.visible = false;
      this.toastRemainingMs = 0;
    }
    setBuildReady(metrics, luckyCount) {
      const percent = Math.round(
        metrics.stability * 100
      );
      this.status.text = `建造完成 · 稳定度 ${percent}%`;
      const penalty = Math.round((1 - metrics.stability) * GameConfig.maxBuildFuelPenalty * 100);
      this.hint.text = penalty > 0 ? `搭建偏移：额外燃耗 ${penalty}%` : luckyCount > 0 ? `本枚火箭出现 ${luckyCount} 个超等级模块 ✦` : "本枚火箭为标准等级配置";
      this.fuel.visible = true;
      this.fuel.text = "点击“点火发射”开始远征";
      this.health.text = "";
      this.fuelBar.visible = false;
      this.toast.visible = false;
    }
    setIgnition(metrics, hp, maxHp) {
      const percent = Math.round(
        metrics.stability * 100
      );
      this.showToast("一级发动机点火！");
      this.status.text = `一级点火！稳定度 ${percent}%`;
      this.hint.text = "躲障碍，拾取燃料 / 金属 / 芯片";
      this.renderFuel(1, 1);
      this.renderHealth(
        hp,
        maxHp
      );
    }
    setStageFlight(stage, fuelRatio, metrics, input, hp, maxHp) {
      const stability = Math.round(
        metrics.stability * 100
      );
      const direction = metrics.drift > 0.08 ? "右偏" : metrics.drift < -0.08 ? "左偏" : "基本直飞";
      const control = Math.round(
        input * 100
      );
      this.status.text = `${stage === 1 ? "一级" : "二级"}飞行 · 稳定度 ${stability}% · ${direction}`;
      this.hint.text = "左右拖动：躲陨石，沿资源串收集";
      this.renderFuel(
        stage,
        fuelRatio
      );
      this.renderHealth(
        hp,
        maxHp
      );
    }
    setRocketDamaged(hp, maxHp) {
      this.showToast(`受到撞击 · 耐久 ${hp}/${maxHp}`);
      this.status.text = `⚠ 火箭遭到撞击 · 剩余耐久 ${hp}/${maxHp}`;
      this.hint.text = hp > 0 ? "继续躲避障碍" : "耐久归零，逃生系统启动";
      this.renderHealth(
        hp,
        maxHp
      );
    }
    setStageSeparation(hp, maxHp) {
      this.status.text = "⚠ 一级燃料耗尽 · 一级分离";
      this.hint.text = "一级发动机 + 一级燃料仓脱离坠落";
      this.fuel.visible = true;
      this.fuel.text = "一级燃料耗尽";
      this.drawFuelBar(0);
      this.renderHealth(
        hp,
        maxHp
      );
    }
    setStage2Ignition(hp, maxHp) {
      this.showToast("二级发动机点火！");
      this.status.text = "二级发动机点火！";
      this.hint.text = "二级资源更好，但障碍更密";
      this.renderFuel(
        2,
        1
      );
      this.renderHealth(
        hp,
        maxHp
      );
    }
    setEscape(reason) {
      this.status.text = reason === "damage" ? "⚠ 火箭损毁 · 紧急逃生！" : "二级燃料耗尽 · 逃生舱弹射！";
      this.hint.text = "火箭残骸坠落，切换宇航员推进";
      this.fuel.visible = true;
      this.fuel.text = "正在弹射…";
      this.fuelBar.visible = false;
      this.health.text = "";
      this.health.visible = false;
    }
    setAstronautFlight(energyRatio, input) {
      const percent = Math.round(
        Math.max(
          0,
          Math.min(
            1,
            energyRatio
          )
        ) * 100
      );
      const filled = Math.round(
        percent / 10
      );
      const bar = "■".repeat(filled) + "□".repeat(
        10 - filled
      );
      const control = Math.round(
        input * 100
      );
      this.status.text = "宇航员继续远征";
      this.hint.text = "更灵活的宇航员 · 继续收集资源";
      this.fuel.visible = true;
      this.health.visible = true;
      this.fuel.text = `宇航服能源 ${percent}%`;
      this.drawFuelBar(energyRatio);
      this.health.text = "撞陨石损失 25% 能源";
    }
    setAstronautDamaged() {
      this.showToast("撞击损失 25% 宇航服能源");
      this.status.text = "⚠ 宇航员撞到障碍";
      this.hint.text = "宇航服能源受损，继续调整方向";
    }
    setRunComplete() {
      this.toast.text = "";
      this.status.text = "本次远征结束";
      this.hint.text = "正在结算高度与远征资源";
      this.fuel.text = "";
      this.health.text = "";
      this.fuel.visible = false;
      this.fuelBar.visible = false;
      this.health.visible = false;
      this.toast.visible = false;
      this.toastRemainingMs = 0;
    }
    setRunProgress(altitudeMeters, bestMeters, runMetal, runChips, newRecord) {
      const altitude = this.formatAltitude(
        altitudeMeters
      );
      const best = this.formatAltitude(
        Math.max(
          bestMeters,
          altitudeMeters
        )
      );
      this.runInfo.text = `高度 ${altitude}  ·  目标 ${this.formatAltitude((Math.floor(altitudeMeters / 500) + 1) * 500)}
金属 ${runMetal}  ·  芯片 ${runChips}${newRecord && bestMeters > 0 ? "  ·  新纪录" : ""}`;
    }
    setAccountSummary(marsCoins, metal, chips, bestMeters) {
      this.runInfo.text = `纪录 ${this.formatAltitude(bestMeters)}  ·  火星币 ${marsCoins}
金属 ${metal}  ·  芯片 ${chips}${bestMeters < 200 ? "  ·  首航200米领升级材料" : ""}`;
    }
    renderFuel(stage, fuelRatio) {
      this.fuel.visible = true;
      const clamped = Math.max(
        0,
        Math.min(
          1,
          fuelRatio
        )
      );
      const filled = Math.round(
        clamped * 10
      );
      const bar = "■".repeat(filled) + "□".repeat(
        10 - filled
      );
      this.fuel.text = `${stage === 1 ? "一级" : "二级"}燃料  ${Math.round(clamped * 100)}%`;
      this.drawFuelBar(clamped);
    }
    renderHealth(hp, maxHp) {
      this.health.visible = true;
      const hearts = "♥".repeat(
        Math.max(
          0,
          hp
        )
      );
      const empty = "♡".repeat(
        Math.max(
          0,
          maxHp - hp
        )
      );
      this.health.text = `火箭耐久 ${hearts}${empty} ${hp}/${maxHp}`;
    }
    setBuildingHint() {
      this.hint.text = "沿中线左右拖动，松手落下";
    }
    formatAltitude(meters) {
      return meters >= 1e3 ? `${(meters / 1e3).toFixed(2)}KM` : `${Math.floor(meters)}M`;
    }
  };

  // assets/scripts/prototype/RocketModule.ts
  var RocketModule = class {
    constructor(definition, x, y, index, level, baseLevel) {
      this.definition = definition;
      this.level = level;
      this.baseLevel = baseLevel;
      this.exhaust = new Laya.Sprite();
      this.released = false;
      this.settled = false;
      this.stableMs = 0;
      const node = this.node = new Laya.Sprite();
      node.name = `rocket_module_${index}_${definition.kind}`;
      node.size(
        definition.width,
        definition.height
      );
      node.pivot(
        definition.width / 2,
        definition.height / 2
      );
      node.pos(
        x,
        y
      );
      this.drawModule(definition.width, definition.height);
      const label = this.label = new Laya.Text();
      label.text = `${definition.label}
Lv.${level}${this.isLucky ? " ✦" : ""}`;
      label.color = "#FFFFFF";
      label.stroke = 2; label.strokeColor = "#142840";
      label.fontSize = 24;
      label.bold = true;
      label.align = "center";
      label.valign = "middle";
      label.size(
        definition.width,
        definition.height
      );
      node.addChild(label);
      this.exhaust.graphics.drawPoly(0, 0, [-18, 0, 0, 66, 18, 0], "#FF8A4D");
      this.exhaust.graphics.drawPoly(0, 0, [-10, 0, 0, 45, 10, 0], "#FFE59A");
      this.exhaust.visible = false;
      node.addChild(this.exhaust);
      const body = this.body = node.addComponent(
        Laya.RigidBody
      );
      body.type = "kinematic";
      body.gravityScale = 0;
      body.allowRotation = false;
      body.allowSleep = true;
      body.linearDamping = 0.08;
      body.angularDamping = 0.45;
      const shape = this.shape = new Laya.BoxShape2D();
      shape.width = definition.width;
      shape.height = definition.height;
      shape.density = definition.density;
      shape.friction = 0.82;
      shape.restitution = 0.03;
      body.shapes = [
        shape
      ];
    }
    get isLucky() {
      return this.level > this.baseLevel;
    }
    moveToX(x) {
      if (this.released) {
        return;
      }
      this.node.x = x;
    }
    release() {
      if (this.released) {
        return;
      }
      this.released = true;
      this.body.allowRotation = true;
      this.body.gravityScale = 1;
      this.body.type = "dynamic";
    }
    updateSettle(deltaMs, linearThreshold, angularThreshold) {
      if (!this.released || this.settled) {
        return this.settled;
      }
      const velocity = this.body.linearVelocity;
      const slow = Math.abs(velocity.x) <= linearThreshold && Math.abs(velocity.y) <= linearThreshold && Math.abs(
        this.body.angularVelocity
      ) <= angularThreshold;
      this.stableMs = slow ? this.stableMs + deltaMs : 0;
      return this.stableMs > 0;
    }
    drawModule(w, h) {
      GameplayArt.module(this.node.graphics, this.definition.kind, w, h, this.isLucky);
    }
    resizeForFlight(scale) {
      const w = this.definition.width * scale, h = this.definition.height * scale;
      this.node.size(w, h).pivot(w / 2, h / 2);
      this.drawModule(w, h);
      this.label.size(w, h);
      this.label.text = `Lv.${this.level}${this.isLucky ? " ✦" : ""}`;
      this.label.fontSize = 23;
      this.label.valign = "bottom";
      this.shape.width = w;
      this.shape.height = h;
      this.body.shapes = [this.shape];
    }
    setThrust(active, pulse = 1) {
      this.exhaust.visible = active;
      this.exhaust.pos(this.node.width / 2, this.node.height);
      this.exhaust.scale(0.7, pulse * 0.7);
    }
    prepareForFlight() {
      this.body.type = "dynamic";
      this.body.gravityScale = 0;
      this.body.allowSleep = false;
      this.body.allowRotation = true;
      this.body.bullet = true;
      this.body.linearDamping = 0.04;
      this.body.angularDamping = 0.32;
      this.body.linearVelocity = {
        x: 0,
        y: 0
      };
      this.body.angularVelocity = 0;
    }
    prepareForDetachedStage(horizontalVelocity, verticalVelocity, spin) {
      this.body.type = "dynamic";
      this.body.gravityScale = 1;
      this.body.allowSleep = true;
      this.body.allowRotation = true;
      this.body.bullet = false;
      this.body.linearDamping = 0.02;
      this.body.angularDamping = 0.08;
      this.body.linearVelocity = {
        x: horizontalVelocity,
        y: verticalVelocity
      };
      this.body.angularVelocity = spin;
      const filter = new Laya.FilterData();
      filter.mask = 0;
      this.shape.filterData = filter;
    }
    setVelocity(x, y) {
      this.body.linearVelocity = {
        x,
        y
      };
    }
    freeze() {
      this.body.linearVelocity = {
        x: 0,
        y: 0
      };
      this.body.angularVelocity = 0;
      this.body.gravityScale = 0;
      this.body.allowRotation = false;
      this.body.type = "kinematic";
    }
    get approximateWeight() {
      return this.definition.width * this.definition.height * this.definition.density;
    }
  };

  // assets/scripts/prototype/UpgradePanel.ts
  var UpgradePanel = class {
    constructor(root) {
      this.root = root;
      this.container = null;
      this.illustratedBackdrop = null;
    }
    show(settlement, progress, options, onUpgrade, onReplay) {
      this.hide();
      const w = Laya.stage.width, h = Laya.stage.height;
      const backdrop = this.illustratedBackdrop = new Laya.Sprite();
      const cover = Math.max(w / 750, h / 1334);
      backdrop.scale(cover, cover);
      backdrop.pos((w - 750 * cover) / 2, (h - 1334 * cover) / 2);
      backdrop.loadImage("art/mars_home.png");
      backdrop.mouseEnabled = false;
      this.root.addChild(backdrop);
      const veil = new Laya.Sprite();
      veil.graphics.drawRect(0, 0, w / cover, h / cover, "#09142DBB");
      veil.mouseEnabled = false;
      veil.pos(-backdrop.x / cover, -backdrop.y / cover);
      backdrop.addChild(veil);
      const panel = this.container = new Laya.Sprite();
      const width = Math.min(
        620,
        Laya.stage.width - 50
      );
      const height = 820;
      panel.size(
        width,
        height
      );
      panel.pivot(
        width / 2,
        height / 2
      );
      panel.pos(
        Laya.stage.width / 2,
        Laya.stage.height / 2
      );
      panel.graphics.drawRect(9, 13, width - 18, height - 3, "#071020AA");
      panel.graphics.drawRect(0, 0, width, height, "#172942", "#89D6E5", 4);
      panel.graphics.drawRect(5, 5, width - 10, 187, "#203956");
      panel.graphics.drawRect(24, 16, width - 48, 5, "#F9CA89");
      panel.graphics.drawRect(30, 184, width - 60, 2, "#5A88A3");
      this.root.addChild(
        panel
      );
      this.addText(
        panel,
        settlement.newRecord ? "新纪录！" : "本次远征结束",
        0,
        28,
        width,
        40,
        30,
        settlement.newRecord ? "#FFE37A" : "#FFFFFF",
        true
      );
      this.addText(
        panel,
        `最高高度 ${this.formatAltitude(settlement.altitudeMeters)}`,
        0,
        78,
        width,
        34,
        24,
        "#8ED8FF",
        true
      );
      this.addText(
        panel,
        `本局 +火星币 ${settlement.marsCoinsEarned}  +金属 ${settlement.metalEarned}  +芯片 ${settlement.chipsEarned}`,
        0,
        118,
        width,
        32,
        19,
        "#D7E4F1",
        false
      );
      this.addText(
        panel,
        `持有：火星币 ${progress.marsCoins} · 金属 ${progress.metal} · 芯片 ${progress.chips}`,
        0,
        153,
        width,
        32,
        18,
        "#A9BED2",
        false
      );
      this.addText(
        panel,
        "永久升级",
        0,
        202,
        width,
        32,
        23,
        "#FFFFFF",
        true
      );
      let y = 248;
      for (const option of options) {
        this.addUpgradeRow(
          panel,
          option,
          y,
          () => onUpgrade(
            option.key
          )
        );
        y += 118;
      }
      const replay = this.createButton(
        "再来一枚",
        330,
        74,
        "#2C7ED1"
      );
      replay.pos(
        (width - 330) / 2,
        height - 98
      );
      replay.once(
        Laya.Event.CLICK,
        this,
        onReplay
      );
      panel.addChild(
        replay
      );
    }
    hide() {
      var _a;
      (_a = this.illustratedBackdrop) == null ? void 0 : _a.destroy(true);
      this.illustratedBackdrop = null;
      if (!this.container) {
        return;
      }
      this.container.destroy(true);
      this.container = null;
    }
    addUpgradeRow(parent, option, y, onClick) {
      const width = parent.width - 56;
      const row = new Laya.Sprite();
      row.pos(
        28,
        y
      );
      row.graphics.drawRect(0, 0, width, 104, "#1A3650", "#4B7F98", 2);
      row.graphics.drawRect(0, 0, 5, 104, "#72C4D3");
      parent.addChild(row);
      this.addText(
        row,
        `${option.label}  Lv.${option.level}`,
        18,
        9,
        205,
        28,
        20,
        "#FFFFFF",
        true,
        "left"
      );
      const maxed = option.level >= option.maxLevel;
      const costText = maxed ? "同类模块最低 Lv.5" : `需要 ${option.cost.marsCoins}币 / ${option.cost.metal}金属 / ${option.cost.chips}芯片`;
      this.addText(
        row,
        costText,
        18,
        38,
        330,
        23,
        19,
        "#9DB2C8",
        false,
        "left"
      );
      this.addText(
        row,
        maxed ? "每次再造都保留永久升级" : upgradeBenefit(option.key, option.level),
        18,
        70,
        width - 36,
        26,
        23,
        "#B1DCCB",
        false,
        "left"
      );
      const button = this.createButton(
        maxed ? "满级" : "升级",
        118,
        48,
        option.canUpgrade ? "#2D8B65" : "#4B5665"
      );
      button.pos(
        width - 136,
        12
      );
      if (option.canUpgrade) {
        button.once(
          Laya.Event.CLICK,
          this,
          onClick
        );
      }
      row.addChild(
        button
      );
    }
    createButton(textValue, width, height, color) {
      const button = new Laya.Sprite();
      button.size(
        width,
        height
      );
      button.graphics.drawRect(4, 5, width - 8, height - 5, "#071629");
      button.graphics.drawRect(0, 0, width, height - 4, "#183852", "#9EDCEE", 2);
      button.graphics.drawRect(4, 4, width - 8, height - 12, color);
      button.graphics.drawRect(10, 8, width - 20, 3, "#FFFFFF44");
      button.mouseEnabled = true;
      this.addText(
        button,
        textValue,
        0,
        0,
        width,
        height,
        21,
        "#FFFFFF",
        true
      );
      return button;
    }
    addText(parent, textValue, x, y, width, height, fontSize, color, bold, align = "center") {
      const text = new Laya.Text();
      text.text = textValue;
      text.color = color;
      text.fontSize = fontSize;
      text.bold = bold;
      text.align = align;
      text.valign = "middle";
      text.size(
        width,
        height
      );
      text.pos(
        x,
        y
      );
      parent.addChild(
        text
      );
      return text;
    }
    formatAltitude(meters) {
      return meters >= 1e3 ? `${(meters / 1e3).toFixed(2)} KM` : `${Math.floor(meters)} M`;
    }
  };

  // assets/scripts/prototype/BuildStructure.ts
  function supportedBy(upper, lower, tolerance = 8) {
    if (upper.y >= lower.y) return false;
    const corners = (r) => {
      const a2 = r.rotation * Math.PI / 180;
      const c = Math.cos(a2), s = Math.sin(a2);
      return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => ({
        x: r.x + x * r.width / 2 * c - y * r.height / 2 * s,
        y: r.y + x * r.width / 2 * s + y * r.height / 2 * c
      }));
    };
    const a = corners(upper), b = corners(lower);
    const horizontalOverlap = Math.min(Math.max(...a.map((p) => p.x)), Math.max(...b.map((p) => p.x))) - Math.max(Math.min(...a.map((p) => p.x)), Math.min(...b.map((p) => p.x)));
    if (horizontalOverlap < Math.min(upper.width, lower.width) * 0.18) return false;
    for (const polygon of [a, b]) {
      for (let i = 0; i < 2; i++) {
        const edgeX = polygon[i + 1].x - polygon[i].x;
        const edgeY = polygon[i + 1].y - polygon[i].y;
        const length = Math.hypot(edgeX, edgeY);
        const project = (points) => points.map((p) => (-edgeY * p.x + edgeX * p.y) / length);
        const pa = project(a), pb = project(b);
        const gap = Math.max(Math.min(...pa) - Math.max(...pb), Math.min(...pb) - Math.max(...pa));
        if (gap > tolerance) return false;
      }
    }
    return true;
  }
  function structureConnected(modules, platform) {
    let lower = platform;
    for (const module of modules) {
      if (!module.released) break;
      const upper = {
        x: module.node.x,
        y: module.node.y,
        width: module.node.width,
        height: module.node.height,
        rotation: module.body.rotation
      };
      if (!supportedBy(upper, lower)) return false;
      lower = upper;
    }
    return true;
  }
  function structureSlow(modules) {
    return modules.filter((m) => m.released).every((m) => {
      const v = m.body.linearVelocity;
      return Math.hypot(v.x, v.y) <= GameConfig.velocitySettleThreshold && Math.abs(m.body.angularVelocity) <= GameConfig.angularSettleThreshold;
    });
  }

  // assets/scripts/prototype/BuildPrototype.ts
  var BuildPrototype = class {
    constructor() {
      this.elapsedAccumulatorMs = 0;
      this.suspended = false;
      this.userPaused = false;
      this.skipResumeDelta = false;
      this.unbindVisibility = null;
      this.structureStableMs = 0;
      this.pointerHeld = false;
      this.hudElapsedMs = 0;
      this.backgroundDecorated = false;
      this.root = new Laya.Scene();
      this.world = new Laya.Sprite();
      this.progressStore = new PlayerProgressStore();
      this.modules = [];
      this.moduleRolls = {};
      this.current = null;
      this.phase = "home" /* Home */;
      this.buildDragging = false;
      this.controlDragging = false;
      this.controlPointerStartX = 0;
      this.lastControlInput = 0;
      this.milestone = 0;
      this.animationMs = 0;
      this.buildGuide = new Laya.Sprite();
      this.guideKey = "";
      this.nextQueued = false;
      this.platformNode = null;
      this.platformCollider = null;
      this.platformY = 0;
      this.assembly = null;
      this.buildMetrics = null;
      this.runStats = null;
      this.flight = null;
      this.astronaut = null;
      this.actionButton = null;
      this.rocketHp = GameConfig.rocketMaxHp;
      this.damageCooldownMs = 0;
      this.runAltitudeMeters = 0;
      this.runMetal = 0;
      this.runChips = 0;
      this.recordTargetMeters = 0;
      this.newRecordDuringRun = false;
      this.lastSettlement = null;
    }
    mount(parent) {
      var _a;
      parent.addChild(
        this.root
      );
      this.root.addChild(
        this.world
      );
      this.drawBackground();
      this.backdrop = new FlightBackdropController(
        this.root
      );
      this.createPlatform();
      this.hud = new PrototypeHud(
        this.root
      );
      this.upgradePanel = new UpgradePanel(
        this.root
      );
      this.homePanel = new HomePanel(
        this.root
      );
      this.obstacleManager = new FlightObstacleManager(
        this.world,
        (hit) => this.onObstacleHit(hit)
      );
      this.pickupManager = new FlightPickupManager(
        this.world,
        (hit) => this.onPickupHit(hit)
      );
      this.obstacleManager.setAutomaticSpawning(false);
      this.pickupManager.setAutomaticSpawning(false);
      this.routes = new FlightRoutes(
        (x) => this.obstacleManager.spawnAt(x),
        (x, type) => this.pickupManager.spawnAt(x, type)
      );
      this.feedback = new FlightFeedback(this.world);
      const debug = new URLSearchParams(((_a = globalThis.location) == null ? void 0 : _a.search) || "").get("debug") === "1";
      this.performance = new PerformanceMonitor(this.root, debug);
      this.world.addChild(this.buildGuide);
      this.pauseUI = new PauseOverlay(this.root, (value) => this.setUserPaused(value));
      this.bindInput();
      this.unbindVisibility = PlatformManager.current.onVisibilityChange((visible) => {
        var _a2, _b;
        this.suspended = !visible;
        this.skipResumeDelta = visible;
        this.elapsedAccumulatorMs = 0;
        Laya.timer.scale = visible ? 1 : 0;
        if (visible) GameAudio.unlock();
        else GameAudio.suspend();
        this.pointerHeld = false;
        this.buildDragging = false;
        this.controlDragging = false;
        this.lastControlInput = 0;
        (_a2 = this.flight) == null ? void 0 : _a2.setInput(0);
        (_b = this.astronaut) == null ? void 0 : _b.setInput(0);
      });
      this.showHome();
      Laya.timer.frameLoop(
        1,
        this,
        this.update
      );
    }
    dispose() {
      var _a, _b, _c, _d;
      (_a = this.unbindVisibility) == null ? void 0 : _a.call(this);
      this.unbindVisibility = null;
      Laya.stage.offAllCaller(this);
      Laya.timer.clearAll(this);
      (_b = this.flight) == null ? void 0 : _b.stop();
      this.obstacleManager.setMode(null);
      this.pickupManager.setMode(null);
      this.routes.setMode(null);
      (_c = this.astronaut) == null ? void 0 : _c.destroy();
      (_d = this.assembly) == null ? void 0 : _d.unlockStructure();
      this.root.destroy(true);
    }
    drawBackground() {
      const w = Laya.stage.width;
      const h = Laya.stage.height;
      this.root.graphics.clear();
      this.root.size(w, h);
      this.world.size(w, h);
      this.root.graphics.drawRect(
        0,
        0,
        w,
        h,
        "#081426"
      );
      this.root.graphics.drawRect(
        0,
        h * 0.58,
        w,
        h * 0.42,
        "#10233A"
      );
      if (this.backgroundDecorated) return;
      this.backgroundDecorated = true;
      for (let i = 0; i < 9; i++) {
        const star = new Laya.Sprite();
        const x = 45 + i * 83 % Math.max(
          120,
          w - 90
        );
        const y = 270 + i * 137 % Math.max(
          200,
          Math.floor(
            h * 0.3
          )
        );
        star.graphics.drawCircle(
          0,
          0,
          i % 3 === 0 ? 3 : 2,
          "#6E93B8"
        );
        star.pos(x, y);
        this.root.addChildAt(
          star,
          0
        );
      }
    }
    createPlatform() {
      const w = Laya.stage.width;
      const h = Laya.stage.height;
      this.platformY = h - Math.max(
        GameConfig.platformBottom,
        h * 0.09
      );
      const platform = this.platformNode = new Laya.Sprite();
      platform.name = "launch_platform";
      platform.pos(
        w / 2,
        this.platformY
      );
      platform.graphics.drawRect(
        -GameConfig.platformWidth / 2,
        -GameConfig.platformHeight / 2,
        GameConfig.platformWidth,
        GameConfig.platformHeight,
        "#52677E",
        "#8296AA",
        3
      );
      this.world.addChild(
        platform
      );
      this.createPlatformCollider();
    }
    createPlatformCollider() {
      if (!this.platformNode || this.platformCollider) {
        return;
      }
      const collider = this.platformCollider = this.platformNode.addComponent(
        Laya.StaticCollider
      );
      const shape = new Laya.BoxShape2D();
      shape.width = GameConfig.platformWidth;
      shape.height = GameConfig.platformHeight;
      shape.x = -GameConfig.platformWidth / 2;
      shape.y = -GameConfig.platformHeight / 2;
      shape.friction = 0.92;
      shape.restitution = 0.01;
      collider.shapes = [
        shape
      ];
      syncBodyToNode(collider);
    }
    removePlatformCollider() {
      if (!this.platformCollider) {
        return;
      }
      this.platformCollider.destroy();
      this.platformCollider = null;
    }
    setUserPaused(value) {
      var _a, _b;
      if (this.userPaused === value) return;
      this.userPaused = value;
      this.elapsedAccumulatorMs = 0;
      this.skipResumeDelta = true;
      this.pointerHeld = false;
      this.buildDragging = false;
      this.controlDragging = false;
      this.lastControlInput = 0;
      (_a = this.flight) == null ? void 0 : _a.setInput(0);
      (_b = this.astronaut) == null ? void 0 : _b.setInput(0);
      this.pauseUI.setPaused(value);
      if (value) GameAudio.suspend();
      else GameAudio.unlock();
    }
    pointerOnPauseButton() {
      var _a;
      return !!((_a = this.pauseUI) == null ? void 0 : _a.isActive) && !this.userPaused && Laya.stage.mouseY <= 85 && Laya.stage.mouseX >= Laya.stage.width - 155;
    }
    bindInput() {
      Laya.stage.on(
        Laya.Event.MOUSE_DOWN,
        this,
        this.onPointerDown
      );
      Laya.stage.on(
        Laya.Event.MOUSE_MOVE,
        this,
        this.onPointerMove
      );
      Laya.stage.on(
        Laya.Event.MOUSE_UP,
        this,
        this.onPointerUp
      );
      Laya.stage.on(
        Laya.Event.MOUSE_OUT,
        this,
        this.onPointerUp
      );
      Laya.stage.on(
        Laya.Event.RESIZE,
        this,
        this.onResize
      );
    }
    onPointerDown() {
      if (this.userPaused || this.pointerOnPauseButton()) return;
      GameAudio.unlock();
      this.pointerHeld = true;
      this.lastControlInput = 0;
      if (this.phase === "building" /* Building */ && this.current && !this.current.released) {
        this.buildDragging = true;
        this.moveCurrentToPointer();
        return;
      }
      if (this.isRocketControlPhase() && this.flight) {
        this.controlDragging = true;
        this.controlPointerStartX = Laya.stage.mouseX;
        this.flight.setInput(0);
        return;
      }
      if (this.phase === "astronaut_flight" /* AstronautFlight */ && this.astronaut) {
        this.controlDragging = true;
        this.controlPointerStartX = Laya.stage.mouseX;
        this.astronaut.setInput(0);
      }
    }
    onPointerMove() {
      if (this.userPaused || this.pointerOnPauseButton()) return;
      if (this.buildDragging) {
        this.moveCurrentToPointer();
        return;
      }
      if (!this.controlDragging) {
        return;
      }
      const delta = Laya.stage.mouseX - this.controlPointerStartX;
      const distance = this.phase === "astronaut_flight" /* AstronautFlight */ ? GameConfig.astronautControlDragDistance : GameConfig.flightControlDragDistance;
      this.lastControlInput = this.clamp(delta / distance, -1, 1);
      if (this.isRocketControlPhase() && this.flight) {
        this.flight.setInput(
          this.clamp(
            delta / GameConfig.flightControlDragDistance,
            -1,
            1
          )
        );
        return;
      }
      if (this.phase === "astronaut_flight" /* AstronautFlight */ && this.astronaut) {
        this.astronaut.setInput(
          this.clamp(
            delta / GameConfig.astronautControlDragDistance,
            -1,
            1
          )
        );
      }
    }
    onPointerUp() {
      var _a, _b;
      if (this.userPaused) return;
      this.pointerHeld = false;
      this.lastControlInput = 0;
      if (this.buildDragging && this.current && !this.current.released) {
        this.buildDragging = false;
        this.moveCurrentToPointer();
        this.current.release();
        PlatformManager.current.vibrate("light");
        return;
      }
      if (this.controlDragging) {
        this.controlDragging = false;
        this.lastControlInput = 0;
        (_a = this.flight) == null ? void 0 : _a.setInput(0);
        (_b = this.astronaut) == null ? void 0 : _b.setInput(0);
      }
    }
    moveCurrentToPointer() {
      if (!this.current) {
        return;
      }
      const half = this.current.definition.width / 2;
      const minX = GameConfig.dragMargin + half;
      const maxX = Laya.stage.width - GameConfig.dragMargin - half;
      this.current.moveToX(
        this.clamp(
          Laya.stage.mouseX,
          minX,
          maxX
        )
      );
    }
    update() {
      var _a, _b;
      const delta = Math.min(2e3, Math.max(0, Laya.timer.delta || 16.67));
      let steps = 0;
      (_a = this.pauseUI) == null ? void 0 : _a.setActive(!this.isIdlePhase() && !this.suspended);
      if (this.userPaused) return;
      if (!this.suspended && !this.isIdlePhase()) {
        if (this.skipResumeDelta) this.skipResumeDelta = false;
        else {
          this.elapsedAccumulatorMs += Math.min(250, delta);
          const stepMs = 1e3 / 60;
          while (this.elapsedAccumulatorMs + 1e-3 >= stepMs) {
            this.elapsedAccumulatorMs -= stepMs;
            this.updateSimulation(stepMs);
            steps++;
            if (this.isIdlePhase()) {
              this.elapsedAccumulatorMs = 0;
              break;
            }
            stepPhysics(stepMs / 1e3);
          }
        }
      }
      if (!this.suspended && this.performance.enabled) this.performance.record(delta, steps, {
        worldNodes: this.world.numChildren,
        bodies: ((_b = Laya.Physics2D.I._rigiBodyList) == null ? void 0 : _b.length) || 0,
        obstacles: this.obstacleManager.activeCount,
        pickups: this.pickupManager.activeCount,
        phase: this.phase
      });
    }
    updateSimulation(dt) {
      var _a, _b, _c, _d;
      this.hud.update(dt);
      this.feedback.update(dt);
      this.animationMs += dt;
      const stage = this.phase === "stage1_flight" /* Stage1Flight */ ? 1 : this.phase === "stage2_flight" /* Stage2Flight */ ? 2 : 0;
      (_a = this.assembly) == null ? void 0 : _a.setEngineEffect(stage, 0.9 + Math.sin(this.animationMs / 80) * 0.14);
      this.updateBuildGuide();
      this.reclaimDebris();
      if (this.damageCooldownMs > 0) {
        this.damageCooldownMs = Math.max(
          0,
          this.damageCooldownMs - dt
        );
      }
      this.routes.update(dt);
      this.backdrop.update(
        dt,
        this.getBackdropScrollSpeed(),
        this.runAltitudeMeters
      );
      this.obstacleManager.update(dt);
      this.pickupManager.update(dt);
      this.updateRunAltitude(dt);
      if (this.phase === "building" /* Building */) {
        this.updateBuilding(dt);
        return;
      }
      if (this.phase === "launch_ready" /* LaunchReady */) {
        if (this.detectCollapse() || !this.isStructureConnected()) this.failBuild();
        else this.structureStableMs = structureSlow(this.modules) ? this.structureStableMs + dt : 0;
        return;
      }
      if (this.isFlightRuntimePhase()) {
        (_b = this.flight) == null ? void 0 : _b.update(dt);
        return;
      }
      if (this.phase === "astronaut_flight" /* AstronautFlight */) {
        (_c = this.astronaut) == null ? void 0 : _c.setDamageFlash(this.damageCooldownMs > 0 && Math.floor(this.damageCooldownMs / 90) % 2 === 0);
        (_d = this.astronaut) == null ? void 0 : _d.update(dt);
      }
    }
    updateRunAltitude(dt) {
      var _a;
      if (!this.runStats) {
        return;
      }
      let rate = 0;
      if (this.phase === "stage1_flight" /* Stage1Flight */) {
        rate = GameConfig.stage1AltitudeMetersPerSecond * this.runStats.stage1EngineMultiplier;
      } else if (this.phase === "stage_separation" /* StageSeparation */) {
        rate = GameConfig.stageSeparationAltitudeMetersPerSecond;
      } else if (this.phase === "stage2_flight" /* Stage2Flight */) {
        rate = GameConfig.stage2AltitudeMetersPerSecond * this.runStats.stage2EngineMultiplier;
      } else if (this.phase === "astronaut_flight" /* AstronautFlight */) {
        rate = GameConfig.astronautAltitudeMetersPerSecond;
      }
      if (rate <= 0) {
        return;
      }
      this.runAltitudeMeters += rate * dt / 1e3;
      if (!this.newRecordDuringRun && this.runAltitudeMeters > this.recordTargetMeters) {
        this.newRecordDuringRun = true;
      }
      const milestone = Math.floor(this.runAltitudeMeters / GameConfig.milestoneStepMeters);
      if (milestone > this.milestone) {
        this.milestone = milestone;
        this.hud.showMilestone(milestone * GameConfig.milestoneStepMeters);
        (_a = this.feedback) == null ? void 0 : _a.burst(Laya.stage.width / 2, 350, "#FFD58A", "major");
        GameAudio.play("record");
      }
      this.hudElapsedMs += dt;
      if (this.hudElapsedMs >= 100) {
        this.hudElapsedMs %= 100;
        this.refreshRunHud();
      }
    }
    updateBuilding(dt) {
      var _a;
      if (this.detectCollapse()) {
        this.failBuild();
        return;
      }
      if (!this.current || !this.current.released || this.current.settled) {
        return;
      }
      this.structureStableMs = structureSlow(this.modules) ? this.structureStableMs + dt : 0;
      if (this.structureStableMs < GameConfig.settleMs) return;
      if (!this.isStructureConnected()) {
        this.failBuild();
        return;
      }
      this.current.settled = true;
      const below = this.modules[this.modules.length - 2];
      const offset = Math.abs(this.current.node.x - ((_a = below == null ? void 0 : below.node.x) != null ? _a : this.platformNode.x));
      this.hud.showPlacement(offset);
      GameAudio.play("land");
      if (Math.abs(
        this.normalizedAngle(
          this.current.body.rotation
        )
      ) > GameConfig.maxSafeTilt) {
        this.failBuild();
        return;
      }
      if (this.modules.length >= GameConfig.modules.length) {
        this.completeBuild();
        return;
      }
      if (!this.nextQueued) {
        this.nextQueued = true;
        Laya.timer.once(
          GameConfig.nextModuleDelayMs,
          this,
          () => {
            this.nextQueued = false;
            if (this.phase === "building" /* Building */) {
              this.spawnNextModule();
            }
          }
        );
      }
    }
    spawnNextModule() {
      const definition = GameConfig.modules[this.modules.length];
      if (!definition) {
        this.completeBuild();
        return;
      }
      const roll = ModuleRoller.roll(
        definition.kind,
        this.progressStore.snapshot
      );
      this.moduleRolls[definition.kind] = roll;
      const topY = this.getStackTopY();
      const spawnY = Math.max(
        330 + definition.height / 2,
        topY - GameConfig.spawnGap
      );
      const module = new RocketModule(
        definition,
        Laya.stage.width / 2,
        spawnY,
        this.modules.length,
        roll.level,
        roll.baseLevel
      );
      this.structureStableMs = 0;
      this.modules.push(module);
      this.current = module;
      this.world.addChild(
        module.node
      );
      syncBodyToNode(module.body);
      const luckyText = roll.bonusLevel > 0 ? ` ✦ +${roll.bonusLevel}` : "";
      this.hud.setProgress(
        this.modules.length,
        GameConfig.modules.length,
        `下一块：${definition.label} Lv.${roll.level}${luckyText} · ${this.modules.length}/${GameConfig.modules.length}`
      );
      this.refreshAccountHud();
    }
    getStackTopY() {
      let top = this.platformY - GameConfig.platformHeight / 2;
      for (const module of this.modules) {
        if (!module.released) {
          continue;
        }
        top = Math.min(
          top,
          module.node.y - module.definition.height / 2
        );
      }
      return top;
    }
    isStructureConnected() {
      return structureConnected(this.modules, {
        x: this.platformNode.x,
        y: this.platformY,
        width: GameConfig.platformWidth,
        height: GameConfig.platformHeight,
        rotation: 0
      });
    }
    detectCollapse() {
      const w = Laya.stage.width;
      const h = Laya.stage.height;
      for (const module of this.modules) {
        if (!module.released) {
          continue;
        }
        if (module.node.y > h + 160 || module.node.x < -160 || module.node.x > w + 160) {
          return true;
        }
        if (module.settled && Math.abs(
          this.normalizedAngle(
            module.body.rotation
          )
        ) > GameConfig.maxSafeTilt) {
          return true;
        }
      }
      return false;
    }
    failBuild() {
      if (this.phase !== "building" /* Building */ && this.phase !== "launch_ready" /* LaunchReady */) return;
      this.destroyActionButton();
      this.phase = "build_failed" /* BuildFailed */;
      this.buildDragging = false;
      this.hud.setFailure();
      PlatformManager.current.vibrate("heavy");
      Laya.timer.once(
        GameConfig.restartDelayMs,
        this,
        this.resetBuild
      );
    }
    completeBuild() {
      if (this.phase !== "building" /* Building */) {
        return;
      }
      this.phase = "launch_ready" /* LaunchReady */;
      this.buildDragging = false;
      this.current = null;
      this.assembly = new RocketAssembly(
        this.modules
      );
      this.buildMetrics = this.assembly.calculateMetrics(
        this.modules[0].node.x
      );
      this.runStats = createRunRocketStats(
        this.moduleRolls
      );
      const luckyCount = this.modules.filter(
        (module) => module.isLucky
      ).length;
      this.hud.setBuildReady(
        this.buildMetrics,
        luckyCount
      );
      PlatformManager.current.vibrate("medium");
      this.showActionButton(
        "点火发射",
        () => this.launchRocket()
      );
    }
    launchRocket() {
      if (this.phase !== "launch_ready" /* LaunchReady */ || !this.assembly || !this.buildMetrics || !this.runStats) {
        return;
      }
      if (this.detectCollapse() || !this.isStructureConnected()) {
        this.failBuild();
        return;
      }
      if (!structureSlow(this.modules) || this.structureStableMs < GameConfig.settleMs) return;
      this.buildMetrics = this.assembly.calculateMetrics(this.modules[0].node.x);
      this.phase = "launching" /* Launching */;
      GameAudio.play("ignite");
      this.buildGuide.visible = false;
      this.destroyActionButton();
      this.rocketHp = GameConfig.rocketMaxHp;
      this.damageCooldownMs = 0;
      this.runAltitudeMeters = 0;
      this.runMetal = 0;
      this.runChips = 0;
      this.newRecordDuringRun = false;
      this.recordTargetMeters = this.progressStore.snapshot.bestAltitudeMeters;
      this.assembly.lockStructure();
      this.removePlatformCollider();
      this.hud.setIgnition(
        this.buildMetrics,
        this.rocketHp,
        GameConfig.rocketMaxHp
      );
      this.refreshRunHud();
      PlatformManager.current.vibrate("heavy");
      Laya.timer.once(
        GameConfig.launchDelayMs,
        this,
        () => {
          var _a;
          if (this.phase !== "launching" /* Launching */ || !this.assembly || !this.buildMetrics || !this.runStats) {
            return;
          }
          this.phase = "stage1_flight" /* Stage1Flight */;
          if (this.platformNode) {
            this.platformNode.visible = false;
          }
          this.flight = new RocketFlightController(
            this.assembly,
            this.buildMetrics,
            this.runStats,
            {
              onTelemetry: (stage, fuelRatio, input) => this.onFlightTelemetry(
                stage,
                fuelRatio,
                input
              ),
              onStageSeparation: () => this.onStageSeparation(),
              onStage2Ignition: () => this.onStage2Ignition(),
              onEscapeRequested: (reason, motion) => this.beginEscape(
                reason,
                motion
              )
            }
          );
          this.flight.start();
          this.obstacleManager.setMode("stage1");
          this.pickupManager.setMode("stage1");
          const e2e = (_a = globalThis.location) == null ? void 0 : _a.search.includes("e2e");
          this.routes.setSeed(e2e ? 2447445413 : Math.floor(Math.random() * 4294967296));
          this.routes.setMode("stage1");
        }
      );
    }
    onFlightTelemetry(stage, fuelRatio, input) {
      if (!this.buildMetrics) {
        return;
      }
      this.hud.setStageFlight(
        stage,
        fuelRatio,
        this.buildMetrics,
        input,
        this.rocketHp,
        GameConfig.rocketMaxHp
      );
    }
    onStageSeparation() {
      var _a, _b, _c;
      this.phase = "stage_separation" /* StageSeparation */;
      GameAudio.play("separate");
      const joint = (_a = this.modules[2]) == null ? void 0 : _a.node;
      if (joint) (_b = this.feedback) == null ? void 0 : _b.burst(joint.x, joint.y, "#9BDDF8", "major");
      (_c = this.flight) == null ? void 0 : _c.setInput(0);
      this.obstacleManager.setMode(null);
      this.pickupManager.setMode(null);
      this.routes.setMode(null);
      this.hud.setStageSeparation(
        this.rocketHp,
        GameConfig.rocketMaxHp
      );
      PlatformManager.current.vibrate("heavy");
    }
    onStage2Ignition() {
      var _a, _b;
      this.phase = "stage2_flight" /* Stage2Flight */;
      GameAudio.play("ignite");
      const thruster = (_a = this.modules[2]) == null ? void 0 : _a.node;
      if (thruster) (_b = this.feedback) == null ? void 0 : _b.burst(thruster.x, thruster.y, "#FFCE84", "major");
      this.buildMetrics = this.assembly.calculateMetrics(this.modules[2].node.x);
      this.resumeHeldControl();
      this.hud.setStage2Ignition(
        this.rocketHp,
        GameConfig.rocketMaxHp
      );
      this.obstacleManager.setMode("stage2");
      this.pickupManager.setMode("stage2");
      this.routes.setMode("stage2");
      PlatformManager.current.vibrate("medium");
    }
    onObstacleHit(hit) {
      var _a;
      if (hit.target === "rocket") {
        return this.onRocketObstacleHit(hit.targetNodeName);
      }
      if (hit.target === "astronaut" && this.phase === "astronaut_flight" /* AstronautFlight */ && this.astronaut) {
        if (this.damageCooldownMs > 0) return true;
        this.damageCooldownMs = GameConfig.damageCooldownMs;
        this.astronaut.damageEnergy(
          GameConfig.astronautObstacleEnergyDamage
        );
        GameAudio.play("hit");
        (_a = this.feedback) == null ? void 0 : _a.burst(this.astronaut.node.x, this.astronaut.node.y, "#FFA2A2", "major");
        this.hud.setAstronautDamaged();
        PlatformManager.current.vibrate("medium");
        return true;
      }
      return false;
    }
    onRocketObstacleHit(targetNodeName) {
      var _a, _b;
      if (!this.isRocketControlPhase() || !this.assembly || !this.flight) {
        return false;
      }
      if (!this.assembly.isActiveNodeName(
        targetNodeName
      )) {
        return false;
      }
      if (this.damageCooldownMs > 0) {
        return true;
      }
      this.damageCooldownMs = GameConfig.damageCooldownMs;
      this.rocketHp = Math.max(
        0,
        this.rocketHp - 1
      );
      GameAudio.play("hit");
      const impactNode = (_a = this.modules.find((m) => m.node.name === targetNodeName)) == null ? void 0 : _a.node;
      if (impactNode) (_b = this.feedback) == null ? void 0 : _b.burst(impactNode.x, impactNode.y, "#FF9C88", "major");
      this.hud.setRocketDamaged(
        this.rocketHp,
        GameConfig.rocketMaxHp
      );
      PlatformManager.current.vibrate("heavy");
      if (this.rocketHp <= 0) {
        this.flight.requestEscape(
          "damage"
        );
      }
      return true;
    }
    onPickupHit(hit) {
      if (hit.target === "rocket") {
        if (!this.isRocketControlPhase() || !this.assembly || !this.flight || !this.assembly.isActiveNodeName(
          hit.targetNodeName
        )) {
          return false;
        }
        if (hit.type === "fuel") {
          this.flight.addFuel(
            this.phase === "stage1_flight" /* Stage1Flight */ ? GameConfig.stage1FuelPickupRatio : GameConfig.stage2FuelPickupRatio
          );
        } else if (hit.type === "metal") {
          this.runMetal += 1;
        } else if (hit.type === "chip") {
          this.runChips += 1;
        } else {
          return false;
        }
        this.pickupFeedback(hit);
        this.refreshRunHud();
        PlatformManager.current.vibrate("light");
        return true;
      }
      if (hit.target === "astronaut" && this.phase === "astronaut_flight" /* AstronautFlight */ && this.astronaut) {
        if (hit.type === "suit_energy") {
          this.astronaut.addEnergySeconds(GameConfig.suitEnergyRestoreSeconds);
        } else if (hit.type === "metal") {
          this.runMetal += 1;
        } else if (hit.type === "chip") {
          this.runChips += 1;
        } else {
          return false;
        }
        this.pickupFeedback(hit);
        this.refreshRunHud();
        PlatformManager.current.vibrate("light");
        return true;
      }
      return false;
    }
    beginEscape(reason, motion) {
      var _a, _b, _c;
      if (!this.assembly || this.phase === "escape" /* Escape */ || this.phase === "astronaut_flight" /* AstronautFlight */ || this.phase === "result" /* Result */) {
        return;
      }
      this.phase = "escape" /* Escape */;
      (_a = this.flight) == null ? void 0 : _a.setInput(0);
      this.obstacleManager.setMode(null);
      this.pickupManager.setMode(null);
      this.routes.setMode(null);
      const spawn = this.assembly.getEscapeSpawnPoint();
      const drift = (_c = (_b = this.buildMetrics) == null ? void 0 : _b.drift) != null ? _c : 0;
      this.assembly.releaseActiveAsWreck(
        motion.horizontalVelocity,
        motion.verticalVelocity,
        drift
      );
      this.hud.setEscape(
        reason
      );
      PlatformManager.current.vibrate("heavy");
      Laya.timer.once(
        GameConfig.escapeTransitionMs,
        this,
        () => {
          if (this.phase !== "escape" /* Escape */) {
            return;
          }
          this.startAstronaut(
            spawn
          );
        }
      );
    }
    startAstronaut(spawn) {
      if (!this.runStats) {
        return;
      }
      this.phase = "astronaut_flight" /* AstronautFlight */;
      const energySeconds = GameConfig.astronautEnergySeconds * this.runStats.escapeEnergyMultiplier;
      this.astronaut = new AstronautController(
        this.world,
        spawn,
        energySeconds,
        {
          onEnergy: (energyRatio, input) => {
            this.hud.setAstronautFlight(
              energyRatio,
              input
            );
          },
          onComplete: () => this.completeRun()
        }
      );
      this.astronaut.start();
      this.resumeHeldControl();
      this.obstacleManager.setMode("astronaut");
      this.pickupManager.setMode("astronaut");
      this.routes.setMode("astronaut");
    }
    resumeHeldControl() {
      var _a, _b;
      this.controlDragging = this.pointerHeld;
      const input = this.pointerHeld ? this.lastControlInput : 0;
      const distance = this.phase === "astronaut_flight" /* AstronautFlight */ ? GameConfig.astronautControlDragDistance : GameConfig.flightControlDragDistance;
      this.controlPointerStartX = Laya.stage.mouseX - input * distance;
      if (this.phase === "astronaut_flight" /* AstronautFlight */) (_a = this.astronaut) == null ? void 0 : _a.setInput(input);
      else (_b = this.flight) == null ? void 0 : _b.setInput(input);
    }
    completeRun() {
      if (this.phase !== "astronaut_flight" /* AstronautFlight */) {
        return;
      }
      this.phase = "result" /* Result */;
      this.feedback.clear();
      this.controlDragging = false;
      this.obstacleManager.setMode(null);
      this.pickupManager.setMode(null);
      this.routes.setMode(null);
      this.hud.setRunComplete();
      this.lastSettlement = this.progressStore.settleRun(
        this.runAltitudeMeters,
        this.runMetal,
        this.runChips
      );
      this.showResultPanel();
      PlatformManager.current.vibrate("medium");
    }
    showResultPanel() {
      if (!this.lastSettlement) {
        return;
      }
      const progress = this.progressStore.snapshot;
      this.upgradePanel.show(
        this.lastSettlement,
        progress,
        this.createUpgradeOptions(),
        (key) => this.onUpgrade(key),
        () => {
          this.upgradePanel.hide();
          this.resetBuild();
        }
      );
    }
    onUpgrade(key) {
      if (this.progressStore.tryUpgrade(key)) {
        PlatformManager.current.vibrate("medium");
        GameAudio.play("upgrade");
        this.showResultPanel();
      } else {
        PlatformManager.current.vibrate("light");
      }
    }
    createUpgradeOptions() {
      const progress = this.progressStore.snapshot;
      const labels = {
        engine: "发动机",
        fuel: "燃料仓",
        cockpit: "驾驶舱",
        escape: "逃生舱"
      };
      const keys = [
        "engine",
        "fuel",
        "cockpit",
        "escape"
      ];
      return keys.map(
        (key) => ({
          key,
          label: labels[key],
          level: progress.upgrades[key],
          maxLevel: this.progressStore.maxLevel,
          cost: this.progressStore.getUpgradeCost(
            key
          ),
          canUpgrade: this.progressStore.canUpgrade(key)
        })
      );
    }
    resetBuild() {
      var _a, _b, _c, _d, _e;
      this.feedback.clear();
      this.milestone = 0;
      this.animationMs = 0;
      this.destroyActionButton();
      (_a = this.homePanel) == null ? void 0 : _a.hide();
      this.hud.setVisible(true);
      this.world.visible = true;
      this.backdrop.setVisible(true);
      if (this.platformNode) {
        this.platformNode.visible = true;
      }
      (_b = this.upgradePanel) == null ? void 0 : _b.hide();
      this.obstacleManager.setMode(null);
      this.pickupManager.setMode(null);
      this.routes.setMode(null);
      (_c = this.flight) == null ? void 0 : _c.stop();
      this.flight = null;
      (_d = this.astronaut) == null ? void 0 : _d.destroy();
      this.astronaut = null;
      (_e = this.assembly) == null ? void 0 : _e.unlockStructure();
      this.assembly = null;
      this.buildMetrics = null;
      this.runStats = null;
      for (const module of this.modules) {
        module.node.destroy(true);
      }
      this.modules.length = 0;
      this.moduleRolls = {};
      this.current = null;
      this.nextQueued = false;
      this.structureStableMs = 0;
      this.hudElapsedMs = 0;
      this.pointerHeld = false;
      this.buildDragging = false;
      this.controlDragging = false;
      this.damageCooldownMs = 0;
      this.rocketHp = GameConfig.rocketMaxHp;
      this.lastControlInput = 0;
      this.runAltitudeMeters = 0;
      this.runMetal = 0;
      this.runChips = 0;
      this.newRecordDuringRun = false;
      this.lastSettlement = null;
      this.createPlatformCollider();
      this.phase = "building" /* Building */;
      this.refreshAccountHud();
      this.spawnNextModule();
    }
    refreshRunHud() {
      this.hud.setRunProgress(
        this.runAltitudeMeters,
        this.recordTargetMeters,
        this.runMetal,
        this.runChips,
        this.newRecordDuringRun
      );
    }
    refreshAccountHud() {
      const progress = this.progressStore.snapshot;
      this.hud.setAccountSummary(
        progress.marsCoins,
        progress.metal,
        progress.chips,
        progress.bestAltitudeMeters
      );
    }
    showHome(startInUpgrade = false) {
      var _a;
      this.phase = "home" /* Home */;
      this.destroyActionButton();
      (_a = this.upgradePanel) == null ? void 0 : _a.hide();
      this.hud.setVisible(false);
      this.world.visible = false;
      this.backdrop.setVisible(false);
      this.homePanel.show(
        this.progressStore.snapshot,
        this.createUpgradeOptions(),
        () => this.startBuildFromHome(),
        (key) => this.onHomeUpgrade(key),
        startInUpgrade
      );
    }
    startBuildFromHome() {
      this.homePanel.hide();
      this.hud.setVisible(true);
      this.world.visible = true;
      this.backdrop.setVisible(true);
      if (this.platformNode) {
        this.platformNode.visible = true;
      }
      this.phase = "building" /* Building */;
      this.refreshAccountHud();
      if (this.modules.length === 0) {
        this.spawnNextModule();
      }
    }
    onHomeUpgrade(key) {
      if (this.progressStore.tryUpgrade(key)) {
        GameAudio.play("upgrade");
        PlatformManager.current.vibrate("medium");
      } else {
        PlatformManager.current.vibrate("light");
      }
      this.showHome(true);
    }
    updateBuildGuide() {
      var _a;
      const visible = this.phase === "building" /* Building */ && !!this.current && !this.current.released;
      this.buildGuide.visible = visible;
      if (!visible) return;
      const below = this.modules[this.modules.length - 2];
      const x = (_a = below == null ? void 0 : below.node.x) != null ? _a : this.platformNode.x;
      const top = this.getStackTopY();
      const key = `${x.toFixed(1)}:${top.toFixed(1)}:${this.current.node.x.toFixed(1)}:${this.current.definition.width}`;
      if (key === this.guideKey) return;
      this.guideKey = key;
      const g = this.buildGuide.graphics;
      g.clear();
      for (let y = 320; y < top; y += 24) g.drawLine(x, y, x, y + 10, "#A7DBEF", 2);
      g.drawRect(
        this.current.node.x - this.current.definition.width / 2,
        top - 6,
        this.current.definition.width,
        6,
        "#8FDEBD55"
      );
    }
    reclaimDebris() {
      if (!this.assembly || !this.isFlightRuntimePhase() && this.phase !== "astronaut_flight" /* AstronautFlight */) return;
      for (let index = 0; index < this.modules.length; index++) {
        const module = this.modules[index];
        if (!module.node.destroyed && module.body.enabled && !this.assembly.isActiveNodeName(module.node.name) && module.node.y > Laya.stage.height + 180) {
          this.assembly.deactivateDebris(index);
        }
      }
    }
    pickupFeedback(hit) {
      var _a;
      const module = this.modules.find((m) => m.node.name === hit.targetNodeName);
      const node = hit.target === "astronaut" ? (_a = this.astronaut) == null ? void 0 : _a.node : module == null ? void 0 : module.node;
      const labels = { fuel: "燃料 +6秒", metal: "金属 +1", chip: "芯片 +1", suit_energy: "能源 +5秒" };
      const label = hit.type === "fuel" && this.phase === "stage2_flight" /* Stage2Flight */ ? "燃料 +4秒" : labels[hit.type];
      if (node) this.feedback.show(node.x, node.y - 65, label, hit.type === "chip" ? "#DBC9FF" : "#C7F3DE");
      GameAudio.play("pickup");
    }
    getBackdropScrollSpeed() {
      var _a, _b, _c, _d;
      const multiplier = this.phase === "stage1_flight" /* Stage1Flight */ ? (_b = (_a = this.runStats) == null ? void 0 : _a.stage1EngineMultiplier) != null ? _b : 1 : this.phase === "stage2_flight" /* Stage2Flight */ ? (_d = (_c = this.runStats) == null ? void 0 : _c.stage2EngineMultiplier) != null ? _d : 1 : 1;
      if (this.phase === "stage1_flight" /* Stage1Flight */) {
        return 72 * multiplier;
      }
      if (this.phase === "stage_separation" /* StageSeparation */) {
        return 46;
      }
      if (this.phase === "stage2_flight" /* Stage2Flight */) {
        return 104 * multiplier;
      }
      if (this.phase === "astronaut_flight" /* AstronautFlight */) {
        return 82;
      }
      return 0;
    }
    showActionButton(labelText, onClick) {
      this.destroyActionButton();
      const button = this.actionButton = new Laya.Sprite();
      const width = 300;
      const height = 76;
      button.name = "prototype_action_button";
      button.size(
        width,
        height
      );
      button.pivot(
        width / 2,
        height / 2
      );
      button.pos(
        Laya.stage.width / 2,
        282
      );
      button.graphics.drawRect(
        0,
        0,
        width,
        height,
        "#2B78D0",
        "#77B9FF",
        3
      );
      button.mouseEnabled = true;
      const text = new Laya.Text();
      text.text = labelText;
      text.color = "#FFFFFF";
      text.fontSize = 28;
      text.bold = true;
      text.align = "center";
      text.valign = "middle";
      text.size(
        width,
        height
      );
      button.addChild(text);
      this.root.addChild(button);
      button.on(
        Laya.Event.CLICK,
        this,
        () => onClick()
      );
    }
    destroyActionButton() {
      if (!this.actionButton) {
        return;
      }
      this.actionButton.destroy(true);
      this.actionButton = null;
    }
    isIdlePhase() {
      return this.phase === "home" /* Home */ || this.phase === "result" /* Result */;
    }
    isRocketControlPhase() {
      return this.phase === "stage1_flight" /* Stage1Flight */ || this.phase === "stage2_flight" /* Stage2Flight */;
    }
    isFlightRuntimePhase() {
      return this.phase === "stage1_flight" /* Stage1Flight */ || this.phase === "stage_separation" /* StageSeparation */ || this.phase === "stage2_flight" /* Stage2Flight */;
    }
    normalizedAngle(angle) {
      let value = angle % 360;
      if (value > 180) {
        value -= 360;
      }
      if (value < -180) {
        value += 360;
      }
      return value;
    }
    clamp(value, min, max) {
      return Math.max(
        min,
        Math.min(
          max,
          value
        )
      );
    }
    onResize() {
      var _a;
      if (!this.hud) return;
      this.drawBackground();
      this.backdrop.resize();
      this.homePanel.resize();
      const nextY = Laya.stage.height - Math.max(GameConfig.platformBottom, Laya.stage.height * 0.09);
      const deltaY = nextY - this.platformY;
      this.platformY = nextY;
      if (this.platformNode) {
        this.platformNode.pos(Laya.stage.width / 2, nextY);
        if (this.platformCollider) syncBodyToNode(this.platformCollider);
      }
      if (["building" /* Building */, "build_failed" /* BuildFailed */, "launch_ready" /* LaunchReady */].indexOf(this.phase) >= 0) {
        for (const module of this.modules) {
          module.node.y += deltaY;
          syncBodyToNode(module.body);
        }
      }
      this.hud.layout();
      (_a = this.pauseUI) == null ? void 0 : _a.layout();
      if (this.phase === "result" /* Result */) this.showResultPanel();
      if (this.actionButton) {
        this.actionButton.x = Laya.stage.width / 2;
      }
    }
  };

  // assets/scripts/Entry.ts
  Laya.addBeforeInitCallback(() => {
    Laya.Physics2DOption.customUpdate = true;
    if (globalThis.location && new URLSearchParams(location.search).get("quality") === "low") {
      Laya.Config.useRetinalCanvas = false;
    }
  });
  function main() {
    return __async(this, null, function* () {
      var _a;
      Laya.stage.bgColor = "#081426";
      const isTouchMiniGame = !!globalThis.wx || !!globalThis.tt;
      const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(((_a = globalThis.navigator) == null ? void 0 : _a.userAgent) || "");
      let lastLayout = "";
      const syncOrientation = () => {
        const desktopLandscape = !isTouchMiniGame && !mobileUA && globalThis.innerWidth > globalThis.innerHeight;
        const layout = desktopLandscape ? "desktop" : "portrait";
        if (layout === lastLayout) return;
        lastLayout = layout;
        Laya.stage.screenMode = desktopLandscape ? Laya.Stage.SCREEN_NONE : Laya.Stage.SCREEN_VERTICAL;
        Laya.stage.scaleMode = desktopLandscape ? Laya.Stage.SCALE_SHOWALL : Laya.Stage.SCALE_FIXED_AUTO;
      };
      syncOrientation();
      Laya.stage.on(Laya.Event.RESIZE, null, syncOrientation);
      Laya.stage.alignH = Laya.Stage.ALIGN_CENTER;
      Laya.stage.alignV = Laya.Stage.ALIGN_MIDDLE;
      yield Laya.Physics2D.I.enable();
      configurePhysicsCompatibility();
      yield GameplayArt.preload();
      console.info(`[Mars Prototype] platform=${PlatformManager.current.name}`);
      const prototype = new BuildPrototype();
      prototype.mount(Laya.stage);
      const location2 = globalThis.location;
      if (location2 && (location2.hostname === "localhost" || location2.hostname === "127.0.0.1") && new URLSearchParams(location2.search).has("e2e")) {
        globalThis.__MARS_GAME__ = prototype;
      }
    });
  }

  // INDEX:bundle.js
  window.$_main_ = main;
})();
