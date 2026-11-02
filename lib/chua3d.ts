/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Chánh điện 3D (three.js). Toàn bộ hình khối dựng bằng khối cơ bản, không cần tải mô hình.
 * - Học sinh thật: ngồi theo cấp, cấp càng cao càng gần bàn thờ Ông Tổ.
 *   Đổi cấp thì đứng dậy ra lối giữa, đi dọc lối rồi vào chỗ mới.
 * - Nhân vật ảo (sư, chú tiểu, phật tử) đi kinh hành, chạy quanh điện, dừng vái trước bàn thờ.
 */

export type Nguoi3D = {
  key: string;
  name: string;
  gender: "nam" | "nu" | null;
  level: number;
  sam_hoi: boolean;
  me: boolean;
};

type V2 = { x: number; z: number };

type Actor = {
  key: string;
  npc: boolean;
  level: number;
  name: string;
  me: boolean;
  root: any;
  body: any;
  feet: any[];
  hands: any[];
  dem: any;
  tag: any | null;
  path: V2[];
  speed: number;
  phase: number;
  yaw: number;
  sitting: boolean;
  leaving: boolean;
  pause: number;
  bow: number;
  loop?: V2[];
  loopIdx?: number;
  loopDir?: number;
};

const LANES = [-4.7, -3.7, -2.7, -1.7, 1.7, 2.7, 3.7, 4.7];
const Z_BACK = 7.2; // hàng cuối (cấp 1)
const Z_FRONT = -7.4; // hàng đầu (cấp cao nhất)
const DOOR: V2 = { x: 0, z: 12.5 };
const AISLE = 0.45;

