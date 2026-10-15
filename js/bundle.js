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

  // assets/scripts/config/GameConfig.ts
  var GameConfig = {
    designWidth: 750,
    designHeight: 1334,
    platformWidth: 520,
    platformHeight: 36,
    platformBottom: 120,
    craneModuleTop: 430,
    craneSpeed: 180,
    craneEdgeMargin: 70,
    craneRetractMs: 360,
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
    milestoneStepMeters: 2e3,
    routeWaveMs: 5400,
    routePickupGapMs: 700,
    pickupWeights: {
      stage1: { supply: 0.2, metal: 0.75, chip: 0.05 },
      stage2: { supply: 0.26, metal: 0.44, chip: 0.3 },
      astronaut: { supply: 0.25, metal: 0.35, chip: 0.4 }
    },
    escapeTransitionMs: 700,
    // Limit catch-up work to avoid 10+ Box2D substeps after a long frame.
    maxPhysicsSubstepsPerFrame: 5,
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
  function cappedPhysicsAccumulator(previousMs, frameDeltaMs, stepMs = 1e3 / 60, maxSubsteps = GameConfig.maxPhysicsSubstepsPerFrame) {
    const safeStepMs = Math.max(1e-3, stepMs);
    const budgetMs = safeStepMs * Math.max(1, Math.floor(maxSubsteps));
    return Math.min(
      budgetMs,
      Math.max(0, previousMs) + Math.max(0, Math.min(250, frameDeltaMs))
    );
  }

  // assets/scripts/prototype/MissionUi.ts
  var _MissionUi = class _MissionUi {
    static texture(name) {
      return Laya.loader.getRes(
        _MissionUi.prefix + name + (["home", "flight", "hangar", "launch_earth_v7", "mountains_v7", "cloudsea_v7", "atmosphere_v7"].indexOf(name) >= 0 ? ".jpg" : ".png")
      );
    }
    static picture(parent, name, x, y, w, h) {
      const node = new Laya.Sprite();
      node.name = "mission_art_" + name;
      node.mouseEnabled = false;
      node.size(w, h).pos(x, y);
      const texture = this.texture(name);
      if (texture) {
        const scale = Math.min(w / texture.width, h / texture.height);
        const dw = texture.width * scale, dh = texture.height * scale;
        node.graphics.drawTexture(texture, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }
      parent.addChild(node);
      return node;
    }
    static background(parent, name) {
      const node = new Laya.Sprite();
      node.name = "mission_background_" + name;
      node.mouseEnabled = false;
      const w = Laya.stage.width, h = Laya.stage.height;
      const texture = this.texture(name);
      if (texture) {
        const scale = name === "hangar" ? Math.max(
          w / texture.width,
          (h - Math.max(GameConfig.platformBottom, h * 0.09) - GameConfig.platformHeight / 2) / (texture.height * 0.724)
        ) : Math.max(w / texture.width, h / texture.height);
        const top = name === "hangar" ? 0 : (h - texture.height * scale) / 2;
        node.graphics.drawTexture(
          texture,
          (w - texture.width * scale) / 2,
          top,
          texture.width * scale,
          texture.height * scale
        );
      }
      parent.addChildAt(node, 0);
      return node;
    }
    static roundedPoints(x, y, w, h, radius) {
      const r = Math.max(1, Math.min(radius, w / 2, h / 2));
      const points = [];
      const corners = [
        [x + w - r, y + r, -90],
        [x + w - r, y + h - r, 0],
        [x + r, y + h - r, 90],
        [x + r, y + r, 180]
      ];
      for (const [cx, cy, start] of corners) {
        for (let i = 0; i <= 6; i++) {
          const angle = (start + i * 90 / 6) * Math.PI / 180;
          points.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        }
      }
      return points;
    }
    static panel(g, w, h) {
      g.clear();
      if (h >= 240 && w >= 300) {
        const texture = this.texture("panel");
        if (texture) {
          g.draw9Grid(texture, 0, 0, w, h, [38, 74, 38, 74, 0]);
          return;
        }
      }
      const r = Math.min(20, h * 0.16);
      g.drawPoly(0, 0, this.roundedPoints(0, 3, w, h - 3, r), "#051329", "#2B70A4", 2);
      g.drawPoly(0, 0, this.roundedPoints(2, 2, w - 4, h - 8, r), "#102D50", "#5688A8", 2);
      g.drawRect(r + 14, 5, Math.max(0, w - (r + 14) * 2), 2, "#8BC7DE");
    }
    static text(parent, value, x, y, w, h, size, color = "#F4F9FF", bold = false, align = "center") {
      const t = new Laya.Text();
      t.text = value;
      t.color = color;
      t.fontSize = size;
      t.bold = bold;
      t.font = _MissionUi.font;
      t.align = align;
      t.valign = "middle";
      t.size(w, h).pos(x, y);
      t.mouseEnabled = false;
      if (bold) {
        t.stroke = 1;
        t.strokeColor = "#10213F";
      }
      parent.addChild(t);
      return t;
    }
    static button(value, w, h, gold = false) {
      const node = new Laya.Sprite();
      node.size(w, h);
      node.name = "ui_button_" + value;
      node.mouseEnabled = true;
      const face = new Laya.Sprite();
      face.name = "button_skin";
      face.mouseEnabled = false;
      face.size(w, h);
      node.addChild(face);
      const texture = this.texture(gold ? "button_gold" : "button_blue");
      if (texture) {
        const scale = (h - 3) / texture.height;
        face.scale(scale, scale);
        face.graphics.draw9Grid(texture, 0, 0, w / scale, texture.height, [48, Math.min(112, texture.width * 0.16), 48, Math.min(112, texture.width * 0.16), 0]);
      } else {
        face.graphics.drawPoly(0, 0, this.roundedPoints(0, 3, w, h - 3, h * 0.32), gold ? "#75421E" : "#123552");
        face.graphics.drawPoly(0, 0, this.roundedPoints(0, 0, w, h - 7, h * 0.32), gold ? "#F8BD52" : "#2876AB", gold ? "#FFE9B1" : "#8BD5EA", 2);
      }
      const glyphs = Array.from(value).length;
      const font = Math.max(18, Math.min(w <= 190 ? 28 : 39, Math.floor(h * 0.37), Math.floor((w - 32) / Math.max(1, glyphs))));
      const label = this.text(node, value, 14, -2, w - 28, h - 4, font, gold ? "#573112" : "#F1FAFF", true);
      label.name = "button_label";
      label.strokeColor = gold ? "#FFE8B0" : "#114666";
      label.stroke = 0.7;
      const down = () => {
        face.y = 3;
        face.alpha = 0.9;
        label.y = 1;
      };
      const up = () => {
        face.y = 0;
        face.alpha = 1;
        label.y = -2;
      };
      node.on(Laya.Event.MOUSE_DOWN, node, down);
      node.on(Laya.Event.MOUSE_UP, node, up);
      node.on(Laya.Event.MOUSE_OUT, node, up);
      return node;
    }
  };
  _MissionUi.names = ["logo", "button_gold", "button_blue", "panel", "coin", "home", "flight", "hangar"];
  _MissionUi.prefix = "art/mission/";
  _MissionUi.font = "Microsoft YaHei, Noto Sans CJK SC, PingFang SC, sans-serif";
  var MissionUi = _MissionUi;

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

  // assets/scripts/prototype/GameplayArt.ts
  var _GameplayArt = class _GameplayArt {
    static preload() {
      return __async(this, null, function* () {
        if (!Laya.loader) return;
        yield Promise.all(_GameplayArt.assetUrls.map((url) => __async(null, null, function* () {
          try {
            yield Laya.loader.load(url);
          } catch (error) {
            throw new Error(`[MarsArt] required artwork could not load: ${url}`);
          }
        })));
      });
    }
    static paint(g, name, width, height) {
      var _a;
      const texture = (_a = Laya.loader) == null ? void 0 : _a.getRes(`art/mission/${name === "hud_panel" ? "panel" : name}.png`);
      if (!texture) return false;
      g.clear();
      if (name === "hud_panel") g.draw9Grid(texture, 0, 0, width, height, [42, 42, 42, 42, 0]);
      else {
        const scale = Math.min(width / texture.width, height / texture.height);
        const w = texture.width * scale, h = texture.height * scale;
        g.drawTexture(texture, (width - w) / 2, (height - h) / 2, w, h);
      }
      return true;
    }
    static module(g, kind, w, h, lucky = false) {
      if (_GameplayArt.paint(g, kind + "_v7", w, h) || _GameplayArt.paint(g, kind, w, h)) {
        if (lucky) g.drawCircle(w * 0.89, h * 0.17, Math.min(w, h) * 0.095, "#FFF1A3", "#E9A839", 2);
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
      if (type === "suit_energy") {
        g.clear();
        g.drawCircle(size / 2, size / 2, size * 0.43, "#123C50", "#71E9D4", 3);
        g.drawPoly(0, 0, [size * 0.56, size * 0.13, size * 0.29, size * 0.54, size * 0.47, size * 0.54, size * 0.4, size * 0.85, size * 0.74, size * 0.42, size * 0.56, size * 0.42], "#BCFFF1", "#EBFFF8", 1);
        return;
      }
      if (_GameplayArt.paint(g, type, size, size)) return;
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
      if (_GameplayArt.paint(g, "asteroid", w, h)) return;
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
      if (_GameplayArt.paint(g, "astronaut", w, h)) return;
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
  /** Preload shared HD PNG textures only once; preserve geometry if loading fails. */
  _GameplayArt.assetNames = [
    "stage1_engine",
    "stage1_tank",
    "stage2_engine",
    "stage2_tank",
    "escape",
    "cockpit",
    "astronaut",
    "asteroid",
    "fuel",
    "metal",
    "chip",
    "suit_energy",
    "hud_panel"
  ];
  _GameplayArt.assetUrls = [
    ..._GameplayArt.assetNames.filter((name) => name !== "hud_panel").map((name) => `art/mission/${name}.png`),
    ...["home", "hangar", "flight"].map((name) => `art/mission/${name}.jpg`),
    ...["logo", "button_gold", "button_blue", "panel", "coin"].map((name) => `art/mission/${name}.png`),
    ...["stage1_engine", "stage1_tank", "stage2_engine", "stage2_tank", "escape", "cockpit"].map((name) => `art/mission/${name}_v7.png`),
    ...["launch_earth_v7", "mountains_v7", "cloudsea_v7", "atmosphere_v7"].map((name) => `art/mission/${name}.jpg`),
    ...["cloud_v7", "airplane_v7", "thrust_v7", "platform_v7"].map((name) => `art/mission/${name}.png`)
  ];
  var GameplayArt = _GameplayArt;

  // assets/scripts/prototype/PauseOverlay.ts
  var PauseOverlay = class {
    constructor(root, onToggle, onRestart, onHome) {
      this.root = root;
      this.onToggle = onToggle;
      this.onRestart = onRestart;
      this.onHome = onHome;
      this.button = new Laya.Sprite();
      this.modal = null;
      this.active = false;
      this.paused = false;
      this.button.name = "mission_pause_button";
      this.button.size(98, 86);
      this.button.mouseEnabled = true;
      MissionUi.panel(this.button.graphics, 98, 86);
      this.label(this.button, "暂停", 0, 0, 98, 86, 24, "#EFF9FF", true);
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
      this.button.pos(Laya.stage.width - 114, 16);
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
      const cw = Math.min(594, w - 48), ch = 720;
      const x = (w - cw) / 2, y = (h - ch) / 2;
      const card = new Laya.Sprite();
      card.pos(x, y);
      MissionUi.panel(card.graphics, cw, ch);
      overlay.addChild(card);
      const mascot = new Laya.Sprite();
      GameplayArt.astronaut(mascot.graphics, 148, 182);
      mascot.pos((w - 148) / 2, y - 138);
      mascot.mouseEnabled = false;
      overlay.addChild(mascot);
      this.label(overlay, "远征已暂停", x + 22, y + 44, cw - 44, 68, 45, "#FFF2D9", true);
      this.label(overlay, "准备好了，就继续向星空出发", x + 18, y + 154, cw - 36, 52, 25, "#B9DDE9", false);
      const resume = this.makeButton("继续远征", 360, 87, "#2584BF");
      resume.pos((w - 360) / 2, y + 272);
      resume.on(Laya.Event.CLICK, this, () => this.onToggle(false));
      overlay.addChild(resume);
      const restart = this.makeButton("重新开始", 360, 82, "#2584BF");
      restart.pos((w - 360) / 2, y + 385);
      restart.on(Laya.Event.CLICK, this, this.onRestart);
      overlay.addChild(restart);
      const home = this.makeButton("返回首页", 360, 82, "#2584BF");
      home.pos((w - 360) / 2, y + 492);
      home.on(Laya.Event.CLICK, this, this.onHome);
      overlay.addChild(home);
      const sound = this.makeButton(GameAudio.isMuted ? "打开音效" : "关闭音效", 280, 58, "#26445C");
      sound.pos((w - 280) / 2, y + 632);
      sound.on(Laya.Event.CLICK, this, () => {
        GameAudio.toggle();
        this.drawModal();
      });
      overlay.addChild(sound);
    }
    makeButton(title, w, h, color) {
      return MissionUi.button(title, w, h, title === "继续远征");
    }
    label(root, text, x, y, w, h, size, color, bold) {
      const label = new Laya.Text();
      label.text = text;
      label.color = color;
      label.bold = bold;
      label.font = MissionUi.font;
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
      this.reducedMotion = typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.labels = [];
      this.sparks = [];
      this.textPool = [];
      this.sparkPool = [];
      this.shockwaves = [];
      this.wavePool = [];
      this.serial = 0;
    }
    show(x, y, message, color = "#FFE7AE", tier = "small") {
      if (this.labels.length >= 12) this.recycleText(this.labels.shift().node);
      const text = this.textPool.pop() || new Laya.Text();
      const font = tier === "major" ? 42 : tier === "medium" ? 33 : 28;
      text.text = message;
      text.font = MissionUi.font;
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
      if (this.reducedMotion) return;
      const count = tier === "major" ? 15 : tier === "medium" ? 9 : 5;
      const radius = tier === "major" ? 11 : tier === "medium" ? 7 : 5;
      const duration = tier === "major" ? 680 : 500;
      for (let i = 0; i < count; i++) {
        if (this.sparks.length >= 48) this.recycleSpark(this.sparks.shift().node);
        const sprite = this.sparkPool.pop() || new Laya.Sprite();
        sprite.graphics.clear();
        sprite.graphics.drawPoly(0, 0, [-radius, 0, 0, -radius * 0.38, radius, 0, 0, radius * 0.38], color);
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
    /** Expand/fade a shockwave separately from physics; up to four can be alive. */
    ring(x, y, color) {
      if (this.reducedMotion) return;
      if (this.shockwaves.length >= 4) this.recycleWave(this.shockwaves.shift().node);
      const node = this.wavePool.pop() || new Laya.Sprite();
      node.graphics.clear();
      node.graphics.drawCircle(0, 0, 42, "#00000000", color, 6);
      node.graphics.drawCircle(0, 0, 27, "#00000000", "#FFFFFF66", 2);
      node.pos(x, y);
      node.scale(0.32, 0.32);
      node.alpha = 0.9;
      node.visible = true;
      node.mouseEnabled = false;
      this.root.addChild(node);
      this.shockwaves.push({ node, age: 0, lifetime: 560 });
    }
    update(dt) {
      for (let i = this.labels.length - 1; i >= 0; i--) {
        const item = this.labels[i];
        item.age += dt;
        const t = Math.min(1, item.age / item.duration);
        item.node.y = this.reducedMotion ? item.y : item.y - 64 * (1 - Math.pow(1 - t, 2));
        const scale = this.reducedMotion ? 1 : 1 + 0.08 * (1 - t);
        item.node.scale(scale, scale);
        item.node.alpha = t < 0.64 ? 1 : Math.max(0, (1 - t) / 0.36);
        if (t >= 1) {
          this.recycleText(item.node);
          this.labels.splice(i, 1);
        }
      }
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const item = this.shockwaves[i];
        item.age += dt;
        const t = Math.min(1, item.age / item.lifetime);
        item.node.scale(0.32 + 2.25 * (1 - Math.pow(1 - t, 2)), 0.32 + 2.25 * (1 - Math.pow(1 - t, 2)));
        item.node.alpha = Math.max(0, (1 - t) * 0.9);
        if (t >= 1) {
          this.recycleWave(item.node);
          this.shockwaves.splice(i, 1);
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
      for (const item of this.shockwaves) this.recycleWave(item.node);
      this.shockwaves.length = 0;
    }
    recycleWave(node) {
      node.removeSelf();
      node.visible = false;
      if (this.wavePool.length < 4) this.wavePool.push(node);
      else node.destroy(true);
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

  // assets/scripts/prototype/FlightRoutes.ts
  function rollRoutePickup(mode, random) {
    const weights = GameConfig.pickupWeights[mode];
    if (random < weights.supply) return mode === "astronaut" ? "suit_energy" : "fuel";
    return random < weights.supply + weights.metal ? "metal" : "chip";
  }
  function createRouteWave(mode, width, index, random, previousSafeIndex = 1) {
    const lanes = [160, width / 2, width - 160];
    const previous = Math.max(0, Math.min(2, Math.floor(previousSafeIndex)));
    const step = Math.max(0, Math.min(2, Math.floor(random() * 3))) - 1;
    const safeIndex = index === 0 ? 1 : Math.max(0, Math.min(2, previous + step));
    const safeX = lanes[safeIndex];
    const others = lanes.filter((_, i) => i !== safeIndex);
    const pattern = index % 3;
    const obstacleXs = index === 0 ? [] : pattern === 2 ? others : [others[index % 2]];
    const type = index === 0 ? mode === "astronaut" ? "suit_energy" : "fuel" : pattern === 1 ? "chip" : rollRoutePickup(mode, random());
    return { safeIndex, safeX, obstacleXs, pickups: [0, 1, 2].map((i) => ({
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
      this.lastSafeIndex = 1;
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
      this.lastSafeIndex = 1;
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
      const wave = createRouteWave(this.mode, Laya.stage.width, this.wave++, () => this.random(), this.lastSafeIndex);
      this.lastSafeIndex = wave.safeIndex;
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
      this.secondThrust = new Laya.Sprite();
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
      for (const jet of [this.thrust, this.secondThrust]) {
        jet.graphics.drawCircle(0, 2, 8, "#6FCBFF66");
        jet.graphics.drawPoly(0, 0, [-6, 0, -4, 12, 0, 27, 4, 12, 6, 0], "#FF974C");
        jet.graphics.drawPoly(0, 0, [-3, 0, 0, 19, 3, 0], "#FFF2BC");
        jet.mouseEnabled = false;
        node.addChild(jet);
      }
      this.thrust.pos(12, 63);
      this.secondThrust.pos(43, 63);
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
      const flicker = 0.84 + Math.sin(this.animationMs / 91) * 0.16;
      this.thrust.scale(1, flicker);
      this.secondThrust.scale(1, 1.08 - (flicker - 0.84));
      this.thrust.alpha = 0.9;
      this.secondThrust.alpha = 0.9;
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
      this.scenes = [new Laya.Sprite(), new Laya.Sprite()];
      this.clouds = [];
      this.plane = new Laya.Sprite();
      this.earthLimb = new Laya.Sprite();
      this.lastEarthAltitude = -Infinity;
      this.stars = [];
      this.reducedMotion = typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.altitudes = [0, 1200, 5200, 13e3, 3e4, 65e3, 105e3];
      this.rendered = [-1, -1];
      this.visible = false;
      this.elapsed = 0;
      this.band = 0;
      this.blend = 0;
      this.node.name = "flight_backdrop";
      this.node.mouseEnabled = false;
      root.addChildAt(this.node, 0);
      for (const scene of this.scenes) {
        scene.mouseEnabled = false;
        this.node.addChild(scene);
      }
      this.earthLimb.name = "earth_horizon";
      this.earthLimb.mouseEnabled = false;
      this.node.addChild(this.earthLimb);
      this.createDetails();
      this.reset();
      this.setVisible(false);
    }
    createDetails() {
      const w = Laya.stage.width, h = Laya.stage.height;
      const cloud = MissionUi.texture("cloud_v7");
      if (cloud) for (let i = 0; i < 6; i++) {
        const node = new Laya.Sprite();
        node.name = "atmosphere_cloud_" + i;
        node.mouseEnabled = false;
        const cw = 210 + i % 3 * 45, ch = cw * cloud.height / cloud.width;
        node.graphics.drawTexture(cloud, 0, 0, cw, ch);
        node.size(cw, ch);
        node.pos(i % 2 === 0 ? -cw * 0.5 : w - cw * 0.45, h * (0.18 + i * 0.13));
        this.node.addChild(node);
        this.clouds.push({ node, factor: 0.28 + i % 3 * 0.12, initialY: node.y });
      }
      const plane = MissionUi.texture("airplane_v7");
      if (plane) {
        const pw = 180;
        this.plane.graphics.drawTexture(plane, 0, 0, pw, pw * plane.height / plane.width);
        this.plane.size(pw, pw * plane.height / plane.width);
      }
      this.plane.name = "atmosphere_airplane";
      this.plane.mouseEnabled = false;
      this.node.addChild(this.plane);
      for (let i = 0; i < 12; i++) {
        const node = new Laya.Sprite();
        node.mouseEnabled = false;
        node.graphics.drawCircle(0, 0, i % 4 === 0 ? 2 : 1, "#D6ECFF");
        node.pos(22 + i * 137 % Math.max(100, w - 44), h * (0.06 + i * 0.079 % 0.8));
        this.node.addChild(node);
        this.stars.push({ node, factor: 0.08 + i % 3 * 0.04, initialY: node.y });
      }
    }
    reset() {
      this.rendered = [-1, -1];
      this.elapsed = 0;
      this.lastEarthAltitude = -Infinity;
      for (const item of [...this.clouds, ...this.stars]) item.node.y = item.initialY;
      this.update(0, 0, 0);
    }
    resize() {
      this.node.size(Laya.stage.width, Laya.stage.height);
      for (let i = 0; i < this.clouds.length; i++) {
        const c = this.clouds[i];
        c.node.x = i % 2 === 0 ? -c.node.width * 0.5 : Laya.stage.width - c.node.width * 0.45;
        c.initialY = Laya.stage.height * (0.18 + i * 0.13);
      }
      for (let i = 0; i < this.stars.length; i++) this.stars[i].initialY = Laya.stage.height * (0.06 + i * 0.079 % 0.8);
      this.reset();
    }
    setVisible(value) {
      this.visible = value;
      this.node.visible = value;
    }
    update(deltaMs, scrollSpeed, altitudeMeters) {
      const altitude = Math.max(0, altitudeMeters);
      let first = this.altitudes.length - 1;
      for (let i = 0; i < this.altitudes.length - 1; i++) if (altitude < this.altitudes[i + 1]) {
        first = i;
        break;
      }
      const second = Math.min(first + 1, this.altitudes.length - 1);
      const span = this.altitudes[second] - this.altitudes[first];
      const window2 = Math.min(9e3, span * 0.27);
      const t = first === second ? 0 : Math.max(0, Math.min(1, (altitude - (this.altitudes[second] - window2)) / Math.max(1, window2)));
      const blend = t * t * (3 - 2 * t);
      this.band = first;
      this.blend = blend;
      if (this.rendered[0] !== first) {
        this.drawScene(this.scenes[0], first);
        this.rendered[0] = first;
      }
      if (this.rendered[1] !== second) {
        this.drawScene(this.scenes[1], second);
        this.rendered[1] = second;
      }
      this.scenes[0].alpha = 1;
      this.scenes[1].alpha = first === second ? 0 : blend;
      this.scenes[0].y = first === 0 ? Math.min(180, altitude * 0.2) : 0;
      this.scenes[1].y = 0;
      if (Math.abs(altitude - this.lastEarthAltitude) > 1200 || this.lastEarthAltitude === -Infinity) {
        this.drawEarthLimb(altitude);
        this.lastEarthAltitude = altitude;
      }
      const dt = Math.max(0, Math.min(0.05, deltaMs / 1e3));
      if (this.visible && !this.reducedMotion) this.elapsed += dt;
      const cloudAlpha = Math.min(1, Math.max(0, (altitude - 700) / 1100)) * Math.max(0, Math.min(1, (18500 - altitude) / 4500));
      for (const c of this.clouds) {
        c.node.alpha = cloudAlpha * 0.55;
        if (this.visible && !this.reducedMotion) {
          c.node.y += scrollSpeed * c.factor * dt;
          if (c.node.y > Laya.stage.height + 90) c.node.y = -c.node.height - 60;
        }
      }
      this.plane.visible = altitude >= 5200 && altitude < 13e3;
      this.plane.alpha = 0.85;
      this.plane.pos((this.elapsed * 24 + Laya.stage.width * 0.7) % (Laya.stage.width + 240) - 180, Laya.stage.height * 0.38);
      const starAlpha = Math.max(0, Math.min(1, (altitude - 65e3) / 4e4));
      for (const s of this.stars) {
        s.node.alpha = starAlpha * 0.7;
        if (this.visible && !this.reducedMotion) {
          s.node.y += scrollSpeed * s.factor * dt;
          if (s.node.y > Laya.stage.height) s.node.y = -10;
        }
      }
    }
    drawEarthLimb(altitude) {
      const g = this.earthLimb.graphics;
      if (altitude < 9e4 || altitude >= 25e5) {
        this.earthLimb.visible = false;
        g.clear();
        return;
      }
      this.earthLimb.visible = true;
      const w = Laya.stage.width, h = Laya.stage.height;
      const p = Math.max(0, Math.min(1, (altitude - 1e5) / 22e5));
      const horizon = h * (0.57 + 0.52 * Math.pow(p, 0.65));
      const bend = 25 + 150 * Math.pow(p, 0.6);
      const contour = (offset) => {
        const points = [];
        for (let i = 0; i <= 24; i++) {
          const x = w * i / 24, normalized = i / 12 - 1;
          points.push(x, horizon + offset + bend * normalized * normalized);
        }
        points.push(w, h + 120, 0, h + 120);
        return points;
      };
      g.clear();
      g.drawPoly(0, 0, contour(-28), "#7FCBFF33");
      g.drawPoly(0, 0, contour(-12), "#3AA8ED88");
      g.drawPoly(0, 0, contour(0), "#0A3C79");
      g.drawPoly(0, 0, contour(44), "#12548F");
      this.earthLimb.alpha = Math.max(0, Math.min(1, (altitude - 9e4) / 21e3)) * Math.max(0, Math.min(1, (25e5 - altitude) / 2e5));
    }
    drawScene(scene, band) {
      const w = Laya.stage.width, h = Laya.stage.height, g = scene.graphics;
      g.clear();
      scene.size(w, h);
      const names = ["launch_earth_v7", "mountains_v7", "cloudsea_v7", "cloudsea_v7", "atmosphere_v7", "atmosphere_v7", "flight"];
      const texture = MissionUi.texture(names[band]);
      if (!texture) throw new Error("Missing required altitude artwork: " + names[band]);
      const overscan = band === 0 ? 220 : 0;
      const scale = Math.max(w / texture.width, (h + overscan) / texture.height) * (band === 3 ? 1.48 : 1);
      const top = band === 0 ? -220 : band === 3 ? 0 : (h - texture.height * scale) / 2;
      g.drawTexture(texture, (w - texture.width * scale) / 2, top, texture.width * scale, texture.height * scale);
      if (band === 3) g.drawRect(0, 0, w, h, "#07325B66");
      if (band === 5) g.drawRect(0, 0, w, h, "#020D3266");
    }
  };

  // assets/scripts/prototype/FlightAscentModel.ts
  var FlightAscentModel = class {
    constructor() {
      this.altitudeMeters = 0;
      this.velocityMetersPerSecond = 0;
      this.phase = null;
      this.phaseElapsedSeconds = 0;
    }
    reset() {
      this.altitudeMeters = 0;
      this.velocityMetersPerSecond = 0;
      this.phaseElapsedSeconds = 0;
      this.phase = null;
    }
    advance(phase, deltaMs, engineMultiplier = 1) {
      const dt = Math.max(0, Math.min(0.1, deltaMs / 1e3));
      if (!dt) return;
      if (phase !== this.phase) {
        this.phase = phase;
        this.phaseElapsedSeconds = 0;
      }
      const t = this.phaseElapsedSeconds;
      const engine = Math.max(0.5, Math.min(3, engineMultiplier));
      const effectiveEngine = 1 + (engine - 1) * 0.38;
      const acceleration = phase === "stage1" ? (6 + Math.min(12, t * 0.48)) * effectiveEngine : phase === "stage2" ? (10 + Math.min(20, t * 0.75)) * effectiveEngine : phase === "separation" ? -7 : -4;
      const priorVelocity = this.velocityMetersPerSecond;
      const nextVelocity = Math.max(0, Math.min(4200, priorVelocity + acceleration * dt));
      this.altitudeMeters += (priorVelocity + nextVelocity) * 0.5 * dt;
      this.velocityMetersPerSecond = nextVelocity;
      this.phaseElapsedSeconds += dt;
    }
  };

  // assets/scripts/progression/UpgradeBenefits.ts
  function upgradeBenefit(key, level) {
    const next = level + 1;
    const fuel = (n) => 1 + (n - 1) * 0.14;
    const energy = (n) => 1 + (n - 1) * 0.12;
    if (key === "engine") return `发动机推力 ${Math.round((1 + (level - 1) * 0.12) * 100)}% → ${Math.round((1 + level * 0.12) * 100)}%`;
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
      const width = Laya.stage.width, height = Laya.stage.height;
      panel.graphics.clear();
      panel.graphics.drawRect(0, 0, width, height, "#081426");
      this.addIllustration(panel);
      const veil = new Laya.Sprite();
      veil.mouseEnabled = false;
      veil.graphics.drawRect(0, 0, width, height, "#06122722");
      panel.addChild(veil);
      MissionUi.picture(panel, "logo", (width - 660) / 2, Math.max(38, height * 0.028), 640, 360);
      const gear = MissionUi.button("⚙", 86, 86);
      gear.name = "home_settings";
      gear.pos(width - 96, 24);
      gear.on(Laya.Event.CLICK, this, () => {
        const overlay = new Laya.Sprite();
        overlay.name = "home_settings_overlay";
        overlay.size(width, height);
        overlay.mouseEnabled = true;
        overlay.graphics.drawRect(0, 0, width, height, "#030919CA");
        panel.addChild(overlay);
        const card = new Laya.Sprite();
        card.size(530, 430).pos((width - 530) / 2, (height - 430) / 2);
        MissionUi.panel(card.graphics, 530, 430);
        overlay.addChild(card);
        MissionUi.text(card, "声音设置", 0, 38, 530, 70, 40, "#FFE287", true);
        const sound = MissionUi.button(GameAudio.isMuted ? "打开音效" : "关闭音效", 350, 92);
        sound.pos(90, 153);
        card.addChild(sound);
        sound.on(Laya.Event.CLICK, this, () => {
          GameAudio.toggle();
          this.renderMain(panel, progress, options, onStart, onUpgrade);
        });
        const close = MissionUi.button("返回", 280, 82);
        close.pos(125, 286);
        close.on(Laya.Event.CLICK, this, () => overlay.destroy(true));
        card.addChild(close);
      });
      panel.addChild(gear);
      const resourceY = height - 385;
      let y = height * 0.325;
      const rocketScale = Math.min(0.66, (resourceY - y - 35) / 728);
      for (const definition of [...GameConfig.modules].reverse()) {
        const module = new Laya.Sprite();
        const w = definition.width * rocketScale, h = definition.height * rocketScale;
        GameplayArt.module(module.graphics, definition.kind, w, h);
        module.pos(width * 0.27 - w / 2, y);
        panel.addChild(module);
        y += h - 1;
      }
      const recordY = height * 0.32;
      const mascotHeight = Math.min(340, resourceY - (recordY + 142) - 24);
      const mascotWidth = mascotHeight * 270 / 340;
      const mascot = new Laya.Sprite();
      mascot.name = "home_astronaut_mascot";
      mascot.mouseEnabled = false;
      mascot.size(mascotWidth, mascotHeight);
      GameplayArt.astronaut(mascot.graphics, mascotWidth, mascotHeight);
      mascot.pos(width * 0.38 + 135 - mascotWidth / 2, resourceY - mascotHeight - 10);
      panel.addChild(mascot);
      const record = new Laya.Sprite();
      record.name = "home_stats_backdrop";
      record.size(284, 142).pos(width - 325, recordY);
      record.mouseEnabled = false;
      MissionUi.panel(record.graphics, 284, 142);
      panel.addChild(record);
      MissionUi.text(record, "历史最高", 0, 17, 284, 38, 29, "#ECF5FF", true);
      MissionUi.text(record, this.formatAltitude(progress.bestAltitudeMeters), 0, 58, 284, 59, 44, "#FFE287", true);
      const resources = new Laya.Sprite();
      resources.name = "home_resource_card";
      const rw = Math.min(674, width - 56);
      resources.size(rw, 128).pos((width - rw) / 2, resourceY);
      MissionUi.panel(resources.graphics, rw, 128);
      panel.addChild(resources);
      const items = [{ name: "coin", label: "火星币", value: progress.marsCoins }, { name: "metal", label: "金属", value: progress.metal }, { name: "chip", label: "芯片", value: progress.chips }];
      items.forEach((item, i) => {
        const x = i * rw / 3;
        MissionUi.text(resources, item.label, x, 16, rw / 3, 31, 25, "#D6E6F5", true);
        MissionUi.picture(resources, item.name, x + 23, 55, 54, 54);
        MissionUi.text(resources, String(item.value), x + 86, 52, rw / 3 - 105, 58, 33, "#FFFFFF", true, "left");
      });
      const start = MissionUi.button("开始造火箭", 560, 110, true);
      start.pos((width - 560) / 2, height - 232);
      start.once(Laya.Event.CLICK, this, onStart);
      panel.addChild(start);
      const available = options.filter((o) => o.canUpgrade).length;
      const upgrade = MissionUi.button(available ? `科研升级  ·  ${available} 项可提升` : "科研升级", 450, 72);
      upgrade.pos((width - 450) / 2, height - 100);
      upgrade.once(Laya.Event.CLICK, this, () => this.renderUpgrade(panel, progress, options, onStart, onUpgrade));
      panel.addChild(upgrade);
    }
    addIllustration(panel) {
      MissionUi.background(panel, "home");
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
      let y = 215;
      const rowStep = Math.max(145, (Laya.stage.height - 415) / 4);
      for (const option of options) {
        this.addUpgradeRow(
          panel,
          option,
          y,
          () => onUpgrade(option.key),
          rowStep - 18
        );
        y += rowStep;
      }
      const back = this.createButton(
        "返回首页",
        250,
        88,
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
        88,
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
    addUpgradeRow(parent, option, y, onClick, rowHeight = 140) {
      const width = Math.min(
        620,
        Laya.stage.width - 60
      );
      const row = new Laya.Sprite();
      row.pos(
        (Laya.stage.width - width) / 2,
        y
      );
      row.name = "research_row_" + option.key;
      row.size(width, rowHeight);
      MissionUi.panel(row.graphics, width, rowHeight);
      const art = option.key === "engine" ? "stage1_engine_v7" : option.key === "fuel" ? "stage1_tank_v7" : option.key === "cockpit" ? "cockpit_v7" : "astronaut";
      MissionUi.picture(row, art, 18, (rowHeight - 98) / 2, 98, 98);
      parent.addChild(row);
      this.addText(
        row,
        `${option.label}  Lv.${option.level}`,
        136,
        rowHeight * 0.17,
        width - 296,
        36,
        28,
        "#FFFFFF",
        true,
        "left"
      );
      const maxed = option.level >= option.maxLevel;
      const costText = maxed ? "已满级" : `${option.cost.marsCoins}币 / ${option.cost.metal}金属 / ${option.cost.chips}芯片`;
      this.addText(
        row,
        costText,
        136,
        rowHeight * 0.4,
        width - 296,
        32,
        24,
        "#99B0C8",
        false,
        "left"
      );
      this.addText(
        row,
        maxed ? "同类模块最低 Lv.5" : upgradeBenefit(option.key, option.level),
        136,
        rowHeight * 0.69,
        width - 158,
        32,
        24,
        "#B1DCCB",
        false,
        "left"
      );
      const button = this.createButton(
        maxed ? "满级" : "升级",
        126,
        86,
        option.canUpgrade ? "#2D8B65" : "#4B5665"
      );
      button.pos(
        width - 140,
        (rowHeight - 86) / 2
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
      const button = MissionUi.button(textValue, width, height, color === "#E39B39");
      if (color === "#4B5665") {
        button.alpha = 0.48;
        button.mouseEnabled = false;
      }
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
      text.font = MissionUi.font;
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
      return meters >= 1e3 ? `${(meters / 1e3).toFixed(2)} km` : `${Math.floor(meters)} m`;
    }
  };

  // assets/scripts/prototype/FlightObstacleManager.ts
  var FlightObstacle = class {
    constructor(x, y, speed, onHit) {
      this.speed = speed;
      this.onHit = onHit;
      this.consumed = false;
      this.art = new Laya.Sprite();
      this.cosmeticMs = 0;
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
      this.art.size(GameConfig.obstacleWidth, GameConfig.obstacleHeight);
      this.art.pivot(GameConfig.obstacleWidth / 2, GameConfig.obstacleHeight / 2);
      this.art.pos(GameConfig.obstacleWidth / 2, GameConfig.obstacleHeight / 2);
      GameplayArt.obstacle(this.art.graphics, GameConfig.obstacleWidth, GameConfig.obstacleHeight);
      node.addChild(this.art);
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
      this.cosmeticMs = (this.cosmeticMs + deltaMs) % 12e3;
      this.art.rotation = 4 * Math.sin(this.cosmeticMs * 12e-4);
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
      this.art = new Laya.Sprite();
      this.cosmeticMs = 0;
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
      this.art.size(GameConfig.pickupSize, GameConfig.pickupSize);
      this.art.pivot(GameConfig.pickupSize / 2, GameConfig.pickupSize / 2);
      this.art.pos(GameConfig.pickupSize / 2, GameConfig.pickupSize / 2);
      GameplayArt.pickup(this.art.graphics, type, GameConfig.pickupSize);
      node.addChild(this.art);
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
      this.cosmeticMs = (this.cosmeticMs + deltaMs) % 6283;
      const pulse = 1 + 0.055 * Math.sin(this.cosmeticMs * 6e-3);
      this.art.scale(pulse, pulse);
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
      this.toastPlate = new Laya.Sprite();
      this.toastRemainingMs = 0;
      this.fuelBar = new Laya.Sprite();
      this.lastBarKey = "";
      this.compact = false;
      this.lastDisplayedFuelRatio = 1;
      this.velocity = new Laya.Text();
      this.title = new Laya.Text();
      this.status = new Laya.Text();
      this.hint = new Laya.Text();
      this.fuel = new Laya.Text();
      this.health = new Laya.Text();
      this.runInfo = new Laya.Text();
      this.panel.alpha = 0.96;
      this.root.addChild(this.panel);
      this.root.addChild(this.fuelBar);
      this.title.text = "搭建火箭";
      this.title.color = "#FFFFFF";
      this.title.fontSize = 28;
      this.title.stroke = 2;
      this.title.strokeColor = "#071D37";
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
      this.velocity.name = "flight_velocity";
      this.velocity.color = "#9ED3EA";
      this.velocity.fontSize = 23;
      this.velocity.mouseEnabled = false;
      this.root.addChild(this.velocity);
      for (const t of [this.title, this.status, this.hint, this.fuel, this.health, this.runInfo, this.toast, this.velocity]) {
        t.font = MissionUi.font;
        t.mouseEnabled = false;
      }
      this.toastPlate.name = "mission_feedback_plate";
      this.toastPlate.mouseEnabled = false;
      this.toastPlate.visible = false;
      this.root.addChild(this.toastPlate);
      this.toast.color = "#FFE08A";
      this.toast.stroke = 2;
      this.toast.strokeColor = "#10243B";
      this.toast.fontSize = 25;
      this.toast.bold = true;
      this.toast.align = "center";
      this.root.addChild(this.toast);
      this.setBuildingHint();
      this.layout();
    }
    setVisible(value) {
      this.panel.visible = value;
      this.velocity.visible = value && this.compact;
      this.fuelBar.visible = value && this.fuel.visible;
      this.title.visible = value;
      this.status.visible = value;
      this.hint.visible = value;
      this.fuel.visible = value;
      this.health.visible = value;
      this.runInfo.visible = value;
      this.toast.visible = value && this.toastRemainingMs > 0;
      this.toastPlate.visible = value && this.toastRemainingMs > 0;
      if (!value) this.toast.text = "";
    }
    /** Shrink the flight HUD to expose more room for obstacles and pickups. */
    setCompact(value) {
      if (this.compact === value) return;
      this.compact = value;
      this.title.text = value ? "0 m" : "搭建火箭";
      this.layout();
    }
    layout() {
      const width = Laya.stage.width;
      const panelHeight = this.compact ? 172 : 202;
      this.panel.size(width, panelHeight);
      this.panel.graphics.clear();
      MissionUi.panel(this.panel.graphics, width, panelHeight);
      if (this.compact) {
        this.velocity.visible = true;
        this.velocity.size(280, 32).pos(25, 68);
        this.title.fontSize = 49;
        this.title.align = "left";
        this.title.size(width - 170, 58).pos(24, 15);
        this.status.fontSize = 21;
        this.status.align = "left";
        this.status.size(width - 170, 30).pos(24, 102);
        this.hint.fontSize = 19;
        this.hint.size(width - 48, 27).pos(24, 142);
        this.fuel.fontSize = 21;
        this.fuel.align = "right";
        this.fuel.size(270, 32).pos(width - 302, 104);
        this.fuelBar.pos(28, 140);
        this.health.fontSize = 20;
        this.health.align = "right";
        this.health.size(270, 28).pos(width - 298, 136);
        this.runInfo.fontSize = 20;
        this.runInfo.align = "right";
        this.runInfo.size(Math.max(160, width - 480), 27).pos(width - 430, 72);
        this.hint.visible = false;
      } else {
        this.velocity.visible = false;
        this.title.text = "搭建火箭";
        this.title.fontSize = 39;
        this.title.align = "center";
        this.title.size(width - 170, 54).pos(20, 13);
        this.status.fontSize = 25;
        this.status.align = "center";
        this.status.size(width - 40, 36).pos(20, 79);
        this.hint.fontSize = 23;
        this.hint.size(width - 40, 36).pos(20, 117);
        this.fuel.fontSize = 22;
        this.fuel.align = "center";
        this.fuel.size(width - 40, 34).pos(20, 152);
        this.fuelBar.pos(28, 184);
        this.health.size(width - 40, 30).pos(20, 174);
        this.runInfo.fontSize = 21;
        this.runInfo.align = "center";
        this.runInfo.size(width - 40, 40).pos(20, 151);
      }
      const toastY = panelHeight + 22;
      this.toast.size(width - 110, 58).pos(55, toastY);
      this.toastPlate.graphics.clear();
      const plateWidth = Math.min(width - 80, 560);
      MissionUi.panel(this.toastPlate.graphics, plateWidth, 62);
      this.toastPlate.pos((width - plateWidth) / 2, toastY);
      this.lastBarKey = "";
      if (this.fuelBar.visible) this.drawFuelBar(this.lastDisplayedFuelRatio);
    }
    showMilestone(meters) {
      this.showToast(`突破 ${this.formatAltitude(meters)}！`);
    }
    showPlacement(offset) {
      this.showToast(offset < 12 ? "完美对齐！" : offset < 40 ? "落稳了 · 继续搭建" : "偏移较大 · 下一块注意重心");
    }
    drawFuelBar(ratio) {
      this.lastDisplayedFuelRatio = ratio;
      const width = this.compact ? Math.max(200, Laya.stage.width - 360) : Laya.stage.width - 60, percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
      const key = `${width}:${percent}`;
      this.fuelBar.visible = true;
      if (key === this.lastBarKey) return;
      this.lastBarKey = key;
      const g = this.fuelBar.graphics;
      g.clear();
      g.drawRect(0, 0, width, 16, "#0A2037", "#72ACD0", 2);
      if (percent > 0) {
        g.drawRect(2, 2, Math.max(0, (width - 4) * percent / 100), 12, percent < 25 ? "#FF796B" : "#F9CD6E");
        g.drawRect(3, 3, Math.max(0, (width - 6) * percent / 100), 3, percent < 25 ? "#FFC1AD" : "#FFF2B9");
      }
    }
    update(deltaMs) {
      if (this.toastRemainingMs <= 0) return;
      this.toastRemainingMs -= deltaMs;
      if (this.toastRemainingMs <= 0) {
        this.toast.text = "";
        this.toast.visible = false;
        this.toastPlate.visible = false;
      }
    }
    showToast(message) {
      this.toast.visible = true;
      this.toastPlate.visible = true;
      this.toast.text = message;
      this.toastRemainingMs = 1250;
    }
    setProgress(current, total, message = "") {
      this.setCompact(false);
      this.status.text = message || `搭建进度 ${current} / ${total}`;
      this.fuel.text = "";
      this.health.text = "";
      this.fuel.visible = false;
      this.fuelBar.visible = false;
      this.health.visible = false;
      this.toast.visible = false;
      this.toastPlate.visible = false;
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
      this.toastPlate.visible = false;
      this.toastRemainingMs = 0;
    }
    setBuildReady(metrics, luckyCount) {
      this.setCompact(false);
      const percent = Math.round(
        metrics.stability * 100
      );
      this.status.text = `建造完成 · 稳定度 ${percent}%`;
      const penalty = Math.round((1 - metrics.stability) * GameConfig.maxBuildFuelPenalty * 100);
      this.hint.text = penalty > 0 ? `搭建偏移：额外燃耗 ${penalty}%` : luckyCount > 0 ? `本枚火箭出现 ${luckyCount} 个超等级模块 ✦` : "本枚火箭为标准等级配置";
      this.fuel.visible = false;
      this.fuel.text = "";
      this.health.text = "";
      this.fuelBar.visible = false;
      this.toast.visible = false;
      this.toastPlate.visible = false;
    }
    setIgnition(metrics, hp, maxHp) {
      this.setCompact(true);
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
      this.setCompact(true);
      const stability = Math.round(
        metrics.stability * 100
      );
      const direction = metrics.drift > 0.08 ? "右偏" : metrics.drift < -0.08 ? "左偏" : "基本直飞";
      const control = Math.round(
        input * 100
      );
      this.status.text = `${stage === 1 ? "一级" : "二级"}飞行  ·  稳定 ${stability}%`;
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
      this.setCompact(true);
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
      this.toastPlate.visible = false;
      this.toastRemainingMs = 0;
    }
    setRunProgress(altitudeMeters, bestMeters, runMetal, runChips, newRecord, velocityMps = 0) {
      const altitude = this.formatAltitude(
        altitudeMeters
      );
      const best = this.formatAltitude(
        Math.max(
          bestMeters,
          altitudeMeters
        )
      );
      this.title.text = this.compact ? altitude : "搭建火箭";
      this.velocity.text = "↑ " + Math.round(velocityMps) + " m/s";
      this.runInfo.text = `金属 ${runMetal}  ·  芯片 ${runChips}`;
    }
    setAccountSummary(marsCoins, metal, chips, bestMeters) {
      this.runInfo.text = `历史高度 ${this.formatAltitude(bestMeters)}  ·  火星币 ${marsCoins}`;
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
    setModuleFalling() {
      this.hint.text = "模块下落中 · 落稳后吊装下一块";
    }
    setBuildingHint() {
      this.hint.visible = true;
      this.hint.text = "机械臂左右移动 · 点击屏幕释放模块";
    }
    formatAltitude(meters) {
      return meters >= 1e3 ? `${(meters / 1e3).toFixed(2)} km` : `${Math.floor(meters)} m`;
    }
  };

  // assets/scripts/prototype/RocketModule.ts
  var RocketModule = class {
    constructor(definition, x, y, index, level, baseLevel) {
      this.definition = definition;
      this.level = level;
      this.baseLevel = baseLevel;
      this.exhaust = new Laya.Sprite();
      this.labelPlate = new Laya.Sprite();
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
      label.text = `${definition.label}  Lv.${level}${this.isLucky ? " ✦" : ""}`;
      label.color = "#FFFFFF";
      label.stroke = 2;
      label.strokeColor = "#142840";
      label.font = MissionUi.font;
      label.fontSize = definition.width < 150 ? 17 : 19;
      label.bold = true;
      label.align = "center";
      label.valign = "middle";
      label.size(definition.width, Math.round(definition.height * 0.28));
      label.pos(definition.width + 14, definition.height / 2 - 24);
      label.size(196, 48);
      label.fontSize = 21;
      label.align = "left";
      const ribbon = this.labelPlate;
      ribbon.mouseEnabled = false;
      ribbon.pos(definition.width + 9, definition.height / 2 - 27);
      MissionUi.panel(ribbon.graphics, 205, 54);
      node.addChild(ribbon);
      node.addChild(label);
      ribbon.visible = false;
      label.visible = false;
      const plume = this.exhaust.graphics;
      const texture = MissionUi.texture("thrust_v7");
      if (texture) {
        const width = 96, height = width * texture.height / texture.width;
        plume.drawTexture(texture, -width / 2, -8, width, height);
      }
      this.exhaust.visible = false;
      this.exhaust.mouseEnabled = false;
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
      this.body.linearVelocity = { x: 0, y: 0 };
      this.body.angularVelocity = 0;
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
      this.labelPlate.visible = false;
      this.label.visible = false;
      this.shape.width = w;
      this.shape.height = h;
      this.body.shapes = [this.shape];
    }
    setThrust(active, pulse = 1) {
      this.exhaust.visible = active;
      if (!active) return;
      this.exhaust.pos(this.node.width / 2, this.node.height);
      this.exhaust.scale(0.9 + 0.06 * (pulse - 0.9), Math.max(0.82, pulse * 1.12));
      this.exhaust.alpha = Math.min(1, 0.88 + (pulse - 0.86) * 0.22);
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
    show(settlement, progress, options, onUpgrade, onReplay, onHome) {
      this.hide();
      const w = Laya.stage.width, h = Laya.stage.height;
      const backdrop = this.illustratedBackdrop = new Laya.Sprite();
      backdrop.size(w, h);
      this.root.addChild(backdrop);
      MissionUi.background(backdrop, "home");
      const veil = new Laya.Sprite();
      veil.graphics.drawRect(0, 0, w, h, "#07112733");
      veil.mouseEnabled = false;
      backdrop.addChild(veil);
      const panel = this.container = new Laya.Sprite();
      panel.size(w, h);
      this.root.addChild(panel);
      MissionUi.text(panel, settlement.newRecord ? "新纪录！" : "本次高度", 0, 112, w, 54, 39, "#FFE3A1", true);
      const altitude = MissionUi.text(panel, this.formatAltitude(settlement.altitudeMeters), 20, 177, w - 40, 139, 96, "#FFD35F", true);
      altitude.stroke = 4;
      altitude.strokeColor = "#71351A";
      MissionUi.text(panel, `历史最高 ${this.formatAltitude(progress.bestAltitudeMeters)}`, 0, 328, w, 42, 26, "#EFF5FF", true);
      const rewardY = h - 600;
      const mascot = new Laya.Sprite();
      mascot.name = "result_astronaut";
      mascot.mouseEnabled = false;
      GameplayArt.astronaut(mascot.graphics, 270, 340);
      mascot.pos(w / 2 - 135, rewardY - 355);
      panel.addChild(mascot);
      const rw = Math.min(640, w - 64), reward = new Laya.Sprite();
      reward.size(rw, 185).pos((w - rw) / 2, rewardY);
      MissionUi.panel(reward.graphics, rw, 185);
      panel.addChild(reward);
      MissionUi.text(reward, "获得奖励", 0, 12, rw, 36, 28, "#FFE3A1", true);
      const items = [{ name: "coin", label: "火星币", value: settlement.marsCoinsEarned }, { name: "metal", label: "金属", value: settlement.metalEarned }, { name: "chip", label: "芯片", value: settlement.chipsEarned }];
      items.forEach((item, i) => {
        const x = i * rw / 3;
        MissionUi.picture(reward, item.name, x + rw / 6 - 28, 53, 56, 56);
        MissionUi.text(reward, item.label, x, 110, rw / 3, 29, 23, "#E6F1FF", true);
        MissionUi.text(reward, `+${item.value}`, x, 140, rw / 3, 39, 32, "#FFE08B", true);
      });
      const research = MissionUi.button("科研升级", 280, 88);
      research.pos((w - 280) / 2, rewardY + 198);
      research.on(Laya.Event.CLICK, this, () => this.showUpgradeDetails(settlement, progress, options, onUpgrade, onReplay, () => this.show(settlement, progress, options, onUpgrade, onReplay, onHome)));
      panel.addChild(research);
      const replay = MissionUi.button("再来一枚", 560, 112, true);
      replay.pos((w - 560) / 2, h - 300);
      replay.once(Laya.Event.CLICK, this, onReplay);
      panel.addChild(replay);
      const home = MissionUi.button("返回首页", 450, 92);
      home.pos((w - 450) / 2, h - 164);
      home.once(Laya.Event.CLICK, this, onHome);
      panel.addChild(home);
    }
    showUpgradeDetails(settlement, progress, options, onUpgrade, onReplay, onHome) {
      this.hide();
      const w = Laya.stage.width, h = Laya.stage.height;
      const holder = this.illustratedBackdrop = new Laya.Sprite();
      holder.size(w, h);
      this.root.addChild(holder);
      MissionUi.background(holder, "home");
      const veil = new Laya.Sprite();
      veil.graphics.drawRect(0, 0, w, h, "#07112788");
      veil.mouseEnabled = false;
      holder.addChild(veil);
      const panel = this.container = new Laya.Sprite();
      const width = Math.min(
        620,
        Laya.stage.width - 50
      );
      const height = 1060;
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
      MissionUi.panel(panel.graphics, width, height);
      const mascot = new Laya.Sprite();
      mascot.mouseEnabled = false;
      GameplayArt.astronaut(mascot.graphics, 132, 163);
      mascot.pos(width / 2 - 66, -136);
      panel.addChild(mascot);
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
        this.formatAltitude(settlement.altitudeMeters),
        0,
        76,
        width,
        77,
        58,
        "#FFE186",
        true
      );
      this.addText(
        panel,
        `本局 +火星币 ${settlement.marsCoinsEarned}  +金属 ${settlement.metalEarned}  +芯片 ${settlement.chipsEarned}`,
        0,
        170,
        width,
        38,
        22,
        "#D7E4F1",
        false
      );
      this.addText(
        panel,
        `持有：火星币 ${progress.marsCoins} · 金属 ${progress.metal} · 芯片 ${progress.chips}`,
        0,
        214,
        width,
        32,
        20,
        "#A9BED2",
        false
      );
      this.addText(
        panel,
        "永久升级",
        0,
        284,
        width,
        32,
        23,
        "#FFFFFF",
        true
      );
      let y = 340;
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
        410,
        95,
        "#2C7ED1"
      );
      replay.pos(
        (width - 410) / 2,
        height - 210
      );
      replay.once(
        Laya.Event.CLICK,
        this,
        onReplay
      );
      panel.addChild(
        replay
      );
      const home = MissionUi.button("返回结算", 360, 76);
      home.pos((width - 360) / 2, height - 98);
      home.once(Laya.Event.CLICK, this, onHome);
      panel.addChild(home);
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
      MissionUi.panel(row.graphics, width, 104);
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
      const button = MissionUi.button(textValue, width, height, textValue === "再来一枚");
      if (color === "#4B5665") {
        button.alpha = 0.48;
        button.mouseEnabled = false;
      }
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

  // assets/scripts/prototype/BuildCrane.ts
  var BuildCrane = class {
    constructor(parent) {
      this.node = new Laya.Sprite();
      this.rail = new Laya.Sprite();
      this.carriage = new Laya.Sprite();
      this.arm = new Laya.Sprite();
      this.held = null;
      this.direction = 1;
      this.releaseMs = 0;
      this.gripWidth = 220;
      this.gripTop = GameConfig.craneModuleTop;
      this.node.name = "build_mechanical_arm";
      this.node.mouseEnabled = false;
      this.node.addChild(this.rail);
      this.node.addChild(this.carriage);
      this.carriage.addChild(this.arm);
      parent.addChild(this.node);
      this.node.visible = false;
      const g = this.carriage.graphics;
      for (const x of [-43, 43]) {
        g.drawCircle(x, 0, 15, "#17364B", "#8FAFB8", 3);
        g.drawCircle(x, 0, 6, "#C8E3DF");
      }
      g.drawRoundRect(-63, 5, 126, 48, 12, 12, 12, 12, "#DDA34D", "#263D4D", 4);
      g.drawRoundRect(-55, 11, 110, 30, 8, 8, 8, 8, "#F5D48D");
      g.drawRect(-36, 19, 72, 14, "#294955");
      for (let x = -27; x < 30; x += 18) g.drawLine(x, 20, x + 8, 32, "#F6D181", 6);
      g.drawCircle(47, 25, 4, "#8DE9D0");
    }
    attach(module, index) {
      this.held = module;
      this.direction = index % 2 ? -1 : 1;
      this.releaseMs = 0;
      this.gripWidth = module.definition.width;
      this.gripTop = module.node.y - module.definition.height / 2;
      this.node.visible = true;
      this.layout();
      const half = this.gripWidth / 2 + GameConfig.craneEdgeMargin;
      module.moveToX(this.direction > 0 ? half : Laya.stage.width - half);
      this.carriage.x = module.node.x;
      this.drawArm(0, 0);
    }
    release() {
      this.held = null;
      this.releaseMs = 0;
    }
    hide() {
      this.held = null;
      this.node.visible = false;
    }
    update(dt) {
      if (!this.node.visible) return;
      if (this.held && !this.held.released) {
        const margin = this.held.definition.width / 2 + GameConfig.craneEdgeMargin;
        const minX = margin, maxX = Laya.stage.width - margin;
        let x = this.held.node.x + this.direction * GameConfig.craneSpeed * dt / 1e3;
        if (x > maxX) {
          x = maxX - (x - maxX);
          this.direction = -1;
        }
        if (x < minX) {
          x = minX + (minX - x);
          this.direction = 1;
        }
        this.held.moveToX(Math.max(minX, Math.min(maxX, x)));
        this.carriage.x = this.held.node.x;
      } else if (this.releaseMs < GameConfig.craneRetractMs) {
        this.releaseMs = Math.min(GameConfig.craneRetractMs, this.releaseMs + dt);
        const t = this.releaseMs / GameConfig.craneRetractMs;
        this.drawArm(Math.min(1, t * 3), Math.max(0, (t - 0.25) / 0.75) * 58);
      }
    }
    layout() {
      const w = Laya.stage.width, g = this.rail.graphics;
      g.clear();
      g.drawRoundRect(24, 320, w - 48, 37, 10, 10, 10, 10, "#1C3B4B", "#91B1B8", 3);
      g.drawRect(28, 326, w - 56, 7, "#D3E3DA");
      g.drawRect(28, 340, w - 56, 6, "#597989");
      for (let x = 42; x < w - 42; x += 36) g.drawLine(x, 351, x + 14, 351, "#D0A361", 3);
      this.carriage.y = 338;
      if (this.held) {
        const margin = this.gripWidth / 2 + GameConfig.craneEdgeMargin;
        this.held.moveToX(Math.max(margin, Math.min(w - margin, this.held.node.x)));
        this.held.node.y = GameConfig.craneModuleTop + this.held.definition.height / 2;
        this.gripTop = GameConfig.craneModuleTop;
        this.carriage.x = this.held.node.x;
        this.drawArm(0, 0);
      }
    }
    drawArm(open, retract) {
      const g = this.arm.graphics, shoulder = this.gripTop - 338 - retract;
      const side = this.gripWidth / 2 + 9 + open * 27;
      g.clear();
      g.drawRoundRect(-12, 42, 24, Math.max(10, shoulder - 53), 6, 6, 6, 6, "#7D9BA5", "#253F51", 3);
      g.drawRect(-5, 46, 5, Math.max(6, shoulder - 59), "#D5E8E2");
      g.drawRoundRect(-38, shoulder - 19, 76, 31, 8, 8, 8, 8, "#E8BB66", "#29424F", 3);
      for (const sign of [-1, 1]) {
        g.drawLine(sign * 23, shoulder - 5, sign * side, shoulder + 7, "#253E50", 16);
        g.drawLine(sign * 23, shoulder - 8, sign * side, shoulder + 4, "#AAC7C6", 9);
        g.drawLine(sign * side, shoulder + 5, sign * side, shoulder + 42, "#253E50", 15);
        g.drawLine(sign * side, shoulder + 7, sign * side, shoulder + 39, "#D4A657", 9);
        g.drawLine(sign * side, shoulder + 42, sign * (side - 13), shoulder + 42, "#263E4D", 12);
        g.drawCircle(sign * side, shoulder + 6, 8, "#F1D092", "#314D5B", 2);
      }
      g.drawCircle(0, shoulder - 4, 10, "#44636D", "#E9CF91", 3);
      g.drawCircle(0, shoulder - 4, 4, "#ABE8DA");
    }
  };

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
      this.buildBackdrop = null;
      this.root = new Laya.Scene();
      this.world = new Laya.Sprite();
      this.progressStore = new PlayerProgressStore();
      this.modules = [];
      this.moduleRolls = {};
      this.current = null;
      this.phase = "home" /* Home */;
      this.controlDragging = false;
      this.controlPointerStartX = 0;
      this.lastControlInput = 0;
      this.milestone = 0;
      this.animationMs = 0;
      this.buildGuide = new Laya.Sprite();
      this.guideKey = "";
      this.nextQueued = false;
      this.nextModuleMs = 0;
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
      this.ascent = new FlightAscentModel();
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
      this.crane = new BuildCrane(this.world);
      this.pauseUI = new PauseOverlay(
        this.root,
        (value) => this.setUserPaused(value),
        () => {
          this.setUserPaused(false);
          this.resetBuild();
        },
        () => {
          this.setUserPaused(false);
          this.resetBuild();
          this.showHome();
        }
      );
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
      var _a;
      const w = Laya.stage.width;
      const h = Laya.stage.height;
      this.root.graphics.clear();
      this.root.size(w, h);
      this.world.size(w, h);
      (_a = this.buildBackdrop) == null ? void 0 : _a.destroy(true);
      this.buildBackdrop = MissionUi.background(this.root, "hangar");
      this.buildBackdrop.visible = [
        "building" /* Building */,
        "build_failed" /* BuildFailed */,
        "launch_ready" /* LaunchReady */
      ].indexOf(this.phase) >= 0;
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
      const platformArt = MissionUi.texture("platform_v7");
      if (platformArt) {
        const w2 = GameConfig.platformWidth, h2 = w2 * platformArt.height / platformArt.width;
        platform.graphics.drawTexture(platformArt, -w2 / 2, -GameConfig.platformHeight / 2, w2, h2);
      }
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
        this.structureStableMs = 0;
        syncBodyToNode(this.current.body);
        this.current.release();
        this.crane.release();
        this.hud.setModuleFalling();
        PlatformManager.current.vibrate("light");
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
      if (this.controlDragging) {
        this.controlDragging = false;
        this.lastControlInput = 0;
        (_a = this.flight) == null ? void 0 : _a.setInput(0);
        (_b = this.astronaut) == null ? void 0 : _b.setInput(0);
      }
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
          const stepMs = 1e3 / 60;
          this.elapsedAccumulatorMs = cappedPhysicsAccumulator(
            this.elapsedAccumulatorMs,
            delta,
            stepMs
          );
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
      this.obstacleManager.update(dt);
      this.pickupManager.update(dt);
      this.updateRunAltitude(dt);
      this.backdrop.update(dt, this.getBackdropScrollSpeed(), this.runAltitudeMeters);
      if (this.phase === "building" /* Building */) {
        this.crane.update(dt);
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
      let phase = null;
      let engine = 1;
      if (this.phase === "stage1_flight" /* Stage1Flight */) {
        phase = "stage1";
        engine = this.runStats.stage1EngineMultiplier;
      } else if (this.phase === "stage_separation" /* StageSeparation */) {
        phase = "separation";
      } else if (this.phase === "stage2_flight" /* Stage2Flight */) {
        phase = "stage2";
        engine = this.runStats.stage2EngineMultiplier;
      } else if (this.phase === "astronaut_flight" /* AstronautFlight */) {
        phase = "astronaut";
      }
      if (!phase) return;
      this.ascent.advance(phase, dt, engine);
      this.runAltitudeMeters = this.ascent.altitudeMeters;
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
      if (this.nextQueued) {
        this.nextModuleMs = Math.max(0, this.nextModuleMs - dt);
        if (this.nextModuleMs === 0) {
          this.nextQueued = false;
          this.spawnNextModule();
        }
      }
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
        this.nextModuleMs = GameConfig.nextModuleDelayMs;
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
      const spawnY = GameConfig.craneModuleTop + definition.height / 2;
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
      this.world.setChildIndex(this.crane.node, this.world.numChildren - 1);
      this.crane.attach(module, this.modules.length - 1);
      syncBodyToNode(module.body);
      const luckyText = roll.bonusLevel > 0 ? ` ✦ +${roll.bonusLevel}` : "";
      this.hud.setProgress(
        this.modules.length,
        GameConfig.modules.length,
        `吊装：${definition.label} Lv.${roll.level}${luckyText} · ${this.modules.length}/${GameConfig.modules.length}`
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
      this.crane.hide();
      this.buildGuide.visible = false;
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
      this.crane.hide();
      this.buildGuide.visible = false;
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
      var _a, _b, _c, _d, _e;
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
      const ignitionNode = (_a = this.modules[0]) == null ? void 0 : _a.node;
      if (ignitionNode) {
        (_c = (_b = this.feedback) == null ? void 0 : _b.ring) == null ? void 0 : _c.call(_b, ignitionNode.x, ignitionNode.y, "#FFBD6B");
        (_e = (_d = this.feedback) == null ? void 0 : _d.show) == null ? void 0 : _e.call(_d, Laya.stage.width / 2, 475, "点火成功！", "#FFE2A3", "major");
      }
      this.backdrop.reset();
      this.backdrop.setVisible(true);
      if (this.buildBackdrop) this.buildBackdrop.visible = false;
      this.destroyActionButton();
      this.rocketHp = GameConfig.rocketMaxHp;
      this.damageCooldownMs = 0;
      this.runAltitudeMeters = 0;
      this.ascent.reset();
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
          var _a2;
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
          const e2e = (_a2 = globalThis.location) == null ? void 0 : _a2.search.includes("e2e");
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
      var _a, _b, _c, _d, _e, _f;
      this.phase = "stage_separation" /* StageSeparation */;
      GameAudio.play("separate");
      const joint = (_a = this.modules[2]) == null ? void 0 : _a.node;
      if (joint) {
        (_c = (_b = this.feedback) == null ? void 0 : _b.ring) == null ? void 0 : _c.call(_b, joint.x, joint.y, "#8EDAFF");
        (_e = (_d = this.feedback) == null ? void 0 : _d.show) == null ? void 0 : _e.call(_d, Laya.stage.width / 2, 460, "一级分离！", "#D0F3FF", "major");
      }
      (_f = this.flight) == null ? void 0 : _f.setInput(0);
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
      var _a, _b, _c, _d, _e;
      this.phase = "stage2_flight" /* Stage2Flight */;
      GameAudio.play("ignite");
      const thruster = (_a = this.modules[2]) == null ? void 0 : _a.node;
      if (thruster) {
        (_c = (_b = this.feedback) == null ? void 0 : _b.ring) == null ? void 0 : _c.call(_b, thruster.x, thruster.y, "#FFC36F");
        (_e = (_d = this.feedback) == null ? void 0 : _d.show) == null ? void 0 : _e.call(_d, Laya.stage.width / 2, 470, "二级点火！", "#FFE4B0", "major");
      }
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
      var _a, _b, _c, _d, _e, _f, _g;
      if (!this.assembly || this.phase === "escape" /* Escape */ || this.phase === "astronaut_flight" /* AstronautFlight */ || this.phase === "result" /* Result */) {
        return;
      }
      this.phase = "escape" /* Escape */;
      (_a = this.flight) == null ? void 0 : _a.setInput(0);
      this.obstacleManager.setMode(null);
      this.pickupManager.setMode(null);
      this.routes.setMode(null);
      const spawn = this.assembly.getEscapeSpawnPoint();
      (_c = (_b = this.feedback) == null ? void 0 : _b.ring) == null ? void 0 : _c.call(_b, spawn.x, spawn.y, "#B9EFFF");
      (_e = (_d = this.feedback) == null ? void 0 : _d.show) == null ? void 0 : _e.call(_d, Laya.stage.width / 2, 465, "紧急弹射！", "#CBF6FF", "major");
      const drift = (_g = (_f = this.buildMetrics) == null ? void 0 : _f.drift) != null ? _g : 0;
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
      var _a, _b;
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
      (_b = (_a = this.feedback) == null ? void 0 : _a.ring) == null ? void 0 : _b.call(_a, this.astronaut.node.x, this.astronaut.node.y, "#79D9FF");
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
        },
        () => {
          this.resetBuild();
          this.showHome();
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
      Laya.timer.clear(this, this.resetBuild);
      this.feedback.clear();
      this.milestone = 0;
      this.animationMs = 0;
      this.destroyActionButton();
      (_a = this.homePanel) == null ? void 0 : _a.hide();
      this.hud.setVisible(true);
      this.world.visible = true;
      this.backdrop.setVisible(false);
      if (this.buildBackdrop) this.buildBackdrop.visible = true;
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
      this.nextModuleMs = 0;
      this.crane.hide();
      this.structureStableMs = 0;
      this.hudElapsedMs = 0;
      this.pointerHeld = false;
      this.controlDragging = false;
      this.damageCooldownMs = 0;
      this.rocketHp = GameConfig.rocketMaxHp;
      this.lastControlInput = 0;
      this.runAltitudeMeters = 0;
      this.ascent.reset();
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
        this.newRecordDuringRun,
        this.ascent.velocityMetersPerSecond
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
      this.crane.hide();
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
      this.resetBuild();
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
      for (let y = GameConfig.craneModuleTop + this.current.definition.height + 12; y < top; y += 24) g.drawLine(x, y, x, y + 10, "#A7DBEF", 2);
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
      if (this.phase === "stage1_flight" /* Stage1Flight */ || this.phase === "stage2_flight" /* Stage2Flight */ || this.phase === "stage_separation" /* StageSeparation */ || this.phase === "astronaut_flight" /* AstronautFlight */) {
        return Math.min(230, 38 + this.ascent.velocityMetersPerSecond * 0.17);
      }
      return 0;
    }
    showActionButton(labelText, onClick) {
      this.destroyActionButton();
      const width = 390, height = 94;
      const button = this.actionButton = MissionUi.button(labelText, width, height, true);
      button.name = "prototype_action_button";
      button.pivot(width / 2, height / 2).pos(Laya.stage.width / 2, Laya.stage.height - 64);
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
          if (module.released) module.node.y += deltaY;
          syncBodyToNode(module.body);
        }
        this.crane.layout();
        if (this.current && !this.current.released) syncBodyToNode(this.current.body);
      }
      this.hud.layout();
      (_a = this.pauseUI) == null ? void 0 : _a.layout();
      if (this.phase === "result" /* Result */) this.showResultPanel();
      if (this.actionButton) {
        this.actionButton.pos(Laya.stage.width / 2, Laya.stage.height - 64);
      }
    }
  };

  // assets/scripts/Entry.ts
  Laya.addBeforeInitCallback(() => {
    Laya.Physics2DOption.customUpdate = true;
    Laya.Config.isAntialias = false;
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