function hash(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

function seatOf(key: string, level: number, maxLevel: number): V2 {
  const lane = LANES[Math.floor(hash(key) * LANES.length) % LANES.length];
  const p = Math.min(1, Math.max(0, (level - 1) / Math.max(1, maxLevel - 1)));
  return {
    x: lane + (hash(key + "x") - 0.5) * 0.35,
    z: Z_BACK + (Z_FRONT - Z_BACK) * p + (hash(key + "z") - 0.5) * 0.5,
  };
}

/** Đường đi: ra lối giữa, đi dọc lối, rồi vào chỗ. */
function route(from: V2, to: V2): V2[] {
  if (Math.sign(from.x) === Math.sign(to.x) && Math.abs(from.z - to.z) < 1.1 && Math.abs(from.x) > 1) return [to];
  const pts: V2[] = [];
  const s1 = Math.sign(from.x) || 1;
  const s2 = Math.sign(to.x) || 1;
  if (Math.abs(from.x) > AISLE + 0.2) pts.push({ x: s1 * AISLE, z: from.z });
  pts.push({ x: s2 * AISLE, z: to.z });
  pts.push(to);
  return pts;
}

function canvasTex(THREE: any, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function createChua3D(
  THREE: any,
  host: HTMLElement,
  opts: { reduce: boolean; ongToSvg: SVGSVGElement | null; logoUrl: string }
) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "chua3d-canvas";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c110b);
  scene.fog = new THREE.Fog(0x1c110b, 20, 42);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);

  /* ---------------- Ánh sáng ---------------- */
  scene.add(new THREE.HemisphereLight(0xffe7c4, 0x3b2014, 1.6));
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.1);
  sun.position.set(5, 12, 9);
  scene.add(sun);
  const altarLight = new THREE.PointLight(0xffa64a, 60, 18, 2);
  altarLight.position.set(0, 4, -8.2);
  scene.add(altarLight);
  const candleL = new THREE.PointLight(0xff8a2a, 8, 6, 2);
  candleL.position.set(-1.8, 2, -9.6);
  const candleR = candleL.clone();
  candleR.position.x = 1.8;
  scene.add(candleL, candleR);

  /* ---------------- Vật liệu dùng chung ---------------- */
  const matCache = new Map<string, any>();
  const mat = (color: number, extra: Record<string, unknown> = {}) => {
    const k = color + JSON.stringify(extra);
    if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial({ color, ...extra }));
    return matCache.get(k);
  };
  const disposables: any[] = [];
  const keep = <T,>(x: T) => {
    disposables.push(x);
    return x;
  };

  /* ---------------- Sàn, tường, cột ---------------- */
  const plank = canvasTex(THREE, 512, 512, (g) => {
    for (let r = 0; r < 8; r++) {
      let x = (r % 2) * -90;
      while (x < 512) {
        const w = 160 + ((r * 37 + x) % 90);
        const l = 30 + ((r * 13 + x * 7) % 14);
        g.fillStyle = `hsl(22, 45%, ${l}%)`;
        g.fillRect(x, r * 64, w, 64);
        g.strokeStyle = "rgba(20,10,5,0.75)";
        g.lineWidth = 3;
        g.strokeRect(x, r * 64, w, 64);
        for (let k = 0; k < 4; k++) {
          g.strokeStyle = "rgba(255,220,180,0.05)";
          g.beginPath();
          g.moveTo(x, r * 64 + 12 + k * 12);
          g.lineTo(x + w, r * 64 + 14 + k * 11);
          g.stroke();
        }
        x += w;
      }
    }
  });
  plank.wrapS = plank.wrapT = THREE.RepeatWrapping;
  plank.repeat.set(4, 6);
  keep(plank);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 28), new THREE.MeshLambertMaterial({ map: plank }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 0;
  scene.add(floor);

  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 21.5), mat(0x8a2a1b));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.012, 1.6);
  scene.add(carpet);
  for (const s of [-1, 1]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 21.5), mat(0xd9ae4e));
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(s * 0.8, 0.014, 1.6);
    scene.add(edge);
  }

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), mat(0x4a1810));
  backWall.position.set(0, 5, -12.5);
  scene.add(backWall);
  const goldFrame = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 6.4), mat(0xc79a3e));
  goldFrame.position.set(0, 4.1, -12.45);
  const redPanel = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), mat(0x7a2216));
  redPanel.position.set(0, 4.1, -12.42);
  scene.add(goldFrame, redPanel);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(28, 10), mat(0x2e1a11));
    side.rotation.y = (-s * Math.PI) / 2;
    side.position.set(s * 10, 5, 0);
    scene.add(side);
  }

  // Hoành phi
  const hp = canvasTex(THREE, 1024, 200, (g) => {
    g.fillStyle = "#7e1d13";
    g.fillRect(0, 0, 1024, 200);
    g.strokeStyle = "#e2b957";
    g.lineWidth = 14;
    g.strokeRect(10, 10, 1004, 180);
    g.fillStyle = "#e2b957";
    g.font = "800 104px 'Be Vietnam Pro', system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("CHÙA HÓA HỌC", 512, 106);
  });
  keep(hp);
  const hoanhPhi = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.02), new THREE.MeshBasicMaterial({ map: hp }));
  hoanhPhi.position.set(0, 8.1, -12.3);
  scene.add(hoanhPhi);

  const colGeo = keep(new THREE.CylinderGeometry(0.34, 0.38, 9, 20));
  const baseGeo = keep(new THREE.CylinderGeometry(0.52, 0.56, 0.4, 20));
  for (const s of [-1, 1]) {
    for (const z of [8, 3, -2, -7]) {
      const col = new THREE.Mesh(colGeo, mat(0x8e2416));
      col.position.set(s * 6.4, 4.5, z);
      const base = new THREE.Mesh(baseGeo, mat(0x3a2a20));
      base.position.set(s * 6.4, 0.2, z);
      scene.add(col, base);
    }
  }

  // Đèn lồng
  const lanternGeo = keep(new THREE.SphereGeometry(0.42, 18, 14));
  const lanterns: any[] = [];
  for (const [x, z] of [
    [-3.2, 4],
    [3.2, 4],
    [-3.2, -3],
    [3.2, -3],
  ]) {
    const l = new THREE.Mesh(lanternGeo, mat(0xd2402a, { emissive: 0xff5a24, emissiveIntensity: 0.55 }));
    l.scale.y = 1.25;
    l.position.set(x, 6.4, z);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 6), mat(0x2a1a12));
    cord.position.set(x, 8.4, z);
    scene.add(l, cord);
    lanterns.push(l);
  }

  // Bồ đoàn trống
  const cushionGeo = keep(new THREE.CylinderGeometry(0.44, 0.48, 0.12, 20));
  const cushionMat = mat(0x2b211c);
  const rows = 10;
  const inst = new THREE.InstancedMesh(cushionGeo, cushionMat, rows * LANES.length);
  const m4 = new THREE.Matrix4();
  let n = 0;
  for (let r = 0; r < rows; r++) {
    const z = Z_BACK + ((Z_FRONT - Z_BACK) * r) / (rows - 1);
    for (const x of LANES) {
      m4.makeTranslation(x, 0.06, z);
      inst.setMatrixAt(n++, m4);
    }
  }
  scene.add(inst);

  /* ---------------- Bàn thờ Ông Tổ ---------------- */
  const step = new THREE.Mesh(new THREE.BoxGeometry(8, 0.35, 1.4), mat(0x5a2a1a));
  step.position.set(0, 0.175, -9.4);
  const altar = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.2, 2.4), mat(0x8e2b1d));
  altar.position.set(0, 0.6, -10.9);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.14, 2.6), mat(0xd9ae4e));
  trim.position.set(0, 1.25, -10.9);
  scene.add(step, altar, trim);

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.32, 20), mat(0xc79a3e));
  bowl.position.set(0, 1.48, -10);
  scene.add(bowl);
  const tips: any[] = [];
  for (const dx of [-0.1, 0, 0.1]) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), mat(0xb0442e));
    stick.position.set(dx, 1.9, -10);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff9a3c }));
    tip.position.set(dx, 2.26, -10);
    scene.add(stick, tip);
    tips.push(tip);
  }
  for (const s of [-1, 1]) {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 12), mat(0xf1e6cf));
    candle.position.set(s * 1.8, 1.57, -10.3);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc35a }));
    flame.scale.y = 1.8;
    flame.position.set(s * 1.8, 1.92, -10.3);
    scene.add(candle, flame);
  }

  // Khói hương
  const smokeTex = keep(
    canvasTex(THREE, 64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      gr.addColorStop(0, "rgba(230,225,215,0.55)");
      gr.addColorStop(1, "rgba(230,225,215,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    })
  );
  const smoke: { s: any; life: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false }));
    s.position.set(0, 2.3, -10);
    scene.add(s);
    smoke.push({ s, life: i / 14 });
  }

  // Hào quang sau lưng Ông Tổ
  const haloTex = keep(
    canvasTex(THREE, 128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
      gr.addColorStop(0, "rgba(255,214,120,0.9)");
      gr.addColorStop(0.5, "rgba(255,190,90,0.3)");
      gr.addColorStop(1, "rgba(255,190,90,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
    })
  );
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  halo.scale.set(5.5, 5.5, 1);
  halo.position.set(0, 3.6, -11.6);
  scene.add(halo);

  // Ông Tổ: lấy đúng hình SVG trên web, vẽ lên một tấm phẳng
  const ongTo = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 3.74),
    new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.05, visible: false })
  );
  ongTo.position.set(0, 1.3 + 1.87, -11.2);
  scene.add(ongTo);
  void (async () => {
    try {
      if (!opts.ongToSvg) return;
      const clone = opts.ongToSvg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", "600");
      clone.setAttribute("height", "680");
      clone.removeAttribute("class");
      const img = clone.querySelector("image");
      if (img) {
        const blob = await fetch(opts.logoUrl).then((r) => r.blob());
        const dataUrl: string = await new Promise((res) => {
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result));
          fr.readAsDataURL(blob);
        });
        img.setAttribute("href", dataUrl);
      }
      const src = new XMLSerializer().serializeToString(clone);
      const url = URL.createObjectURL(new Blob([src], { type: "image/svg+xml" }));
      const im = new Image();
      await new Promise<void>((res, rej) => {
        im.onload = () => res();
        im.onerror = () => rej(new Error("svg"));
        im.src = url;
      });
      const tex = canvasTex(THREE, 600, 680, (g) => g.drawImage(im, 0, 0, 600, 680));
      URL.revokeObjectURL(url);
      keep(tex);
      ongTo.material.map = tex;
      ongTo.material.visible = true;
      ongTo.material.needsUpdate = true;
    } catch {
      /* không vẽ được thì để trống, cảnh vẫn chạy */
    }
  })();

  /* ---------------- Nhân vật ---------------- */
  const G = {
    robe: keep(new THREE.CylinderGeometry(0.25, 0.42, 0.7, 18)),
    lap: keep(new THREE.SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)),
    sash: keep(new THREE.CylinderGeometry(0.262, 0.4, 0.2, 18, 1, true)),
    head: keep(new THREE.SphereGeometry(0.3, 22, 16)),
    ear: keep(new THREE.SphereGeometry(0.07, 10, 8)),
    eye: keep(new THREE.SphereGeometry(0.035, 8, 6)),
    hair: keep(new THREE.SphereGeometry(0.318, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62)),
    bun: keep(new THREE.SphereGeometry(0.13, 14, 10)),
    hand: keep(new THREE.SphereGeometry(0.085, 10, 8)),
    foot: keep(new THREE.SphereGeometry(0.1, 10, 8)),
    halo: keep(new THREE.TorusGeometry(0.24, 0.025, 8, 28)),
    ring: keep(new THREE.RingGeometry(0.5, 0.62, 32)),
  };
  const SKIN = 0xe8b48a;

  type Look = { gender: "nam" | "nu" | null; robe: number; sash?: number; scale?: number };

  function makeTag(text: string, me: boolean) {
    const font = "700 44px 'Be Vietnam Pro', system-ui, sans-serif";
    const probe = document.createElement("canvas").getContext("2d")!;
    probe.font = font;
    const w = Math.min(900, Math.ceil(probe.measureText(text).width) + 48);
    const tex = canvasTex(THREE, w, 72, (g) => {
      g.font = font;
      g.fillStyle = me ? "rgba(226,185,87,0.96)" : "rgba(244,246,240,0.92)";
      const r = 34;
      g.beginPath();
      g.moveTo(r, 2);
      g.arcTo(w - 2, 2, w - 2, 70, r);
      g.arcTo(w - 2, 70, 2, 70, r);
      g.arcTo(2, 70, 2, 2, r);
      g.arcTo(2, 2, w - 2, 2, r);
      g.fill();
      g.fillStyle = "#24160f";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, w / 2, 39);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.renderOrder = 10;
    const h = me ? 0.36 : 0.3;
    sp.scale.set((h * w) / 72, h, 1);
    sp.position.y = 1.62;
    return sp;
  }

  function makeChar(look: Look) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const sc = look.scale ?? 1;
    root.scale.setScalar(sc);

    const dem = new THREE.Mesh(cushionGeo, cushionMat);
    dem.position.y = 0.06;
    root.add(dem);

    const robe = new THREE.Mesh(G.robe, mat(look.robe));
    robe.position.y = 0.55;
    body.add(robe);
    const lap = new THREE.Mesh(G.lap, mat(look.robe));
    lap.scale.set(1.15, 0.5, 1.15);
    lap.position.y = 0.22;
    body.add(lap);
    if (look.sash) {
      const sash = new THREE.Mesh(G.sash, mat(look.sash, { side: THREE.DoubleSide }));
      sash.position.y = 0.42;
      sash.rotation.z = 0.25;
      body.add(sash);
    }
    const head = new THREE.Mesh(G.head, mat(SKIN));
    head.position.y = 1.12;
    body.add(head);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(G.eye, mat(0x24160f));
      eye.position.set(s * 0.1, 1.15, 0.275);
      body.add(eye);
    }
    if (look.gender === "nu") {
      const hair = new THREE.Mesh(G.hair, mat(0x2b1d16));
      hair.position.set(0, 1.13, -0.02);
      hair.rotation.x = -0.55;
      body.add(hair);
      const bun = new THREE.Mesh(G.bun, mat(0x2b1d16));
      bun.position.set(0, 1.38, -0.2);
      body.add(bun);
      const clip = new THREE.Mesh(G.eye, mat(0xc0392b));
      clip.scale.setScalar(1.6);
      clip.position.set(0.12, 1.36, -0.15);
      body.add(clip);
    } else {
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(G.ear, mat(0xd99e72));
        ear.position.set(s * 0.29, 1.12, 0);
        body.add(ear);
      }
    }
    const hands = [-1, 1].map((s) => {
      const h = new THREE.Mesh(G.hand, mat(SKIN));
      h.position.set(s * 0.07, 0.62, 0.3);
      body.add(h);
      return h;
    });
    const feet = [-1, 1].map((s) => {
      const f = new THREE.Mesh(G.foot, mat(0x2a211c));
      f.scale.set(1, 0.6, 1.4);
      f.position.set(s * 0.15, 0.06, 0.05);
      f.visible = false;
      root.add(f);
      return f;
    });
    scene.add(root);
    return { root, body, dem, hands, feet };
  }

  const actors = new Map<string, Actor>();

  function lookFor(p: Nguoi3D): Look {
    return p.gender === "nu" ? { gender: "nu", robe: 0x7f98ab } : { gender: "nam", robe: 0xb8b1a3, sash: 0xe0b13c };
  }

  function addActor(key: string, look: Look, at: V2, extra: Partial<Actor>) {
    const c = makeChar(look);
    c.root.position.set(at.x, 0, at.z);
    const a: Actor = {
      key,
      npc: false,
      level: 1,
      name: "",
      me: false,
      root: c.root,
      body: c.body,
      feet: c.feet,
      hands: c.hands,
      dem: c.dem,
      tag: null,
      path: [],
      speed: 1.7,
      phase: Math.random() * 6,
      yaw: Math.PI,
      sitting: true,
      leaving: false,
      pause: 0,
      bow: 0,
      ...extra,
    };
    actors.set(key, a);
    return a;
  }

  function removeActor(a: Actor) {
    scene.remove(a.root);
    if (a.tag) {
      a.tag.material.map?.dispose();
      a.tag.material.dispose();
    }
    actors.delete(a.key);
  }

  function setTag(a: Actor, show: boolean) {
    if (a.tag) {
      a.root.remove(a.tag);
      a.tag.material.map?.dispose();
      a.tag.material.dispose();
      a.tag = null;
    }
    if (show) {
      a.tag = makeTag(a.me ? `${a.name} (con)` : a.name, a.me);
      a.root.add(a.tag);
    }
  }

  function addMeRing(a: Actor) {
    const ring = new THREE.Mesh(
      G.ring,
      new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    a.root.add(ring);
  }

  function addHalo(a: Actor) {
    const h = new THREE.Mesh(G.halo, new THREE.MeshBasicMaterial({ color: 0xffd36a }));
    h.rotation.x = Math.PI / 2;
    h.position.y = 1.55;
    a.body.add(h);
  }

  /* ---------------- Nhân vật ảo đi kinh hành ---------------- */
  const LOOP: V2[] = [
    { x: -5.5, z: 9.6 },
    { x: -5.5, z: -8.3 },
    { x: -1.2, z: -8.6 },
    { x: 1.2, z: -8.6 },
    { x: 5.5, z: -8.3 },
    { x: 5.5, z: 9.6 },
    { x: 0, z: 10.2 },
  ];
  const NPC_LOOKS: (Look & { speed: number })[] = [
    { gender: "nam", robe: 0xc9772a, sash: 0x8e3b1a, speed: 1.2 }, // sư áo nâu cam
    { gender: "nam", robe: 0xd98a2b, speed: 2.8, scale: 0.78 }, // chú tiểu chạy
    { gender: "nu", robe: 0x6f879a, speed: 1.1 }, // phật tử nữ
    { gender: "nam", robe: 0x7a5a3e, speed: 1.3 }, // phật tử nam áo nâu
    { gender: "nam", robe: 0xd98a2b, speed: 2.5, scale: 0.75 }, // chú tiểu
    { gender: "nu", robe: 0x8a9fae, speed: 1.0 },
    { gender: "nam", robe: 0xc9772a, sash: 0x8e3b1a, speed: 1.15 },
  ];
  NPC_LOOKS.forEach((look, i) => {
    const idx = Math.floor((i * LOOP.length) / NPC_LOOKS.length);
    const a = addActor(`npc-${i}`, look, LOOP[idx], {
      npc: true,
      speed: look.speed,
      sitting: false,
      loop: LOOP,
      loopIdx: idx,
      loopDir: i % 3 === 1 ? -1 : 1,
    });
    a.dem.visible = false;
    a.feet.forEach((f) => (f.visible = true));
    a.path = [];
  });

  function npcNext(a: Actor) {
    const L = a.loop!;
    // Chú tiểu thỉnh thoảng chạy thẳng lên lối giữa
    if (a.speed > 2 && Math.random() < 0.25) {
      a.path = [{ x: 0, z: 10 }, { x: 0, z: -8.4 }, { x: 0, z: 10 }];
      return;
    }
    a.loopIdx = (a.loopIdx! + a.loopDir! + L.length) % L.length;
    const p = L[a.loopIdx!];
    a.path = [{ x: p.x + (Math.random() - 0.5) * 0.6, z: p.z + (Math.random() - 0.5) * 0.6 }];
    // Tới trước bàn thờ thì dừng lại vái
    if (Math.abs(p.z + 8.6) < 0.5 && Math.random() < 0.6) a.bow = 0.001;
  }

  /* ---------------- Cập nhật danh sách học sinh ---------------- */
  let first = true;
  let maxLvl = 100;
  let showAll = false;

  function setPeople(people: Nguoi3D[], maxLevel: number, names: "me" | "all") {
    maxLvl = maxLevel;
    showAll = names === "all";
    const seen = new Set<string>();
    for (const p of people) {
      const key = "p-" + p.key;
      seen.add(key);
      const seat = seatOf(p.key, p.level, maxLevel);
      let a = actors.get(key);
      if (!a) {
        const start = first ? seat : DOOR;
        a = addActor(key, lookFor(p), start, { level: p.level, name: p.name, me: p.me });
        if (p.me) addMeRing(a);
        if (p.sam_hoi) addHalo(a);
        setTag(a, showAll || p.me);
        if (!first) {
          a.sitting = false;
          a.path = route({ x: 0, z: DOOR.z }, seat);
        }
      } else {
        if (a.name !== p.name) {
          a.name = p.name;
          setTag(a, showAll || p.me);
        }
        if (a.level !== p.level || a.leaving) {
          a.level = p.level;
          a.leaving = false;
          a.sitting = false;
          a.path = route({ x: a.root.position.x, z: a.root.position.z }, seat);
        }
      }
    }
    for (const a of actors.values()) {
      if (a.npc || seen.has(a.key) || a.leaving) continue;
      a.leaving = true;
      a.sitting = false;
      a.path = [...route({ x: a.root.position.x, z: a.root.position.z }, { x: 0.4, z: 9 }), DOOR];
    }
    first = false;
  }

  /* ---------------- Camera: tự lắc nhẹ, kéo để xoay, cuộn để gần xa ---------------- */
  const target = new THREE.Vector3(0, 0.6, -1.5);
  let yaw = 0;
  let pitch = 0.5;
  let radius = 16.5;
  let userYaw = 0;
  let lastTouch = -1e9;
  const el = renderer.domElement;
  let drag: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    drag = { x: e.clientX, y: e.clientY };
    lastTouch = performance.now();
  };
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag = { x: e.clientX, y: e.clientY };
    userYaw = Math.max(-1.1, Math.min(1.1, userYaw - dx * 0.006));
    if (e.pointerType === "mouse") pitch = Math.max(0.18, Math.min(1.05, pitch + dy * 0.004));
    lastTouch = performance.now();
  };
  const onUp = () => (drag = null);
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    radius = Math.max(7, Math.min(20, radius + e.deltaY * 0.01));
    lastTouch = performance.now();
  };
  el.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  el.addEventListener("wheel", onWheel, { passive: false });

  /* ---------------- Vòng lặp ---------------- */
  let running = true;
  let visible = true;
  let raf = 0;
  let last = performance.now();
  let t = 0;
  const tmp = new THREE.Vector3();

  function resize() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1.1 ? 58 : 46;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  const io = new IntersectionObserver((es) => (visible = es[0]?.isIntersecting ?? true));
  io.observe(host);

  function stepActor(a: Actor, dt: number) {
    if (a.bow > 0) {
      // Vái: cúi người ba lần
      a.bow += dt;
      a.body.rotation.x = Math.abs(Math.sin(a.bow * 3.2)) * 0.45;
      a.yaw += (Math.PI - a.yaw) * Math.min(1, dt * 6);
      a.root.rotation.y = a.yaw;
      setWalkPose(a, false, 0);
      if (a.bow > 3) {
        a.bow = 0;
        a.body.rotation.x = 0;
      }
      return;
    }
    if (a.pause > 0) {
      a.pause -= dt;
      setWalkPose(a, false, 0);
      return;
    }
    if (!a.path.length) {
      if (a.npc) {
        if (Math.random() < 0.004) a.pause = 0.8 + Math.random() * 1.6;
        else npcNext(a);
        return;
      }
      if (a.leaving) {
        removeActor(a);
        return;
      }
      if (!a.sitting) {
        a.sitting = true;
        a.body.position.y = 0;
      }
      a.yaw += (Math.PI - a.yaw) * Math.min(1, dt * 5);
      a.root.rotation.y = a.yaw;
      setSitPose(a);
      return;
    }
    const goal = a.path[0];
    const dx = goal.x - a.root.position.x;
    const dz = goal.z - a.root.position.z;
    const d = Math.hypot(dx, dz);
    const stepLen = a.speed * dt * (opts.reduce ? 3 : 1);
    if (d <= stepLen) {
      a.root.position.x = goal.x;
      a.root.position.z = goal.z;
      a.path.shift();
    } else {
      a.root.position.x += (dx / d) * stepLen;
      a.root.position.z += (dz / d) * stepLen;
    }
    const want = Math.atan2(dx, dz);
    let diff = want - a.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    a.yaw += diff * Math.min(1, dt * 10);
    a.root.rotation.y = a.yaw;
    a.phase += dt * (a.speed > 2 ? 15 : 9);
    setWalkPose(a, true, a.phase);
  }

  function setSitPose(a: Actor) {
    a.dem.visible = true;
    a.feet.forEach((f) => (f.visible = false));
    a.body.position.y = Math.sin(t * 1.3 + a.phase) * 0.008;
    a.hands[0].position.set(-0.05, 0.62, 0.3);
    a.hands[1].position.set(0.05, 0.62, 0.3);
  }

  function setWalkPose(a: Actor, moving: boolean, ph: number) {
    a.dem.visible = false;
    a.feet.forEach((f) => (f.visible = true));
    const sw = moving ? Math.sin(ph) : 0;
    a.body.position.y = 0.14 + (moving ? Math.abs(Math.sin(ph)) * 0.06 : 0);
    a.feet[0].position.z = 0.05 + sw * 0.16;
    a.feet[1].position.z = 0.05 - sw * 0.16;
    a.hands[0].position.set(-0.36, 0.55, sw * 0.14);
    a.hands[1].position.set(0.36, 0.55, -sw * 0.14);
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (!running || !visible || document.hidden) {
      last = now;
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    for (const a of [...actors.values()]) stepActor(a, dt);

    // Lửa, đèn, khói
    const fl = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06;
    candleL.intensity = 8 * fl;
    candleR.intensity = 8 * (2 - fl);
    tips.forEach((tp, i) => tp.scale.setScalar(1 + Math.sin(t * 6 + i) * 0.25));
    lanterns.forEach((l, i) => (l.rotation.z = Math.sin(t * 0.8 + i) * 0.04));
    for (const p of smoke) {
      p.life += dt * 0.12;
      if (p.life > 1) p.life -= 1;
      const k = p.life;
      p.s.position.set(Math.sin(k * 9 + t) * 0.15 * k, 2.3 + k * 2.6, -10 + Math.cos(k * 7) * 0.1);
      p.s.scale.setScalar(0.15 + k * 0.9);
      p.s.material.opacity = (1 - k) * 0.5;
    }

    // Camera
    const idle = performance.now() - lastTouch > 4000;
    if (idle && !opts.reduce) {
      userYaw *= 0.995;
      yaw = Math.sin(t * 0.06) * 0.32;
    }
    const y = yaw + userYaw;
    tmp.set(Math.sin(y) * Math.cos(pitch), Math.sin(pitch), Math.cos(y) * Math.cos(pitch)).multiplyScalar(radius);
    camera.position.copy(target).add(tmp);
    camera.lookAt(target);

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    setPeople,
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      scene.traverse((o: any) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m: any) => {
            m.map?.dispose?.();
            m.dispose();
          });
        }
      });
      disposables.forEach((d) => d.dispose?.());
      renderer.dispose();
      el.remove();
    },
    get maxLevel() {
      return maxLvl;
    },
  };
}
