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
  phat?: boolean;
  dao?: { x: number; z: number } | null;
  noi?: { id: number | string; text: string } | null;
  me: boolean;
};

type V2 = { x: number; z: number };

type Actor = {
  key: string;
  npc: boolean;
  level: number;
  phat: boolean;
  bowed: boolean;
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
  dao: boolean;
  destKey: string;
  noiId: number | string | null;
  bubble: any | null;
  bubbleT: number;
  ten?: string;
  kind?: "su" | "tieu" | "phattu";
  nuNpc?: boolean;
  faceTo?: V2 | null;
  /** Việc riêng ở trai đường: ngồi ăn, nấu cơm, lau bàn, tiếp khách. */
  tinh?: "an" | "nau" | "lau" | "don";
  /** Gọi khi nhân vật ảo đi tới nơi (dùng cho chú tiểu lau bàn, tiếp khách). */
  onDen?: (() => void) | null;
  /** Lời riêng khi được chạm vào. */
  loiRieng?: string[];
  ngoiY?: number;
  /** Khách xem live TikTok: việc được giao và chỗ làm việc đó */
  khach?: ViecKhach;
  khachCho?: V2;
  khachNhin?: V2;
  khachT?: number;
  khachDi?: boolean;
};

/** Việc của khách live: mỗi người vào một việc khác nhau ("vieng" = mới vào, lên viếng Ông Tổ trước) */
export type Viec = "vai" | "tung" | "caro" | "dauho" | "nemcon" | "duaxe" | "an" | "dao";
type ViecKhach = Viec | "vieng";

const LANES = [-4.7, -3.7, -2.7, -1.7, 1.7, 2.7, 3.7, 4.7];
const Z_BACK = 7.2; // hàng cuối (cấp 1)
const Z_FRONT = -6.3; // hàng đầu (cấp cao nhất)
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

/** Chỗ quỳ tụng kinh trước bàn thờ khi trả lời sai (hai hàng, chừa lối giữa). */
function altarSpot(key: string): V2 {
  const h = hash(key + "phat");
  const side = h < 0.5 ? -1 : 1;
  const k = (h < 0.5 ? h * 2 : (h - 0.5) * 2);
  return { x: side * (1.1 + k * 2.8), z: hash(key + "hang") < 0.5 ? -7.95 : -7.3 };
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
  // Điện thoại: tắt khử răng cưa, giới hạn độ phân giải, bớt đèn để xoay mượt
  const mobile =
    window.matchMedia("(pointer: coarse)").matches || Math.min(window.screen.width, window.screen.height) < 700;
  const prMax = Math.min(mobile ? 1.5 : 2, window.devicePixelRatio || 1);
  let pr = prMax;
  let fpsAcc = 0;
  let fpsN = 0;
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: "high-performance" });
  renderer.setPixelRatio(pr);
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
  if (!mobile) scene.add(candleL, candleR);

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

  /* ---------------- Chuỗi phản ứng hóa học ---------------- */
  const CHUOI = [
    "CH₄ → C₂H₂ → C₂H₄ → C₂H₅OH → CH₃COOH",
    "N₂ → NH₃ → NO → NO₂ → HNO₃",
    "S → SO₂ → SO₃ → H₂SO₄ → BaSO₄",
    "Fe → FeCl₂ → Fe(OH)₂ → Fe(OH)₃ → Fe₂O₃",
    "Al → Al₂O₃ → AlCl₃ → Al(OH)₃ → NaAlO₂",
    "(C₆H₁₀O₅)ₙ → C₆H₁₂O₆ → C₂H₅OH → CH₃CHO",
    "C₆H₆ → C₆H₅NO₂ → C₆H₅NH₂ → C₆H₂Br₃NH₂",
    "Na → NaOH → Na₂CO₃ → NaHCO₃ → NaCl",
    "CaCO₃ → CaO → Ca(OH)₂ → Ca(HCO₃)₂ → CaCO₃",
    "Cu → CuO → CuSO₄ → Cu(OH)₂ → [Cu(NH₃)₄](OH)₂",
  ];
  const FONT = "'Be Vietnam Pro', system-ui, sans-serif";

  // Đèn lồng: chữ vàng chạy vòng quanh thân đèn đỏ
  function lanternTex(text: string) {
    return canvasTex(THREE, 2048, 512, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 512);
      gr.addColorStop(0, "#7e1d13");
      gr.addColorStop(0.5, "#d2402a");
      gr.addColorStop(1, "#7e1d13");
      g.fillStyle = gr;
      g.fillRect(0, 0, 2048, 512);
      g.fillStyle = "#e2b957";
      g.fillRect(0, 150, 2048, 8);
      g.fillRect(0, 354, 2048, 8);
      g.font = `800 92px ${FONT}`;
      g.textBaseline = "middle";
      g.fillStyle = "#ffe29a";
      const w = g.measureText(text + "   ✦   ").width;
      for (let x = 20; x < 2048; x += w) g.fillText(text + "   ✦   ", x, 258);
      g.strokeStyle = "rgba(60,10,5,0.35)";
      g.lineWidth = 4;
      for (let x = 0; x < 2048; x += 128) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, 150);
        g.moveTo(x, 362);
        g.lineTo(x, 512);
        g.stroke();
      }
    });
  }
  const lanternGeo = keep(new THREE.SphereGeometry(0.5, 32, 20));
  const capGeo = keep(new THREE.CylinderGeometry(0.26, 0.3, 0.14, 18));
  const tasselGeo = keep(new THREE.CylinderGeometry(0.015, 0.06, 0.6, 8));
  const lanterns: any[] = [];
  const LANTERN_AT = [
    [-3.6, 2.5],
    [3.6, 2.5],
    [-3.6, -2.5],
    [3.6, -2.5],
    [-3.6, -7.2],
    [3.6, -7.2],
  ];
  LANTERN_AT.forEach(([x, z], i) => {
    const tex = keep(lanternTex(CHUOI[i % CHUOI.length]));
    const l = new THREE.Mesh(
      lanternGeo,
      new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.75 })
    );
    l.scale.y = 1.15;
    l.position.set(x, 6.6, z);
    l.rotation.y = i * 1.3;
    const top = new THREE.Mesh(capGeo, mat(0xd9ae4e));
    top.position.set(x, 6.6 + 0.6, z);
    const bot = top.clone();
    bot.position.y = 6.6 - 0.6;
    const tassel = new THREE.Mesh(tasselGeo, mat(0xc0392b));
    tassel.position.set(x, 6.6 - 0.95, z);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 6), mat(0x2a1a12));
    cord.position.set(x, 8.7, z);
    scene.add(l, top, bot, tassel, cord);
    lanterns.push(l);
  });

  // Khung gỗ chạm khắc: chữ lõm trên nền gỗ, viền vàng
  function carvedTex(lines: string[], w: number, h: number, vertical = false) {
    return canvasTex(THREE, w, h, (g) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, "#4a2a18");
      gr.addColorStop(0.5, "#5d3620");
      gr.addColorStop(1, "#3f2314");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      // vân gỗ
      for (let i = 0; i < 60; i++) {
        g.strokeStyle = `rgba(20,8,2,${0.08 + (i % 5) * 0.03})`;
        g.lineWidth = 2;
        g.beginPath();
        if (vertical) {
          const x = (i / 60) * w;
          g.moveTo(x, 0);
          g.bezierCurveTo(x + 12, h * 0.3, x - 12, h * 0.7, x + 6, h);
        } else {
          const y = (i / 60) * h;
          g.moveTo(0, y);
          g.bezierCurveTo(w * 0.3, y + 10, w * 0.7, y - 10, w, y + 5);
        }
        g.stroke();
      }
      // viền khung
      g.strokeStyle = "#c79a3e";
      g.lineWidth = 16;
      g.strokeRect(12, 12, w - 24, h - 24);
      g.strokeStyle = "#2a160c";
      g.lineWidth = 4;
      g.strokeRect(34, 34, w - 68, h - 68);
      // chữ chạm: bóng tối lệch xuống, ánh sáng lệch lên, rồi mặt chữ
      const carve = (text: string, x: number, y: number) => {
        g.fillStyle = "rgba(10,4,0,0.85)";
        g.fillText(text, x + 4, y + 4);
        g.fillStyle = "rgba(255,226,170,0.35)";
        g.fillText(text, x - 2, y - 2);
        g.fillStyle = "#d9ae4e";
        g.fillText(text, x, y);
      };
      g.textAlign = "center";
      g.textBaseline = "middle";
      if (vertical) {
        g.save();
        g.translate(w / 2, h / 2);
        g.rotate(Math.PI / 2);
        let fs = Math.floor(w * 0.42);
        g.font = `800 ${fs}px ${FONT}`;
        while (fs > 40 && g.measureText(lines[0]).width > h - 140) {
          fs -= 4;
          g.font = `800 ${fs}px ${FONT}`;
        }
        carve(lines[0], 0, 0);
        g.restore();
      } else {
        let fs = Math.floor((h - 80) / (lines.length * 1.35));
        g.font = `800 ${fs}px ${FONT}`;
        while (fs > 40 && Math.max(...lines.map((l) => g.measureText(l).width)) > w - 140) {
          fs -= 4;
          g.font = `800 ${fs}px ${FONT}`;
        }
        lines.forEach((ln, i) => carve(ln, w / 2, 40 + fs * 0.7 + i * fs * 1.35 + (h - 80 - lines.length * fs * 1.35) / 2));
      }
    });
  }

  // Bốn khung trên hai tường bên
  [
    [-1, 5, [CHUOI[0], CHUOI[1]]],
    [1, 5, [CHUOI[2], CHUOI[3]]],
    [-1, -4.5, [CHUOI[4], CHUOI[5]]],
    [1, -4.5, [CHUOI[6], CHUOI[7]]],
  ].forEach(([side, z, lines]) => {
    const s = side as number;
    const tex = keep(carvedTex(lines as string[], 2048, 520));
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 7.7), mat(0x2a160c));
    back.position.set(s * 9.95, 4.2, z as number);
    scene.add(back);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 1.9), new THREE.MeshLambertMaterial({ map: tex }));
    plate.rotation.y = (s * -Math.PI) / 2;
    plate.position.set(s * 9.88, 4.2, z as number);
    scene.add(plate);
  });

  // Câu đối trên hai cột trước bàn thờ và hai cột cửa
  [
    [-1, -7, CHUOI[8]],
    [1, -7, CHUOI[9]],
    [-1, 8, CHUOI[3]],
    [1, 8, CHUOI[1]],
  ].forEach(([side, z, text]) => {
    const s = side as number;
    const tex = keep(carvedTex([text as string], 256, 2048, true));
    const doi = new THREE.Mesh(new THREE.BoxGeometry(0.62, 5.2, 0.08), [
      mat(0x3f2314),
      mat(0x3f2314),
      mat(0x3f2314),
      mat(0x3f2314),
      new THREE.MeshLambertMaterial({ map: tex }),
      mat(0x3f2314),
    ]);
    // quay mặt chữ về phía lối giữa
    doi.rotation.y = (s * -Math.PI) / 2;
    doi.position.set(s * 6.02, 4.2, z as number);
    scene.add(doi);
  });

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
  const SMOKE = mobile ? 7 : 14;
  for (let i = 0; i < SMOKE; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false }));
    s.position.set(0, 2.3, -10);
    scene.add(s);
    smoke.push({ s, life: i / SMOKE });
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

  /* ---------------- Sân chùa: các điểm trò chơi ---------------- */
  type Tro = "caro" | "dauho" | "nemcon" | "duaxe";
  // Bậc thềm và cột cửa chánh điện
  const them = new THREE.Mesh(new THREE.BoxGeometry(20, 0.3, 1.4), mat(0x8a7a68));
  them.position.set(0, 0.15, 13.4);
  scene.add(them);
  for (const sx of [-2.4, 2.4]) {
    const cot = new THREE.Mesh(colGeo, mat(0x8e2416));
    cot.scale.set(0.9, 0.8, 0.9);
    cot.position.set(sx, 3.6, 13.0);
    scene.add(cot);
  }
  const mayCua = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.5, 0.6), mat(0xc79a3e));
  mayCua.position.set(0, 7.3, 13.0);
  scene.add(mayCua);

  const gachSan = keep(
    canvasTex(THREE, 512, 512, (g) => {
      g.fillStyle = "#8f8070";
      g.fillRect(0, 0, 512, 512);
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++) {
          const l = 48 + ((r * 7 + c * 13) % 9);
          g.fillStyle = `hsl(30, 12%, ${l}%)`;
          g.fillRect(c * 64 + 2, r * 64 + 2, 60, 60);
        }
    })
  );
  gachSan.wrapS = gachSan.wrapT = THREE.RepeatWrapping;
  gachSan.repeat.set(6, 5);
  const sanFloor = new THREE.Mesh(new THREE.PlaneGeometry(34, 26), new THREE.MeshLambertMaterial({ map: gachSan }));
  sanFloor.rotation.x = -Math.PI / 2;
  sanFloor.position.set(0, 0.005, 27);
  scene.add(sanFloor);
  // lối đi đá giữa sân
  const loiSan = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 25), mat(0xb7a88f));
  loiSan.rotation.x = -Math.PI / 2;
  loiSan.position.set(0, 0.012, 26.5);
  scene.add(loiSan);
  // tường bao thấp và cổng tam quan
  {
    const tuong = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 25), mat(0x7a2216));
    tuong.position.set(-16.5, 0.7, 26.5);
    scene.add(tuong);
    // tường bên phải chừa cổng sang trai đường (z 24..28)
    for (const [z0, z1] of [
      [14, 24],
      [28, 39],
    ]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, z1 - z0), mat(0x7a2216));
      t.position.set(16.5, 0.7, (z0 + z1) / 2);
      scene.add(t);
    }
  }
  for (const [x0, x1] of [
    [-16.5, -4.2],
    [4.2, 16.5],
  ]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 1.4, 0.5), mat(0x7a2216));
    t.position.set((x0 + x1) / 2, 0.7, 39);
    scene.add(t);
  }
  for (const [gx, cao] of [
    [-2.6, 4.2],
    [0, 5.4],
    [2.6, 4.2],
  ] as const) {
    for (const sx of [-0.9, 0.9]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, cao, 12), mat(0x8e2416));
      c.position.set(gx + sx, cao / 2, 39);
      scene.add(c);
    }
    const mai = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.35, 1.2), mat(0x3a1712));
    mai.position.set(gx, cao + 0.2, 39);
    const dinh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.9), mat(0xc79a3e));
    dinh.position.set(gx, cao + 0.45, 39);
    scene.add(mai, dinh);
  }
  // cây xanh và cột đèn
  const thanCay = keep(new THREE.CylinderGeometry(0.18, 0.25, 2.2, 8));
  const tanCay = keep(new THREE.SphereGeometry(1.3, 14, 10));
  for (const [x, z] of [
    [-13, 17],
    [13, 17],
    [-13.5, 30],
    [13.5, 31],
    [-9, 36],
    [10, 36],
  ]) {
    const t = new THREE.Mesh(thanCay, mat(0x5a3a22));
    t.position.set(x, 1.1, z);
    const l = new THREE.Mesh(tanCay, mat(0x2f6b3a));
    l.position.set(x, 3, z);
    l.scale.y = 1.15;
    scene.add(t, l);
  }
  for (const [x, z] of [
    [-3.6, 17],
    [3.6, 17],
    [-3.6, 31],
    [3.6, 31],
  ]) {
    const cot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.8, 8), mat(0x2a1a12));
    cot.position.set(x, 1.4, z);
    const den = new THREE.Mesh(lanternGeo, mat(0xd2402a, { emissive: 0xff5a24, emissiveIntensity: 0.6 }));
    den.scale.setScalar(0.55);
    den.position.set(x, 3, z);
    scene.add(cot, den);
  }

  // Biển tên trò chơi
  function bien(text: string) {
    const tex = keep(
      canvasTex(THREE, 512, 128, (g) => {
        g.fillStyle = "#7e1d13";
        g.fillRect(0, 0, 512, 128);
        g.strokeStyle = "#e2b957";
        g.lineWidth = 10;
        g.strokeRect(6, 6, 500, 116);
        g.fillStyle = "#ffe29a";
        g.font = "800 64px 'Be Vietnam Pro', system-ui, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(text, 256, 68);
      })
    );
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(3, 0.75, 1);
    return sp;
  }

  const TRAM: { tro: Tro; ten: string; group: any; cho: V2 }[] = [];
  function tram(tro: Tro, ten: string, x: number, z: number, cho: V2, build: (g: any) => void) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    build(g);
    const b = bien(ten);
    b.position.set(0, 3.4, 0);
    g.add(b);
    g.traverse((o: any) => (o.userData.tro = tro));
    scene.add(g);
    TRAM.push({ tro, ten, group: g, cho });
  }

  // Bàn cờ caro: bàn gỗ thấp, mặt bàn kẻ ô, hai đôn ngồi
  tram("caro", "Cờ caro", -7, 20, { x: -7, z: 21.6 }, (g) => {
    const ban = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 2), mat(0x6e4a22));
    ban.position.y = 0.75;
    const mat2 = keep(
      canvasTex(THREE, 256, 256, (c) => {
        c.fillStyle = "#e7cf98";
        c.fillRect(0, 0, 256, 256);
        c.strokeStyle = "#6e4a22";
        c.lineWidth = 2;
        for (let i = 0; i <= 15; i++) {
          c.beginPath();
          c.moveTo(8 + i * 16, 8);
          c.lineTo(8 + i * 16, 248);
          c.moveTo(8, 8 + i * 16);
          c.lineTo(248, 8 + i * 16);
          c.stroke();
        }
        for (const [cx, cy, col] of [
          [120, 120, "#a3281b"],
          [136, 120, "#2f6b4f"],
          [120, 136, "#2f6b4f"],
          [136, 104, "#a3281b"],
          [152, 88, "#a3281b"],
        ] as const) {
          c.fillStyle = col;
          c.beginPath();
          c.arc(cx, cy, 6, 0, Math.PI * 2);
          c.fill();
        }
      })
    );
    const mat3 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshLambertMaterial({ map: mat2 }));
    mat3.rotation.x = -Math.PI / 2;
    mat3.position.y = 0.815;
    for (const [lx, lz] of [
      [-0.8, -0.8],
      [0.8, -0.8],
      [-0.8, 0.8],
      [0.8, 0.8],
    ]) {
      const chan = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 0.12), mat(0x4a2a18));
      chan.position.set(lx, 0.37, lz);
      g.add(chan);
    }
    for (const dz of [-1.5, 1.5]) {
      const don = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.5, 12), mat(0x3a5a6a));
      don.position.set(0, 0.25, dz);
      g.add(don);
    }
    g.add(ban, mat3);
  });

  // Ném que vào ống: bình đồng cao cổ và giá que
  tram("dauho", "Ném que vào ống", -2.5, 25.5, { x: -2.5, z: 28.2 }, (g) => {
    const pts: any[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(new THREE.Vector2(0.18 + Math.sin(t * Math.PI) * 0.42 + (t > 0.85 ? (t - 0.85) * 1.2 : 0), t * 1.4));
    }
    const binh = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), mat(0xc79a3e, { side: THREE.DoubleSide }));
    g.add(binh);
    for (let i = 0; i < 4; i++) {
      const que = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), mat(0xb0442e));
      que.position.set(Math.cos(i) * 0.08, 1.6, Math.sin(i) * 0.08);
      que.rotation.z = (i - 1.5) * 0.12;
      g.add(que);
    }
    const gia = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.2), mat(0x6e4a22));
    gia.position.set(1.4, 0.45, 1.6);
    g.add(gia);
  });

  // Ném còn: cột tre cao, vòng còn đỏ viền vàng
  tram("nemcon", "Ném còn", 3.8, 21, { x: 3.8, z: 23.6 }, (g) => {
    const tre = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 7, 10), mat(0x6e8a3a));
    tre.position.y = 3.5;
    const vong = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 10, 28), mat(0xd2402a, { emissive: 0x6a1a10, emissiveIntensity: 0.5 }));
    vong.position.y = 7.3;
    const vien = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.025, 8, 28), mat(0xe2b957));
    vien.position.y = 7.3;
    const qua = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat(0xd2402a));
    qua.position.set(0.9, 0.16, 1.2);
    g.add(tre, vong, vien, qua);
    const b = g.children.find((c: any) => c.isSprite);
    if (b) b.position.y = 8.2;
  });

  // Đua xe: đường đua nhỏ hình bầu dục, hai xe chạy vòng
  const xeDua: any[] = [];
  tram("duaxe", "Đua xe", 9, 27.5, { x: 9, z: 24.6 }, (g) => {
    const duong = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.4, 40), mat(0x3b3b3b, { side: THREE.DoubleSide }));
    duong.rotation.x = -Math.PI / 2;
    duong.scale.set(1.4, 1, 1);
    duong.position.y = 0.03;
    const vach = new THREE.Mesh(new THREE.RingGeometry(1.98, 2.02, 40), mat(0xe2b957, { side: THREE.DoubleSide }));
    vach.rotation.x = -Math.PI / 2;
    vach.scale.set(1.4, 1, 1);
    vach.position.y = 0.04;
    g.add(duong, vach);
    for (const [mau, k] of [
      [0xa3281b, 0],
      [0xe2b957, Math.PI],
    ] as const) {
      const xe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.28), mat(mau));
      xe.userData.k = k;
      g.add(xe);
      xeDua.push(xe);
    }
  });
  // vị trí các trạm (để biết trạm nào gần nhân vật)
  const xeTam = new THREE.Vector3();
  void xeTam;

  // Khán giả đứng xem quanh các trò
  const khanGia: { root: any; body: any; i: number }[] = [];

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
      phat: false,
      bowed: false,
      dao: false,
      destKey: "",
      noiId: null,
      bubble: null,
      bubbleT: 0,
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

  /* ---------------- Bong bóng thoại ---------------- */
  function wrap(g: CanvasRenderingContext2D, text: string, maxW: number) {
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (g.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    if (lines.length > 3) {
      lines.length = 3;
      lines[2] = lines[2].replace(/.{0,2}$/, "…");
    }
    return lines;
  }

  function showBubble(a: Actor, text: string) {
    if (a.bubble) {
      a.root.remove(a.bubble);
      a.bubble.material.map?.dispose();
      a.bubble.material.dispose();
    }
    const font = "600 38px 'Be Vietnam Pro', system-ui, sans-serif";
    const probe = document.createElement("canvas").getContext("2d")!;
    probe.font = font;
    const lines = wrap(probe, text, 560);
    const w = Math.min(640, Math.max(...lines.map((l) => probe.measureText(l).width)) + 56);
    const h = lines.length * 48 + 52;
    const tex = canvasTex(THREE, Math.ceil(w), h, (g) => {
      g.font = font;
      g.fillStyle = "rgba(255,250,238,0.97)";
      g.strokeStyle = "#c79a3e";
      g.lineWidth = 4;
      const r = 26;
      const bh = h - 22;
      g.beginPath();
      g.moveTo(r, 2);
      g.arcTo(w - 2, 2, w - 2, bh, r);
      g.arcTo(w - 2, bh, 2, bh, r);
      g.lineTo(w / 2 + 16, bh);
      g.lineTo(w / 2, h - 2);
      g.lineTo(w / 2 - 16, bh);
      g.arcTo(2, bh, 2, 2, r);
      g.arcTo(2, 2, w - 2, 2, r);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = "#24160f";
      g.textAlign = "center";
      g.textBaseline = "middle";
      lines.forEach((l, i) => g.fillText(l, w / 2, 26 + 24 + i * 48 - 4));
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.renderOrder = 11;
    const scale = 0.0068;
    sp.scale.set(w * scale, h * scale, 1);
    sp.position.y = 1.95 + (h * scale) / 2;
    a.root.add(sp);
    a.bubble = sp;
    a.bubbleT = Math.min(9, 3.5 + text.length * 0.08);
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
    { x: -5.5, z: -8.55 },
    { x: -1.2, z: -8.6 },
    { x: 1.2, z: -8.6 },
    { x: 5.5, z: -8.55 },
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
  const NPC_TEN: { ten: string; kind: "su" | "tieu" | "phattu"; nu?: boolean }[] = [
    { ten: "Sư thầy Minh Tuệ", kind: "su" },
    { ten: "Chú tiểu Tí", kind: "tieu" },
    { ten: "Phật tử Ngọc Lan", kind: "phattu", nu: true },
    { ten: "Phật tử bác Hùng", kind: "phattu" },
    { ten: "Chú tiểu Bin", kind: "tieu" },
    { ten: "Phật tử cô Mai", kind: "phattu", nu: true },
    { ten: "Sư thầy Thiện Tâm", kind: "su" },
  ];
  NPC_LOOKS.forEach((look, i) => {
    const idx = Math.floor((i * LOOP.length) / NPC_LOOKS.length);
    const a = addActor(`npc-${i}`, look, LOOP[idx], {
      ten: NPC_TEN[i].ten,
      kind: NPC_TEN[i].kind,
      nuNpc: Boolean(NPC_TEN[i].nu),
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
    // tên luôn hiện trên đầu khi đi lại
    a.name = NPC_TEN[i].ten;
    setTag(a, true);
  });

  // khán giả quanh sân chơi (đứng yên, thỉnh thoảng reo)
  for (const [x, z, nu, mau] of [
    [-9.2, 19.4, false, 0xb8b1a3],
    [-8.8, 22.4, true, 0x7f98ab],
    [-4.6, 24.6, false, 0x7a5a3e],
    [-0.4, 27.6, true, 0x8a9fae],
    [1.6, 20.2, false, 0xc9772a],
    [6.1, 21.8, true, 0x7f98ab],
    [6.6, 25.2, false, 0xb8b1a3],
    [11.8, 29.6, true, 0x6f879a],
    [11.6, 25.4, false, 0xd98a2b],
  ] as const) {
    const c = makeChar({ gender: nu ? "nu" : "nam", robe: mau, sash: nu ? undefined : 0xe0b13c });
    c.root.position.set(x, 0, z);
    c.dem.visible = false;
    c.feet.forEach((f: any) => (f.visible = true));
    c.body.position.y = 0.14;
    // quay mặt về trò gần nhất
    let best = TRAM[0];
    for (const t of TRAM)
      if (Math.hypot(t.group.position.x - x, t.group.position.z - z) < Math.hypot(best.group.position.x - x, best.group.position.z - z)) best = t;
    c.root.rotation.y = Math.atan2(best.group.position.x - x, best.group.position.z - z);
    c.hands[0].position.set(-0.36, 0.55, 0);
    c.hands[1].position.set(0.36, 0.55, 0);
    khanGia.push({ root: c.root, body: c.body, i: khanGia.length });
  }
  let reoT = 0;

  /* ---------------- Trai đường: nhà ăn của chùa ---------------- */
  const AN_TAM = { x: 27, z: 26 };
  const anFloorTex = keep(
    canvasTex(THREE, 512, 512, (g) => {
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++) {
          g.fillStyle = (r + c) % 2 ? "#b98c58" : "#c99b64";
          g.fillRect(c * 64, r * 64, 64, 64);
          g.strokeStyle = "rgba(60,30,10,0.35)";
          g.strokeRect(c * 64 + 1, r * 64 + 1, 62, 62);
        }
    })
  );
  anFloorTex.wrapS = anFloorTex.wrapT = THREE.RepeatWrapping;
  anFloorTex.repeat.set(4, 4);
  const anFloor = new THREE.Mesh(new THREE.PlaneGeometry(16, 17), new THREE.MeshLambertMaterial({ map: anFloorTex }));
  anFloor.rotation.x = -Math.PI / 2;
  anFloor.position.set(27, 0.01, 26);
  scene.add(anFloor);
  // lối đá từ cổng sân sang trai đường
  const loiAn = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3), mat(0xb7a88f));
  loiAn.rotation.x = -Math.PI / 2;
  loiAn.position.set(17.6, 0.012, 26);
  scene.add(loiAn);
  // cổng nhỏ có biển "Trai đường" ngay chỗ tường sân
  const congAn = new THREE.Group();
  congAn.position.set(16.5, 0, 26);
  for (const dz of [-2.1, 2.1]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 3.6, 12), mat(0x8e2416));
    c.position.set(0, 1.8, dz);
    congAn.add(c);
  }
  const maiCong = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 5.2), mat(0x3a1712));
  maiCong.position.y = 3.75;
  congAn.add(maiCong);
  const bienAn = bien("Trai đường");
  bienAn.position.set(0, 4.5, 0);
  congAn.add(bienAn);
  congAn.traverse((o: any) => (o.userData.an = true));
  scene.add(congAn);

  // Tường thấp ba phía, phía trước (giáp sân) để ngỏ
  const tuongAn = mat(0xe9d7b4);
  for (const [x, z, w, d] of [
    [34.8, 26, 0.4, 17],
    [27, 17.6, 15.6, 0.4],
    [27, 34.4, 15.6, 0.4],
  ] as const) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, 2.4, d), tuongAn);
    t.position.set(x, 1.2, z);
    scene.add(t);
    const chan = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.35, d + 0.05), mat(0x7a2216));
    chan.position.set(x, 0.17, z);
    scene.add(chan);
  }
  // cột đỏ và mái (mái ẩn đi khi đang ở trong trai đường để nhìn rõ bên trong)
  const maiAn = new THREE.Group();
  for (const x of [19.4, 24.5, 29.6, 34.6])
    for (const z of [17.8, 34.2]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 4.6, 12), mat(0x8e2416));
      c.position.set(x, 2.3, z);
      scene.add(c);
    }
  for (const z of [22, 30]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 4.6, 12), mat(0x8e2416));
    c.position.set(19.4, 2.3, z);
    scene.add(c);
  }
  {
    const m = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4, 1, false, Math.PI / 4), mat(0x5a2a1e));
    m.scale.set(12.6, 3, 13.2);
    m.position.set(27, 6.1, 26);
    maiAn.add(m);
    const nep = new THREE.Mesh(new THREE.BoxGeometry(17.4, 0.35, 18.2), mat(0x3a1712));
    nep.position.set(27, 4.65, 26);
    maiAn.add(nep);
    scene.add(maiAn);
  }

  // Bếp dọc tường sau: quầy, bếp lò lửa đỏ, nồi bốc khói, nồi cơm, kệ bát
  const quay = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.95, 10), mat(0x7a5a3e));
  quay.position.set(33.6, 0.48, 26);
  scene.add(quay);
  const matQuay = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 10.1), mat(0xd9cdb6));
  matQuay.position.set(33.6, 0.99, 26);
  scene.add(matQuay);
  const lo = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 2.6), mat(0x8a7a68));
  lo.position.set(33.6, 0.45, 22.4);
  scene.add(lo);
  const lua = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 1.8), mat(0xff7a1a, { emissive: 0xff5a10, emissiveIntensity: 1 }));
  lua.position.set(32.92, 0.38, 22.4);
  scene.add(lua);
  const denBep = new THREE.PointLight(0xff9a40, 6, 7, 2);
  denBep.position.set(31.8, 1.4, 22.4);
  scene.add(denBep);
  const noiGeo = keep(new THREE.CylinderGeometry(0.45, 0.4, 0.55, 18));
  const noi: any[] = [];
  for (const z of [21.7, 23.1]) {
    const n = new THREE.Mesh(noiGeo, mat(0x6a6a6a));
    n.position.set(33.6, 1.17, z);
    scene.add(n);
    noi.push(n);
  }
  const noiCom = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.6, 18), mat(0xc0392b));
  noiCom.position.set(33.6, 1.33, 28.6);
  const napCom = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd9d4c8));
  napCom.position.set(33.6, 1.63, 28.6);
  napCom.scale.y = 0.4;
  scene.add(noiCom, napCom);
  const batGeo = keep(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));
  const matBat = mat(0xf3efe6, { side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(batGeo, matBat);
    b.rotation.x = Math.PI;
    b.position.set(33.6, 1.15 + (i % 3) * 0.05, 30.3 + Math.floor(i / 3) * 0.4);
    scene.add(b);
  }
  const ke = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 6), mat(0x6e4a22));
  ke.position.set(34.5, 1.9, 27);
  scene.add(ke);
  for (let i = 0; i < 10; i++) {
    const b = new THREE.Mesh(batGeo, matBat);
    b.rotation.x = Math.PI;
    b.position.set(34.5, 2.02, 24.4 + i * 0.55);
    scene.add(b);
  }
  // hơi nước bốc lên từ nồi
  const hoi: { s: any; life: number; z: number }[] = [];
  for (let i = 0; i < (mobile ? 6 : 10); i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false }));
    scene.add(sp);
    hoi.push({ s: sp, life: i / 10, z: i % 2 ? 21.7 : 23.1 });
  }
  // Bảng thực đơn trên tường sau
  {
    const tex = keep(
      canvasTex(THREE, 640, 480, (g) => {
        g.fillStyle = "#2f1d14";
        g.fillRect(0, 0, 640, 480);
        g.strokeStyle = "#e2b957";
        g.lineWidth = 10;
        g.strokeRect(8, 8, 624, 464);
        g.fillStyle = "#ffe29a";
        g.textAlign = "center";
        g.font = "800 46px 'Be Vietnam Pro', system-ui, sans-serif";
        g.fillText("THỰC ĐƠN HÔM NAY", 320, 70);
        g.font = "600 30px 'Be Vietnam Pro', system-ui, sans-serif";
        g.fillStyle = "#f3ead6";
        ["Cơm xào Hiđro", "Phở chay NaCl 0,9%", "Bún riêu Cu(OH)₂", "Nước H₂O có ga CO₂", "Trà xanh Catechin", "Chè đường C₁₂H₂₂O₁₁"].forEach((m, i) =>
          g.fillText(m, 320, 130 + i * 54)
        );
      })
    );
    const bang = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), new THREE.MeshBasicMaterial({ map: tex }));
    bang.position.set(34.55, 3.3, 26);
    bang.rotation.y = -Math.PI / 2;
    scene.add(bang);
  }

  // Bàn ghế: 6 bàn dài, mỗi bàn hai ghế băng
  const BAN: V2[] = [
    { x: 23, z: 20.5 },
    { x: 28.6, z: 20.5 },
    { x: 23, z: 25 },
    { x: 28.6, z: 25 },
    { x: 23, z: 29.5 },
    { x: 28.6, z: 29.5 },
  ];
  const matBan = mat(0x7a4a22);
  const matGhe = mat(0x5a3418);
  for (const b of BAN) {
    const mb = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.05), matBan);
    mb.position.set(b.x, 0.78, b.z);
    scene.add(mb);
    for (const [dx, dz] of [
      [-1.45, -0.4],
      [1.45, -0.4],
      [-1.45, 0.4],
      [1.45, 0.4],
    ]) {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), matGhe);
      ch.position.set(b.x + dx, 0.37, b.z + dz);
      scene.add(ch);
    }
    for (const dz of [-0.95, 0.95]) {
      const g2 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 0.38), matGhe);
      g2.position.set(b.x, 0.45, b.z + dz);
      scene.add(g2);
      for (const dx of [-1.3, 1.3]) {
        const ch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.3), matGhe);
        ch.position.set(b.x + dx, 0.22, b.z + dz);
        scene.add(ch);
      }
    }
    // đũa ống giữa bàn
    const ong = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.25, 10), mat(0x6e8a3a));
    ong.position.set(b.x, 0.95, b.z);
    scene.add(ong);
  }
  const CHO_TOI: V2 = { x: 22.2, z: 25.95 }; // chỗ của mình: bàn giữa bên trái, ghế phía sân
  const SAU_GHE: V2 = { x: 22.2, z: 26.9 };

  /* Món ăn dựng bằng khối: bát, cốc, đĩa */
  const coc = keep(new THREE.CylinderGeometry(0.11, 0.09, 0.3, 14));
  function lamMon(loai: "bat" | "coc" | "dia", mau: number) {
    const g = new THREE.Group();
    if (loai === "coc") {
      const v = new THREE.Mesh(coc, new THREE.MeshLambertMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.45 }));
      v.position.y = 0.15;
      const nuoc = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.22, 14), mat(mau, { transparent: true, opacity: 0.85 }));
      nuoc.position.y = 0.12;
      g.add(v, nuoc);
    } else if (loai === "dia") {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.04, 20), matBat);
      d.position.y = 0.02;
      const mon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(mau));
      mon.position.y = 0.04;
      mon.scale.y = 0.6;
      g.add(d, mon);
    } else {
      const b = new THREE.Mesh(batGeo, matBat);
      b.rotation.x = Math.PI;
      b.position.y = 0.17;
      b.scale.setScalar(1.2);
      const mat2 = new THREE.Mesh(new THREE.CircleGeometry(0.19, 18), mat(mau));
      mat2.rotation.x = -Math.PI / 2;
      mat2.position.y = 0.15;
      g.add(b, mat2);
    }
    return g;
  }

  // Nhân vật ảo trong trai đường
  const AN_NGOI: [number, number][] = [
    [22.2, 19.55],
    [23.8, 21.45],
    [27.8, 19.55],
    [29.4, 21.45],
    [23.8, 24.05],
    [27.8, 25.95],
    [29.4, 24.05],
    [22.2, 30.45],
    [29.4, 28.55],
  ];
  const AN_LOOK: Look[] = [
    { gender: "nu", robe: 0x7f98ab },
    { gender: "nam", robe: 0xb8b1a3, sash: 0xe0b13c },
    { gender: "nam", robe: 0xc9772a, sash: 0x8e3b1a },
    { gender: "nu", robe: 0x8a9fae },
    { gender: "nam", robe: 0x7a5a3e },
    { gender: "nu", robe: 0x6f879a },
    { gender: "nam", robe: 0xd98a2b, scale: 0.78 },
    { gender: "nam", robe: 0xb8b1a3, sash: 0xe0b13c },
    { gender: "nu", robe: 0x7f98ab },
  ];
  const AN_TEN: [string, "su" | "tieu" | "phattu", boolean][] = [
    ["Phật tử cô Hạnh", "phattu", true],
    ["Bạn Khoa 11A2", "phattu", false],
    ["Sư thầy Tuệ Minh", "su", false],
    ["Bạn Thảo 12A5", "phattu", true],
    ["Phật tử bác Tư", "phattu", false],
    ["Bạn Linh 10A1", "phattu", true],
    ["Chú tiểu Mít", "tieu", false],
    ["Bạn Duy 12A3", "phattu", false],
    ["Phật tử cô Thu", "phattu", true],
  ];
  const LOI_AN = [
    "Món cơm xào Hiđro ở đây nhẹ bụng lắm, ăn xong thấy bay bổng!",
    "Ăn no rồi về học tiếp, Ông Tổ dặn thế.",
    "Nước H₂O có ga này toàn CO₂, uống mát cả người.",
    "Phở chay nước dùng chuẩn NaCl 0,9%, đậm đà mà không mặn.",
    "Chè đường saccarozơ ngọt vừa, ăn xong nhớ đánh răng nhé.",
    "Ăn chậm nhai kĩ, enzim amilaza trong nước bọt mới làm việc được.",
    "Trai đường chùa Hóa Học nấu ngon nhất vùng đấy!",
  ];
  AN_NGOI.forEach(([x, z], i) => {
    const look = AN_LOOK[i];
    const [ten, kind, nu] = AN_TEN[i];
    const a = addActor(`an-${i}`, look, { x, z }, {
      ten,
      kind,
      nuNpc: nu,
      npc: true,
      tinh: "an",
      sitting: false,
      ngoiY: 0.42,
      loiRieng: LOI_AN,
    });
    const banZ = BAN.reduce((m, b) => (Math.abs(b.z - z) < Math.abs(m - z) ? b.z : m), BAN[0].z);
    a.yaw = z < banZ ? 0 : Math.PI;
    a.root.rotation.y = a.yaw;
    a.phase = i * 1.7;
    // bát và cốc trước mặt
    const s = z < banZ ? 1 : -1;
    const bat = lamMon("bat", [0xf3efe6, 0xc98a4a, 0xd65a2a, 0xe8d8a8][i % 4]);
    bat.position.set(x, 0.83, z + s * 0.62);
    const ly = lamMon("coc", [0xcfe9ff, 0x9bc46a, 0xffe08a][i % 3]);
    ly.position.set(x + 0.35, 0.83, z + s * 0.6);
    scene.add(bat, ly);
  });
  const tieuNau = addActor("an-nau", { gender: "nam", robe: 0xd98a2b, scale: 0.8 }, { x: 32.4, z: 22.4 }, {
    ten: "Chú tiểu Cốm (nấu cơm)",
    kind: "tieu",
    npc: true,
    tinh: "nau",
    sitting: false,
    loiRieng: [
      "Cơm sắp chín rồi, thí chủ chờ chú tiểu một chút nhé!",
      "Nồi này đang nấu phở chay, nước dùng chuẩn NaCl 0,9%.",
      "Lửa bếp là phản ứng cháy, tỏa nhiệt đấy, đừng lại gần quá nha!",
      "Nấu cơm cũng là hóa học: tinh bột gặp nhiệt và nước thì hồ hóa.",
    ],
  });
  tieuNau.yaw = Math.PI / 2;
  tieuNau.root.rotation.y = tieuNau.yaw;
  const LAU_DIEM: V2[] = [
    { x: 25.8, z: 20.5 },
    { x: 25.8, z: 25 },
    { x: 25.8, z: 29.5 },
    { x: 25.8, z: 25 },
  ];
  const tieuLau = addActor("an-lau", { gender: "nam", robe: 0xd98a2b, scale: 0.76 }, LAU_DIEM[0], {
    ten: "Chú tiểu Bông (lau bàn)",
    kind: "tieu",
    npc: true,
    tinh: "lau",
    sitting: false,
    loopIdx: 0,
    loiRieng: [
      "Để chú tiểu lau bàn sạch bong cho thí chủ nha!",
      "Khăn này giặt bằng xà phòng, là muối natri của axit béo đấy.",
      "Ăn xong thí chủ để bát đó, chú tiểu dọn cho.",
    ],
  });
  const khan = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.16), mat(0xf6f1e6));
  tieuLau.hands[1].add(khan);
  const CHO_DON: V2 = { x: 21.2, z: 28 };
  const tieuDon = addActor("an-don", { gender: "nam", robe: 0xd98a2b, scale: 0.8 }, CHO_DON, {
    ten: "Chú tiểu Na (tiếp khách)",
    kind: "tieu",
    npc: true,
    tinh: "don",
    sitting: false,
    speed: 2.4,
    loiRieng: [
      "A Di Đà Phật! Mời thí chủ vào trai đường dùng bữa ạ.",
      "Thí chủ muốn ăn món gì cứ gọi chú tiểu nhé!",
      "Hôm nay có cơm xào Hiđro, món đặc biệt của chùa đấy ạ.",
    ],
  });
  tieuDon.yaw = -Math.PI / 2;
  tieuDon.root.rotation.y = tieuDon.yaw;
  const khay = new THREE.Group();
  {
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.45), mat(0x8a4a22));
    khay.add(k);
    khay.position.set(0, 0.78, 0.42);
    khay.visible = false;
    tieuDon.body.add(khay);
  }
  for (const a of [tieuNau, tieuLau, tieuDon, ...[...actors.values()].filter((x) => x.tinh === "an")]) {
    a.dem.visible = false;
    a.feet.forEach((f) => (f.visible = true));
    a.name = a.ten ?? "";
    setTag(a, true);
  }
  /* ---------------- Khách xem live TikTok ---------------- */
  const CONG: V2 = { x: 0, z: 38.6 };
  const CHO_TRO: Record<"caro" | "dauho" | "nemcon" | "duaxe", { cho: V2[]; nhin: V2 }> = {
    caro: { cho: [{ x: -7, z: 18.5 }, { x: -7, z: 21.5 }, { x: -8.7, z: 20 }, { x: -5.3, z: 20 }, { x: -8.5, z: 21.9 }], nhin: { x: -7, z: 20 } },
    dauho: { cho: [{ x: -2.5, z: 28.2 }, { x: -3.8, z: 27.9 }, { x: -1.2, z: 27.9 }, { x: -4.4, z: 26.2 }], nhin: { x: -2.5, z: 25.5 } },
    nemcon: { cho: [{ x: 3.8, z: 23.6 }, { x: 2.5, z: 23.2 }, { x: 5.1, z: 23.2 }, { x: 6, z: 21.4 }], nhin: { x: 3.8, z: 21 } },
    duaxe: { cho: [{ x: 9, z: 24.6 }, { x: 7.5, z: 24.9 }, { x: 10.5, z: 24.9 }, { x: 12.6, z: 27.5 }, { x: 9, z: 30.6 }], nhin: { x: 9, z: 27.5 } },
  };
  const GHE_AN: V2[] = [];
  for (const b of BAN)
    for (const [dx, dz] of [
      [-0.8, -0.95],
      [0.8, -0.95],
      [-0.8, 0.95],
      [0.8, 0.95],
    ]) {
      const g = { x: b.x + dx, z: b.z + dz };
      const daCo = AN_NGOI.some(([x, z]) => Math.hypot(x - g.x, z - g.z) < 0.3) || Math.hypot(CHO_TOI.x - g.x, CHO_TOI.z - g.z) < 0.3;
      if (!daCo) GHE_AN.push(g);
    }
  const DAO_DIEM: V2[] = [
    { x: -12, z: 33 },
    { x: -6, z: 35 },
    { x: 5, z: 34.5 },
    { x: 12.5, z: 33 },
    { x: 13.5, z: 21 },
    { x: -13, z: 24 },
    { x: 0, z: 31 },
    { x: -10, z: 16.5 },
    { x: 10, z: 17 },
  ];
  const giuCho = new Map<string, string>(); // chỗ "x,z" -> key khách đang giữ
  function layCho(ds: V2[], key: string): V2 | null {
    for (const c of ds) {
      const k = `${c.x},${c.z}`;
      if (!giuCho.has(k)) {
        giuCho.set(k, key);
        return c;
      }
    }
    return null;
  }
  function traCho(key: string) {
    for (const [k, v] of giuCho) if (v === key) giuCho.delete(k);
  }
  /** Đường từ cổng tam quan tới một chỗ ở sân, trong chánh điện hoặc trai đường */
  function duongTuCong(toi: V2, viec: Viec): V2[] {
    const d: V2[] = [{ x: 0, z: 34 }];
    if (viec === "vai" || viec === "tung") {
      d.push({ x: 0, z: 16 }, { x: 0, z: 12.6 }, ...route({ x: 0, z: 12.6 }, toi));
      return d;
    }
    if (viec === "an") {
      const sau = toi.z > BAN.reduce((m, b) => (Math.abs(b.z - toi.z) < Math.abs(m - toi.z) ? b.z : m), BAN[0].z) ? toi.z + 0.95 : toi.z - 0.95;
      d.push({ x: 15, z: 26 }, { x: 18.2, z: 26 }, { x: 20.3, z: 26.2 }, { x: 20.3, z: sau }, { x: toi.x, z: sau }, toi);
      (d as any).sau = sau;
      return d;
    }
    d.push(toi);
    return d;
  }
  const AO_KHACH = [0xb8b1a3, 0x7f98ab, 0xc9772a, 0x7a5a3e, 0x8a9fae, 0x6f879a, 0xa86f9b, 0x5f8a6a, 0xd0a24a];

  function khachIdle(a: Actor, dt: number) {
    const x = a as any;
    if (a.khachDi) {
      removeActor(a);
      return;
    }
    a.khachT = (a.khachT ?? 0) + dt;
    if (a.pause > 0) a.pause -= dt;
    const quay = (toi: V2 | undefined, mac = Math.PI) => {
      const want = toi ? Math.atan2(toi.x - a.root.position.x, toi.z - a.root.position.z) : mac;
      let diff = want - a.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a.yaw += diff * Math.min(1, dt * 6);
      a.root.rotation.y = a.yaw;
    };
    switch (a.khach) {
      case "vieng": {
        quay(undefined, Math.PI);
        setWalkPose(a, false, 0);
        if (!x.daVai) {
          x.daVai = true;
          a.bow = 0.001;
          showBubble(a, LOI_XIN[Math.floor(Math.random() * LOI_XIN.length)]);
          return;
        }
        // vái xong: báo để cộng công đức, rồi đi làm việc được giao
        viengCb?.(a.key.slice(2));
        giaoViec(a, x.viecSau ?? "dao");
        return;
      }
      case "tung":
        quay(undefined, Math.PI);
        if (!a.sitting) {
          a.sitting = true;
          a.body.position.y = 0;
        }
        setSitPose(a);
        return;
      case "an":
        quay(undefined, x.anHuong ?? Math.PI);
        a.ngoiY = 0.34;
        setAnPose(a, true);
        return;
      case "vai": {
        quay(undefined, Math.PI);
        setWalkPose(a, false, 0);
        a.hands[0].position.set(-0.045, 0.8, 0.34);
        a.hands[1].position.set(0.045, 0.8, 0.34);
        if (a.khachT > 6.5) {
          a.khachT = 0;
          a.bow = 0.001;
        }
        return;
      }
      case "dao": {
        setWalkPose(a, false, 0);
        if (a.khachT > 3 + (x.nghi ?? 2)) {
          a.khachT = 0;
          x.nghi = 1 + Math.random() * 4;
          const p = DAO_DIEM[Math.floor(Math.random() * DAO_DIEM.length)];
          a.path = [{ x: p.x + (Math.random() - 0.5) * 2, z: p.z + (Math.random() - 0.5) * 2 }];
        }
        return;
      }
      default: {
        // đứng chơi ở trò: quay mặt vào trò, tay làm động tác
        quay(a.khachNhin);
        setWalkPose(a, false, 0);
        const k = (a.khachT + a.phase) % 3;
        if (a.khach === "caro") {
          const go = Math.max(0, Math.sin(a.khachT * 1.4 + a.phase)) ;
          a.hands[1].position.set(0.25, 0.6 + go * 0.2, 0.3 + go * 0.15);
        } else if (a.khach === "duaxe") {
          const h = Math.abs(Math.sin(t * 6 + a.phase));
          a.hands[0].position.set(-0.32, 0.8 + h * 0.35, 0.05);
          a.hands[1].position.set(0.32, 0.8 + h * 0.35, 0.05);
          a.body.position.y = 0.14 + (reoT > 0 ? h * 0.15 : 0);
        } else if (k < 0.5) {
          // vung tay ném
          a.hands[1].position.set(0.3, 0.6 + Math.sin((k / 0.5) * Math.PI) * 0.6, 0.15 + (k / 0.5) * 0.3);
        }
      }
    }
  }

  const LOI_XIN = [
    "Con xin Ông Tổ phù hộ thi Hóa được điểm 10!",
    "Ông Tổ ơi, cho con nhớ hết công thức hóa học ạ!",
    "Con xin Tổ cho kì thi này được điểm thật cao!",
    "Lạy Tổ, con hứa chăm học Hóa, xin Tổ phù hộ!",
    "Con xin Tổ cho bài kiểm tra Hóa không bị sai câu nào!",
  ];
  let viengCb: ((key: string) => void) | null = null;
  let toSang = 0;
  /** Giao việc cho khách đã viếng Tổ xong: giữ chỗ rồi đi tới đó (đang đứng trong chánh điện). */
  function giaoViec(a: Actor, muon: Viec) {
    const key = a.key;
    let viec: Viec = muon;
    let cho: V2 | null = null;
    let nhin: V2 | undefined;
    if (viec === "caro" || viec === "dauho" || viec === "nemcon" || viec === "duaxe") {
      cho = layCho(CHO_TRO[viec].cho, key);
      nhin = CHO_TRO[viec].nhin;
    } else if (viec === "an") cho = layCho(GHE_AN, key);
    else if (viec === "vai") cho = altarSpot(key + "khach");
    else if (viec === "tung") cho = seatOf(key, 1 + Math.floor(hash(key + "cap") * 45), 100);
    if (!cho) viec = "dao";
    if (viec === "dao") cho = DAO_DIEM[Math.floor(hash(key + "dao") * DAO_DIEM.length)];
    a.khach = viec;
    a.khachCho = cho!;
    a.khachNhin = nhin;
    a.khachT = 0;
    a.sitting = false;
    const x = a as any;
    const p = { x: a.root.position.x, z: a.root.position.z };
    if (viec === "tung" || viec === "vai") {
      a.path = route(p, cho!);
      return;
    }
    const ra = raSanTu(a);
    if (viec === "an") {
      const banZ = BAN.reduce((m, b) => (Math.abs(b.z - cho!.z) < Math.abs(m - cho!.z) ? b.z : m), BAN[0].z);
      const sau = cho!.z > banZ ? cho!.z + 0.95 : cho!.z - 0.95;
      x.sau = sau;
      x.anHuong = cho!.z > banZ ? Math.PI : 0;
      a.path = [...ra, { x: 15, z: 26 }, { x: 18.2, z: 26 }, { x: 20.3, z: 26.2 }, { x: 20.3, z: sau }, { x: cho!.x, z: sau }, cho!];
      return;
    }
    a.path = [...ra, cho!];
  }

  /* Chữ "+5 công đức" bay lên trên đầu */
  const bayLen: { s: any; t: number }[] = [];
  function nhayDiem(a: Actor, text: string) {
    const tex = canvasTex(THREE, 384, 96, (g) => {
      g.font = "900 56px 'Be Vietnam Pro', system-ui, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.lineWidth = 10;
      g.strokeStyle = "rgba(60,20,5,0.9)";
      g.strokeText(text, 192, 50);
      g.fillStyle = "#ffd34a";
      g.fillText(text, 192, 50);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.renderOrder = 12;
    sp.scale.set(1.8, 0.45, 1);
    sp.position.set(a.root.position.x, 2.4, a.root.position.z);
    scene.add(sp);
    bayLen.push({ s: sp, t: 0 });
  }

  let demKhach = 0;
  const MAX_KHACH = 36;
  /** Đường từ chỗ đang làm việc ra tới sân (chưa tới cổng) */
  function raSanTu(a: Actor): V2[] {
    const p = { x: a.root.position.x, z: a.root.position.z };
    if (p.x > 16) {
      const sau = (a as any).sau ?? p.z;
      return [{ x: p.x, z: sau }, { x: 20.3, z: sau }, { x: 20.3, z: 26.2 }, { x: 18.2, z: 26 }, { x: 15, z: 26 }];
    }
    if (p.z < 13) {
      const d: V2[] = [];
      if (Math.abs(p.x) > AISLE + 0.2) d.push({ x: Math.sign(p.x) * AISLE, z: p.z });
      d.push({ x: 0, z: 12.6 }, { x: 0, z: 16 });
      return d;
    }
    return [];
  }

  function khachVeFn(key: string) {
    const a = actors.get("k-" + key);
    if (!a || a.khachDi) return;
    const ra = raSanTu(a);
    traCho(a.key);
    a.sitting = false;
    a.bow = 0;
    a.body.rotation.x = 0;
    a.khachDi = true;
    a.path = [...ra, { x: 0, z: 34 }, CONG, { x: 0, z: 42 }];
  }

  let monTrenBan: any[] = [];
  let monTrenKhay: { ten: string; loai: "bat" | "coc" | "dia"; mau: number }[] = [];
  let meNgoiAn = false;
  let meDangAn = false;
  let viewAn = false;
  let lauToiCho = false;

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
  let lastPeople: Nguoi3D[] = [];
  let meOverride = false;
  let meArrive: (() => void) | null = null;
  let meAfterBow: (() => void) | null = null;
  let maxLvl = 100;
  let showAll = false;

  function setPeople(people: Nguoi3D[], maxLevel: number, names: "me" | "all") {
    lastPeople = people;
    maxLvl = maxLevel;
    showAll = names === "all";
    const seen = new Set<string>();
    for (const p of people) {
      const key = "p-" + p.key;
      seen.add(key);
      const phat = Boolean(p.phat);
      const dao = !phat && p.dao ? { x: p.dao.x, z: p.dao.z } : null;
      const dest = phat ? altarSpot(p.key) : dao ?? seatOf(p.key, p.level, maxLevel);
      const destKey = phat ? "phat" : dao ? `dao${dao.x.toFixed(2)},${dao.z.toFixed(2)}` : `ghe${p.level}`;
      let a = actors.get(key);
      if (a && p.me && meOverride) {
        // Đang ở sân chùa: tự điều khiển đường đi, không theo chỗ ngồi
        if (a.name !== p.name) {
          a.name = p.name;
          setTag(a, showAll || p.me);
        }
        a.level = p.level;
        continue;
      }
      if (!a) {
        const start = first ? dest : DOOR;
        a = addActor(key, lookFor(p), start, { level: p.level, name: p.name, me: p.me, phat, bowed: first && phat, dao: Boolean(dao), destKey });
        if (p.me && phat) cine = true;
        if (p.me) addMeRing(a);
        if (p.sam_hoi) addHalo(a);
        setTag(a, showAll || p.me);
        if (!first) {
          a.sitting = false;
          a.path = route({ x: 0, z: DOOR.z }, dest);
        }
      } else {
        if (a.name !== p.name) {
          a.name = p.name;
          setTag(a, showAll || p.me);
        }
        if (p.me && phat && !a.phat) cine = true;
        if (a.destKey !== destKey || a.leaving) {
          const wasDao = a.dao;
          a.destKey = destKey;
          a.dao = Boolean(dao);
          a.level = p.level;
          a.phat = phat;
          a.bowed = false;
          a.bow = 0;
          a.body.rotation.x = 0;
          a.leaving = false;
          a.sitting = false;
          // Đi dạo: đi thẳng tới chỗ chạm; còn lại ra lối giữa rồi vào chỗ
          a.path = dao || wasDao ? [dest] : route({ x: a.root.position.x, z: a.root.position.z }, dest);
        }
      }
      if (p.noi && p.noi.id !== a.noiId) {
        a.noiId = p.noi.id;
        if (!first || p.me) showBubble(a, p.noi.text);
        else a.noiId = p.noi.id;
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

  /* ---------------- Camera: tự lắc nhẹ, kéo để xoay, cuộn hoặc chụm hai ngón để gần xa ----------------
   * Thao tác chỉ đổi "đích"; camera lướt dần tới đích mỗi khung hình (giảm chấn),
   * thả tay thì còn trôi theo quán tính rồi dừng, nên xoay trên điện thoại mượt hơn. */
  const target = new THREE.Vector3(0, 0.6, -1.5);
  let yaw = 0; // lắc tự động
  let userYaw = 0; // góc đang hiển thị do người xoay
  let goalYaw = 0; // góc người muốn tới
  let velYaw = 0; // quán tính sau khi thả tay
  let pitch = 0.5;
  let goalPitch = 0.5;
  let radius = mobile ? 18 : 16.5;
  let goalRadius = radius;
  let lastTouch = -1e9;
  const el = renderer.domElement;
  const pts = new Map<number, { x: number; y: number }>();
  let pinch0 = 0;
  let lastMoveAt = 0;
  const clampYaw = (v: number) => v; // xoay tự do trọn vòng
  const goalTarget = target.clone();
  let viewSan = false; // đang ở sân chùa
  let viewTong = false; // nhìn toàn cảnh từ trên cao (màn hình live)
  let tuQuay = false;
  let tourT = 0;
  let tourIdx = -1;
  let viewTheo = false; // điểm nhìn "Theo con": xoay quanh nhân vật của mình
  const TWO_PI = Math.PI * 2;
  let tapStart: { x: number; y: number; t: number; moved: number } | null = null;
  const onDown = (e: PointerEvent) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    tapStart = pts.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 } : null;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* bỏ qua */
    }
    velYaw = 0;
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
    }
    lastTouch = performance.now();
  };
  const onMove = (e: PointerEvent) => {
    const prev = pts.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pts.set(e.pointerId, cur);
    const now = performance.now();
    if (pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0 > 0) goalRadius = Math.max(viewTheo ? 2.5 : 4, Math.min(24, goalRadius * (pinch0 / d)));
      pinch0 = d;
    } else {
      const w = el.clientWidth || 600;
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const step = (-dx / w) * 2.4; // kéo hết bề ngang khung ≈ xoay 2,4 rad
      goalYaw = clampYaw(goalYaw + step);
      const dtm = Math.max(8, now - lastMoveAt);
      velYaw = velYaw * 0.6 + (step / dtm) * 1000 * 0.4; // rad/giây
      goalPitch = Math.max(0.1, Math.min(1.4, goalPitch + (dy / (el.clientHeight || 400)) * 1.6));
    }
    lastMoveAt = now;
    lastTouch = now;
  };
  const onUp = (e: PointerEvent) => {
    if (tapStart && pts.size === 1 && performance.now() - tapStart.t < 400 &&
        Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) < 10) {
      handleTap(e.clientX, e.clientY);
    }
    tapStart = null;
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch0 = 0;
    if (performance.now() - lastMoveAt > 80) velYaw = 0;
  };
  /* Chạm nhẹ: trúng nhân vật ảo thì báo để trò chuyện, trúng sàn thì báo chỗ để đi tới */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  type Tap =
    | { kind: "npc"; key: string; ten: string; vai: string; nu: boolean; loi?: string }
    | { kind: "san"; x: number; z: number }
    | { kind: "an" }
    | { kind: "to" }
    | { kind: "traiduong"; x: number; z: number }
    | { kind: "sanchua"; x: number; z: number }
    | { kind: "tro"; tro: Tro };
  let onTap: ((t: Tap) => void) | null = null;
  let noiCb: ((text: string, vai: string) => void) | null = null;
  function handleTap(cx: number, cy: number) {
    if (!onTap) return;
    const r = el.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const npcs = [...actors.values()].filter((a) => a.npc);
    const hits = ray.intersectObjects(npcs.map((a) => a.root), true);
    if (hits.length) {
      let o = hits[0].object;
      while (o && !npcs.some((a) => a.root === o)) o = o.parent;
      const a = npcs.find((x) => x.root === o);
      if (a) {
        const loi = a.loiRieng?.length ? a.loiRieng[Math.floor(Math.random() * a.loiRieng.length)] : undefined;
        onTap({ kind: "npc", key: a.key, ten: a.ten ?? "Sư thầy", vai: a.kind ?? "su", nu: Boolean(a.nuNpc), loi });
        return;
      }
    }
    const th = ray.intersectObjects(TRAM.map((t) => t.group), true);
    if (th.length && th[0].object.userData.tro) {
      onTap({ kind: "tro", tro: th[0].object.userData.tro });
      return;
    }
    if (!viewSan && !viewAn && ray.intersectObject(ongTo, false).length) {
      onTap({ kind: "to" });
      return;
    }
    const ca = ray.intersectObject(congAn, true);
    if (ca.length) {
      onTap({ kind: "an" });
      return;
    }
    const f = ray.intersectObjects([floor, sanFloor, anFloor], false);
    if (f.length) {
      const pnt = f[0].point;
      if (f[0].object === anFloor) {
        onTap({ kind: "traiduong", x: Math.max(19.8, Math.min(32.6, pnt.x)), z: Math.max(18.3, Math.min(33.7, pnt.z)) });
        return;
      }
      if (pnt.z > 13.6) onTap({ kind: "sanchua", x: Math.max(-15.5, Math.min(15.5, pnt.x)), z: Math.max(14.2, Math.min(37.5, pnt.z)) });
      else onTap({ kind: "san", x: Math.max(-8.5, Math.min(8.5, pnt.x)), z: Math.max(-8.6, Math.min(11, pnt.z)) });
    }
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    goalRadius = Math.max(viewTheo ? 2.5 : 4, Math.min(24, goalRadius + e.deltaY * 0.01));
    lastTouch = performance.now();
  };
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
  el.addEventListener("wheel", onWheel, { passive: false });

  /* ---------------- Vòng lặp ---------------- */
  let running = true;
  let paused = false;
  let visible = true;
  let raf = 0;
  let last = performance.now();
  let t = 0;
  const tmp = new THREE.Vector3();
  // Camera dẫn cảnh cho chính mình khi lên vái Tổ
  let cine = false;
  let lift = 0;
  let lastDy = 0;
  let cineW = 0;
  const camPos = new THREE.Vector3(0, 9, 14);
  const camLook = new THREE.Vector3(0, 0.6, -1.5);
  const wantPos = new THREE.Vector3();
  const wantLook = new THREE.Vector3();
  const ovPos = new THREE.Vector3();
  const OT = new THREE.Vector3(0, 2.6, -11);

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

  /** Nhân vật ảo trai đường làm việc của mình khi không phải đi đâu. */
  function tinhIdle(a: Actor, dt: number) {
    if (a.onDen) {
      const f = a.onDen;
      a.onDen = null;
      f();
      if (a.path.length) return;
    }
    const x = a as any;
    if (a.pause > 0) a.pause -= dt;
    if (a.tinh === "an") {
      setAnPose(a, true);
      return;
    }
    let want = a.yaw;
    if (a.pause > 0 && a.faceTo) want = Math.atan2(a.faceTo.x - a.root.position.x, a.faceTo.z - a.root.position.z);
    else if (a.tinh === "nau") want = Math.PI / 2;
    else if (a.tinh === "don") want = x.huong ?? -Math.PI / 2;
    else if (a.tinh === "lau") want = x.huong ?? -Math.PI / 2;
    let diff = want - a.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    a.yaw += diff * Math.min(1, dt * 6);
    a.root.rotation.y = a.yaw;
    setWalkPose(a, false, 0);
    if (a.pause > 0) return;
    if (a.tinh === "nau") {
      // khuấy nồi
      const k = t * 3.2;
      a.hands[1].position.set(0.22 + Math.cos(k) * 0.07, 0.74, 0.42 + Math.sin(k) * 0.07);
      a.hands[0].position.set(-0.3, 0.62, 0.2);
      return;
    }
    if (a.tinh === "lau") {
      x.lauT = (x.lauT ?? 2.5) - dt;
      a.hands[1].position.set(0.12 + Math.sin(t * 9) * 0.16, 0.72, 0.42);
      if (x.lauT > 0) return;
      x.lauT = 2.5 + Math.random() * 2;
      if (lauToiCho) {
        lauToiCho = false;
        a.path = [{ x: 25.8, z: 27.3 }, { x: 20.8, z: 27.3 }, { x: 20.8, z: 25 }];
        a.onDen = () => {
          x.huong = Math.PI / 2;
          x.lauT = 3;
          const loi = "Để chú tiểu lau bàn sạch bong cho thí chủ nha!";
          showBubble(a, loi);
          noiCb?.(loi, a.kind ?? "tieu");
          setTimeout(() => {
            monTrenBan.forEach((m) => scene.remove(m));
            monTrenBan = [];
          }, 1800);
          x.veSau = true;
        };
        return;
      }
      if (x.veSau) {
        x.veSau = false;
        a.path = [{ x: 20.8, z: 27.3 }, { x: 25.8, z: 27.3 }];
        x.huong = -Math.PI / 2;
        return;
      }
      a.loopIdx = ((a.loopIdx ?? 0) + 1) % LAU_DIEM.length;
      a.path = [LAU_DIEM[a.loopIdx]];
      x.huong = a.loopIdx % 2 ? Math.PI / 2 : -Math.PI / 2;
      return;
    }
    // tiếp khách: đứng chắp tay chờ khách
    a.hands[0].position.set(-0.045, 0.78, 0.34);
    a.hands[1].position.set(0.045, 0.78, 0.34);
  }

  function setAnPose(a: Actor, an: boolean) {
    a.dem.visible = false;
    a.feet.forEach((f) => (f.visible = true));
    a.feet[0].position.z = 0.3;
    a.feet[1].position.z = 0.3;
    a.body.position.y = a.ngoiY ?? 0.34;
    a.body.rotation.z = 0;
    if (an) {
      const k = Math.max(0, Math.sin(t * 2.4 + a.phase));
      a.hands[0].position.set(-0.13, 0.62, 0.36);
      a.hands[1].position.set(0.1 - k * 0.06, 0.6 + k * 0.42, 0.34 - k * 0.06);
    } else {
      a.hands[0].position.set(-0.05, 0.62, 0.3);
      a.hands[1].position.set(0.05, 0.62, 0.3);
    }
  }

  function stepActor(a: Actor, dt: number) {
    if (a.khach && a.bow <= 0 && !a.path.length) {
      khachIdle(a, dt);
      return;
    }
    if (a.tinh && a.bow <= 0 && !a.path.length) {
      tinhIdle(a, dt);
      return;
    }
    if (a.bow > 0) {
      // Vái: cúi người ba lần
      a.bow += dt;
      a.body.rotation.x = Math.abs(Math.sin(a.bow * 3.2)) * 0.45;
      a.yaw += (Math.PI - a.yaw) * Math.min(1, dt * 6);
      a.root.rotation.y = a.yaw;
      setBowPose(a);
      if (a.bow > 3) {
        a.bow = 0;
        a.body.rotation.x = 0;
        if (a.me && meAfterBow) {
          const f = meAfterBow;
          meAfterBow = null;
          f();
        }
      }
      return;
    }
    if (a.pause > 0) {
      a.pause -= dt;
      if (a.faceTo) {
        const want = Math.atan2(a.faceTo.x - a.root.position.x, a.faceTo.z - a.root.position.z);
        let diff = want - a.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.yaw += diff * Math.min(1, dt * 6);
        a.root.rotation.y = a.yaw;
      }
      setWalkPose(a, false, 0);
      if (a.pause <= 0 && a.npc) {
        a.faceTo = null;
        setTag(a, false);
      }
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
      if (a.me && meArrive) {
        const f = meArrive;
        meArrive = null;
        f();
        if (a.path.length || a.bow > 0) return;
      }
      if (a.me && meNgoiAn) {
        a.yaw += (Math.PI - a.yaw) * Math.min(1, dt * 6);
        a.root.rotation.y = a.yaw;
        a.ngoiY = 0.34;
        setAnPose(a, meDangAn);
        return;
      }
      if (a.dao) {
        // Đang đi dạo: đứng tại chỗ, nhìn quanh
        if (a.faceTo) {
          const want = Math.atan2(a.faceTo.x - a.root.position.x, a.faceTo.z - a.root.position.z);
          let diff = want - a.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          a.yaw += diff * Math.min(1, dt * 6);
          a.root.rotation.y = a.yaw;
        }
        a.sitting = false;
        setWalkPose(a, false, 0);
        return;
      }
      if (a.phat && !a.bowed) {
        // Tới trước Ông Tổ: vái ba vái rồi mới ngồi tụng kinh
        a.bowed = true;
        a.bow = 0.001;
        return;
      }
      if (!a.sitting) {
        a.sitting = true;
        a.body.position.y = 0;
        if (a.me && !a.phat && cine) cine = false; // về tới chỗ cũ: camera quay về toàn cảnh
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
    const nhanh = a.me && meOverride ? 2.3 : 1; // ra sân chùa, vào vái Tổ: đi nhanh như chạy bộ
    const stepLen = a.speed * nhanh * dt * (opts.reduce ? 3 : 1);
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
    a.phase += dt * (a.speed * nhanh > 2 ? 15 : 9);
    setWalkPose(a, true, a.phase);
  }

  function setBowPose(a: Actor) {
    a.dem.visible = false;
    a.feet.forEach((f) => (f.visible = true));
    a.body.position.y = 0.14;
    a.feet[0].position.z = 0.05;
    a.feet[1].position.z = 0.05;
    // Chắp tay trước ngực, đưa lên đưa xuống theo nhịp vái
    const lift = Math.cos(a.bow * 3.2 * 2) * 0.08;
    a.hands[0].position.set(-0.045, 0.82 + lift, 0.34);
    a.hands[1].position.set(0.045, 0.82 + lift, 0.34);
  }

  function setSitPose(a: Actor) {
    a.dem.visible = true;
    a.feet.forEach((f) => (f.visible = false));
    a.body.position.y = Math.sin(t * 1.3 + a.phase) * 0.008;
    a.body.rotation.z = a.phat ? Math.sin(t * 2.4 + a.phase) * 0.05 : 0;
    a.hands[0].position.set(-0.05, 0.62, 0.3);
    a.hands[1].position.set(0.05, 0.62, 0.3);
  }

  function setWalkPose(a: Actor, moving: boolean, ph: number) {
    a.dem.visible = false;
    a.feet.forEach((f) => (f.visible = true));
    const sw = moving ? Math.sin(ph) : 0;
    a.body.rotation.z = 0;
    a.body.position.y = 0.14 + (moving ? Math.abs(Math.sin(ph)) * 0.06 : 0);
    a.feet[0].position.z = 0.05 + sw * 0.16;
    a.feet[1].position.z = 0.05 - sw * 0.16;
    a.hands[0].position.set(-0.36, 0.55, sw * 0.14);
    a.hands[1].position.set(0.36, 0.55, -sw * 0.14);
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (!running || !visible || paused || document.hidden) {
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
    lanterns.forEach((l, i) => {
      l.rotation.y += dt * 0.25;
      l.rotation.z = Math.sin(t * 0.8 + i) * 0.04;
    });
    for (const p of smoke) {
      p.life += dt * 0.12;
      if (p.life > 1) p.life -= 1;
      const k = p.life;
      p.s.position.set(Math.sin(k * 9 + t) * 0.15 * k, 2.3 + k * 2.6, -10 + Math.cos(k * 7) * 0.1);
      p.s.scale.setScalar(0.15 + k * 0.9);
      p.s.material.opacity = (1 - k) * 0.5;
    }

    // xe đua mini chạy vòng, khán giả thỉnh thoảng reo
    for (const xe of xeDua) {
      const k = t * 1.3 + xe.userData.k;
      xe.position.set(Math.cos(k) * 2.8, 0.15, Math.sin(k) * 2);
      xe.rotation.y = -k;
    }
    // trai đường: hơi nước, lửa bếp, mái ẩn khi ở trong
    for (const h of hoi) {
      h.life += dt * 0.35;
      if (h.life > 1) h.life -= 1;
      const k = h.life;
      h.s.position.set(33.6 + Math.sin(k * 8 + t) * 0.12, 1.5 + k * 1.8, h.z + Math.cos(k * 6) * 0.1);
      h.s.scale.setScalar(0.25 + k * 0.8);
      h.s.material.opacity = (1 - k) * 0.55;
    }
    denBep.intensity = 6 * (1 + Math.sin(t * 11) * 0.12 + Math.sin(t * 5.3) * 0.08);
    noi.forEach((n, i) => (n.position.y = 1.17 + Math.max(0, Math.sin(t * 9 + i * 2)) * 0.012));
    maiAn.visible = !viewAn;
    // Ông Tổ ban phúc: hào quang sáng rực rồi dịu lại
    if (toSang > 0) toSang = Math.max(0, toSang - dt);
    const sang = toSang > 0 ? Math.sin(Math.min(1, toSang / 4) * Math.PI) : 0;
    halo.scale.setScalar(5.5 * (1 + sang * 0.35 + Math.sin(t * 6) * 0.03 * sang));
    halo.material.opacity = 1;
    halo.material.color.setRGB(1 + sang * 0.6, 1 + sang * 0.5, 1);
    for (let i = bayLen.length - 1; i >= 0; i--) {
      const b = bayLen[i];
      b.t += dt;
      b.s.position.y = 2.4 + b.t * 0.7;
      b.s.material.opacity = Math.max(0, 1 - Math.max(0, b.t - 1.4) / 0.9);
      if (b.t > 2.3) {
        scene.remove(b.s);
        b.s.material.map?.dispose();
        b.s.material.dispose();
        bayLen.splice(i, 1);
      }
    }
    reoT -= dt;
    if (reoT < -6 && Math.random() < dt * 0.3) reoT = 1.6;
    for (const k of khanGia) {
      k.body.position.y = 0.14 + (reoT > 0 ? Math.abs(Math.sin(t * 10 + k.i)) * 0.18 : 0);
    }

    for (const a of actors.values()) {
      if (!a.bubble) continue;
      a.bubbleT -= dt;
      a.bubble.material.opacity = Math.max(0, Math.min(1, a.bubbleT / 0.6));
      if (a.bubbleT <= 0) {
        a.root.remove(a.bubble);
        a.bubble.material.map?.dispose();
        a.bubble.material.dispose();
        a.bubble = null;
      }
    }

    // Màn hình live: máy quay tự đi vòng chánh điện, sân chùa, trai đường, toàn cảnh
    if (tuQuay) {
      tourT -= dt;
      if (tourT <= 0) {
        tourIdx = (tourIdx + 1) % 4;
        tourT = tourIdx === 3 ? 9 : 12;
        const base = Math.round((goalYaw + yaw) / TWO_PI) * TWO_PI - yaw;
        viewTheo = false;
        viewTong = tourIdx === 3;
        viewAn = tourIdx === 2;
        viewSan = tourIdx === 1;
        if (tourIdx === 0) {
          goalTarget.set(0, 0.6, -1.5);
          goalYaw = base;
          goalPitch = 0.5;
          goalRadius = mobile ? 18 : 16.5;
        } else if (tourIdx === 1) {
          goalTarget.set(1.5, 0.8, 25.5);
          goalYaw = base;
          goalPitch = 0.62;
          goalRadius = mobile ? 20 : 18;
        } else if (tourIdx === 2) {
          goalTarget.set(AN_TAM.x - 0.5, 0.8, AN_TAM.z - 0.3);
          goalYaw = base - Math.PI / 2;
          goalPitch = 0.6;
          goalRadius = mobile ? 14 : 13;
        } else {
          goalTarget.set(7, 0, 14);
          goalYaw = base + 0.5;
          goalPitch = 1.0;
          goalRadius = mobile ? 50 : 44;
        }
      }
      // bay chậm quanh điểm nhìn cho có hồn
      goalYaw += dt * (tourIdx === 3 ? 0.06 : 0.025);
    }
    const fogXa = viewTong ? 120 : 42;
    if (Math.abs(scene.fog.far - fogXa) > 0.5) {
      scene.fog.far += (fogXa - scene.fog.far) * Math.min(1, dt * 2);
      scene.fog.near = scene.fog.far - 22;
    }
    // Camera: quán tính khi vừa thả tay, rồi lướt dần về đích
    if (!pts.size && Math.abs(velYaw) > 0.01) {
      goalYaw = clampYaw(goalYaw + velYaw * dt);
      velYaw *= Math.pow(0.04, dt); // tắt dần trong khoảng 1 giây
    }
    const idle = performance.now() - lastTouch > 5000;
    if (idle && !opts.reduce && !viewTheo) {
      yaw += (Math.sin(t * 0.06) * 0.25 - yaw) * Math.min(1, dt * 0.8); // lắc nhẹ quanh góc người chọn
    }
    if (viewTheo) {
      for (const a of actors.values()) if (a.me) goalTarget.set(a.root.position.x, 0.9, a.root.position.z);
    }
    target.lerp(goalTarget, 1 - Math.pow(0.002, dt));
    const k = 1 - Math.pow(0.0005, dt); // giảm chấn, không phụ thuộc tốc độ khung hình
    userYaw += (goalYaw - userYaw) * k;
    pitch += (goalPitch - pitch) * k;
    radius += (goalRadius - radius) * k;
    const y = yaw + userYaw;
    tmp.set(Math.sin(y) * Math.cos(pitch), Math.sin(pitch), Math.cos(y) * Math.cos(pitch)).multiplyScalar(radius);
    ovPos.copy(target).add(tmp);
    // Luôn ở trong chánh điện, không lọt ra sau tường
    if (viewTong) {
      // nhìn từ trên cao, không giới hạn
    } else if (viewAn) {
      ovPos.x = Math.max(14, Math.min(42, ovPos.x));
      ovPos.z = Math.max(13, Math.min(44, ovPos.z));
    } else if (viewSan) {
      ovPos.x = Math.max(-16, Math.min(16, ovPos.x));
      ovPos.z = Math.max(12, Math.min(44, ovPos.z));
    } else {
      ovPos.x = Math.max(-9.4, Math.min(9.4, ovPos.x));
      ovPos.z = Math.max(-12.2, Math.min(13.5, ovPos.z));
    }
    ovPos.y = Math.max(0.5, ovPos.y);

    let me: Actor | undefined;
    if (cine) for (const a of actors.values()) if (a.me) me = a;
    // Chỉ cận cảnh lúc đang đi và lúc vái; ngồi tụng kinh thì về toàn cảnh
    if (cine && me && (me.bow > 0 || me.path.length > 0)) {
      const p = me.root.position;
      const fx = Math.sin(me.yaw);
      const fz = Math.cos(me.yaw);
      if (me.bow > 0) {
        // Đang vái: đứng chéo phía trước, nhìn vào hai tay chắp
        wantPos.set(p.x + fx * 1.7 + fz * 0.9, 1.25, p.z + fz * 1.7 - fx * 0.9);
        wantLook.set(p.x + fx * 0.25, 0.85, p.z + fz * 0.25);
      } else if (me.path.length) {
        // Đang đi: bám sau lưng, nhìn về phía trước
        wantPos.set(p.x - fx * 2.8, 2.1, p.z - fz * 2.8);
        wantLook.set(p.x + fx * 2.5, 1.0, p.z + fz * 2.5);
      } else {
        // Ngồi tụng kinh trước bàn thờ: sau lưng, nhìn lên Ông Tổ
        wantPos.set(p.x * 0.7, 2.4, p.z + 3.2);
        wantLook.copy(OT);
      }
      cineW += (1 - cineW) * (1 - Math.pow(0.05, dt));
    } else {
      wantPos.copy(ovPos);
      wantLook.copy(target);
      cineW += (0 - cineW) * (1 - Math.pow(0.05, dt));
    }
    // Lướt mượt tới vị trí mong muốn (cận cảnh thì bám nhanh hơn)
    const kc = 1 - Math.pow(cine ? 0.02 : 0.003, dt);
    if (cineW < 0.01 && !cine) {
      camPos.copy(ovPos);
      camLook.copy(target);
    } else {
      camPos.lerp(wantPos, kc);
      camLook.lerp(wantLook, kc);
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    if (me?.tag) me.tag.visible = cineW < 0.3; // cận cảnh thì ẩn bảng tên to
    else for (const a of actors.values()) if (a.me && a.tag) a.tag.visible = !viewTheo;
    // Toàn màn hình có bảng câu hỏi che nửa dưới: đẩy khung hình lên khi cận cảnh
    const dy = Math.round(lift * cineW * (host.clientHeight || 0));
    if (dy !== lastDy) {
      lastDy = dy;
      if (dy > 0) camera.setViewOffset(host.clientWidth, host.clientHeight, 0, dy, host.clientWidth, host.clientHeight);
      else camera.clearViewOffset();
    }

    // Máy yếu: tự hạ độ phân giải để giữ khung hình đều
    fpsAcc += dt;
    fpsN++;
    if (fpsAcc > 2) {
      const fps = fpsN / fpsAcc;
      if (fps < 40 && pr > 0.75) {
        pr = Math.max(0.75, pr - 0.25);
        renderer.setPixelRatio(pr);
        resize();
      } else if (fps > 57 && pr < prMax) {
        pr = Math.min(prMax, pr + 0.25);
        renderer.setPixelRatio(pr);
        resize();
      }
      fpsAcc = 0;
      fpsN = 0;
    }

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    setPeople,
    /** Chọn điểm nhìn: toàn cảnh, trước Ông Tổ, từ trên cao, hoặc theo nhân vật của mình. */
    /** Ra sân chùa: nhân vật đi ra cửa, xuống sân; tới nơi thì gọi xong(). */
    raSan(xong?: () => void) {
      const me = [...actors.values()].find((x) => x.me);
      if (!me) return;
      meOverride = true;
      cine = true;
      me.dao = true;
      me.sitting = false;
      me.bow = 0;
      me.body.rotation.x = 0;
      const x = me.root.position.x;
      const z = me.root.position.z;
      me.path = [
        ...(Math.abs(x) > AISLE + 0.2 && z < 12 ? [{ x: Math.sign(x) * AISLE, z }] : []),
        { x: 0, z: 12.6 },
        { x: 0, z: 16 },
      ];
      meArrive = () => {
        viewSan = true;
        goalTarget.set(1.5, 0.8, 24.5);
        goalYaw = Math.round((goalYaw + yaw) / TWO_PI) * TWO_PI - yaw;
        goalPitch = 0.55;
        goalRadius = mobile ? 17 : 15;
        xong?.();
      };
    },
    /** Đi tới một chỗ trong sân (hoặc tới trò chơi). */
    diToi(x: number, z: number, xong?: () => void) {
      const me = [...actors.values()].find((a) => a.me);
      if (!me) return;
      cine = true;
      me.path = [{ x, z }];
      meArrive = xong ?? null;
    },
    choTro(tro: Tro): V2 | null {
      return TRAM.find((t) => t.tro === tro)?.cho ?? null;
    },
    /** Thua thì vào chánh điện vái Tổ ba vái rồi ra sân chơi tiếp. */
    vaiTo(xong?: () => void) {
      const me = [...actors.values()].find((a) => a.me);
      if (!me) return;
      cine = true;
      viewSan = false;
      goalTarget.set(0, 0.6, -1.5);
      goalPitch = 0.5;
      goalRadius = mobile ? 18 : 16.5;
      me.path = [{ x: 0, z: 15 }, { x: 0, z: 12.6 }, { x: 0.45, z: -6.9 }];
      meArrive = () => {
        me.bow = 0.001;
        meAfterBow = () => {
          me.path = [{ x: 0, z: 12.6 }, { x: 0, z: 16 }];
          meArrive = () => {
            viewSan = true;
            goalTarget.set(1.5, 0.8, 24.5);
            goalPitch = 0.55;
            goalRadius = mobile ? 17 : 15;
            xong?.();
          };
        };
      };
    },
    /** Về chỗ ngồi trong chánh điện. */
    veCho() {
      const me = [...actors.values()].find((a) => a.me);
      const tuAn = Boolean(me && me.root.position.x > 15.8);
      meOverride = false;
      meArrive = null;
      meAfterBow = null;
      meNgoiAn = false;
      meDangAn = false;
      viewAn = false;
      viewSan = false;
      goalTarget.set(0, 0.6, -1.5);
      goalPitch = 0.5;
      goalRadius = mobile ? 18 : 16.5;
      if (me) {
        me.dao = false;
        me.destKey = "";
        cine = true;
        me.path = tuAn
          ? [{ x: Math.min(me.root.position.x, 22.2), z: 26.9 }, { x: 20.4, z: 26.6 }, { x: 18.2, z: 26 }, { x: 15, z: 26 }, { x: 0, z: 16 }, { x: 0, z: 12.6 }]
          : [{ x: 0, z: 12.6 }];
      }
      setPeople(lastPeople, maxLvl, showAll ? "all" : "me");
    },
    /** Sang trai đường: đi qua cổng bên phải sân, chú tiểu chào, rồi vào chỗ ngồi; ngồi xong gọi xong(). */
    vaoAn(xong?: () => void) {
      const me = [...actors.values()].find((x) => x.me);
      if (!me) return;
      meOverride = true;
      cine = true;
      me.dao = true;
      me.sitting = false;
      me.bow = 0;
      me.body.rotation.x = 0;
      const p = me.root.position;
      const duong: V2[] = [];
      if (p.z < 13) {
        if (Math.abs(p.x) > AISLE + 0.2) duong.push({ x: Math.sign(p.x) * AISLE, z: p.z });
        duong.push({ x: 0, z: 12.6 }, { x: 0, z: 16 });
      }
      if (p.x < 15.5) duong.push({ x: 15, z: 26 });
      duong.push({ x: 18.2, z: 26 }, { x: 20.2, z: 26.4 });
      me.path = duong;
      meArrive = () => {
        viewAn = true;
        viewSan = false;
        // nhìn từ phía sân vào: thấy bàn ghế, bếp và bảng thực đơn phía sau
        goalTarget.set(AN_TAM.x - 0.5, 0.8, AN_TAM.z - 0.3);
        goalYaw = Math.round((goalYaw + yaw) / TWO_PI) * TWO_PI - yaw - Math.PI / 2;
        goalPitch = 0.6;
        goalRadius = mobile ? 13 : 12;
        const loi = "A Di Đà Phật! Mời thí chủ vào trai đường dùng bữa ạ.";
        tieuDon.faceTo = { x: me.root.position.x, z: me.root.position.z };
        tieuDon.pause = 3;
        showBubble(tieuDon, loi);
        noiCb?.(loi, "tieu");
        me.path = [SAU_GHE, CHO_TOI];
        meArrive = () => {
          meNgoiAn = true;
          xong?.();
        };
      };
    },
    /** Gọi món: chú tiểu vào bếp lấy món, bưng khay ra đặt trước mặt mình. */
    goiMon(mon: { ten: string; loai: "bat" | "coc" | "dia"; mau: number }[], xong?: () => void) {
      monTrenKhay = mon.slice(0, 4);
      const x = tieuDon as any;
      tieuDon.pause = 0;
      tieuDon.path = [{ x: 25.6, z: 27.4 }, { x: 31.6, z: 27.4 }, { x: 32.4, z: 26 }];
      tieuDon.onDen = () => {
        x.huong = Math.PI / 2;
        tieuDon.faceTo = null;
        tieuDon.pause = 1.4;
        const loi = "Chú tiểu lấy món ngay đây ạ!";
        showBubble(tieuDon, loi);
        noiCb?.(loi, "tieu");
        setTimeout(() => {
          khay.clear();
          const k = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.45), mat(0x8a4a22));
          khay.add(k);
          monTrenKhay.forEach((m, i) => {
            const g = lamMon(m.loai, m.mau);
            g.scale.setScalar(0.7);
            g.position.set(-0.22 + i * 0.15, 0.02, (i % 2) * 0.1 - 0.05);
            khay.add(g);
          });
          khay.visible = true;
          tieuDon.path = [{ x: 31.6, z: 27.4 }, { x: 23.6, z: 27.4 }, { x: 23.3, z: 26.8 }];
          tieuDon.onDen = () => {
            x.huong = Math.PI;
            khay.visible = false;
            monTrenBan.forEach((m) => scene.remove(m));
            monTrenBan = monTrenKhay.map((m, i, all) => {
              const g = lamMon(m.loai, m.mau);
              g.position.set(CHO_TOI.x + (i - (all.length - 1) / 2) * 0.42, 0.83, 25.32);
              scene.add(g);
              return g;
            });
            const loi2 = "Món của thí chủ đây ạ! Chúc thí chủ ngon miệng.";
            tieuDon.pause = 2.6;
            tieuDon.faceTo = { x: CHO_TOI.x, z: CHO_TOI.z };
            showBubble(tieuDon, loi2);
            noiCb?.(loi2, "tieu");
            meDangAn = true;
            xong?.();
            setTimeout(() => {
              tieuDon.path = [{ x: 23.6, z: 27.6 }, CHO_DON];
              x.huong = -Math.PI / 2;
            }, 2600);
          };
        }, 1400);
      };
    },
    /** Ăn xong: thôi động tác ăn, chú tiểu ra lau bàn dọn bát. */
    anXong() {
      meDangAn = false;
      lauToiCho = true;
      (tieuLau as any).lauT = 0;
      const me = [...actors.values()].find((a) => a.me);
      if (me) showBubble(me, "Ngon quá! Con cảm ơn chú tiểu ạ.");
    },
    /** Rời trai đường ra sân chơi. */
    raKhoiAn(xong?: () => void) {
      const me = [...actors.values()].find((a) => a.me);
      if (!me) return;
      meNgoiAn = false;
      meDangAn = false;
      cine = true;
      me.path = [SAU_GHE, { x: 20.4, z: 26.6 }, { x: 18.2, z: 26 }, { x: 15, z: 26 }, { x: 12, z: 25 }];
      meArrive = () => {
        viewAn = false;
        viewSan = true;
        goalTarget.set(1.5, 0.8, 24.5);
        goalPitch = 0.55;
        goalRadius = mobile ? 17 : 15;
        xong?.();
      };
    },
    /** Đi tới một chỗ trong trai đường (khi chưa ngồi). */
    diTrongAn(x: number, z: number) {
      const me = [...actors.values()].find((a) => a.me);
      if (!me || meNgoiAn) return;
      me.path = [{ x, z }];
    },
    /** Khách xem live vào chùa: đi qua cổng tam quan tới chỗ làm việc được giao. Trả về việc thật sự nhận. */
    themKhach(k: { key: string; ten: string; gioi: "nam" | "nu"; viec: Viec }): Viec {
      const key = "k-" + k.key;
      const cu = actors.get(key);
      if (cu && !cu.khachDi) return ((cu as any).viecSau ?? cu.khach ?? "dao") as Viec;
      // Mới vào: lên chánh điện viếng Ông Tổ xin điểm cao trước, xong mới đi làm việc được giao
      const viec: ViecKhach = "vieng";
      const cho: V2 | null = altarSpot(key + "vieng");
      const nhin: V2 | undefined = undefined;
      const gioi = k.gioi;
      const look: Look = {
        gender: gioi,
        robe: AO_KHACH[Math.floor(hash(key + "ao") * AO_KHACH.length)],
        sash: gioi === "nam" && hash(key + "dai") < 0.5 ? 0xe0b13c : undefined,
      };
      const a = addActor(key, look, CONG, {
        npc: true,
        kind: "phattu",
        ten: k.ten,
        name: k.ten,
        nuNpc: gioi === "nu",
        sitting: false,
        speed: 3.2,
        khach: viec,
        khachCho: cho!,
        khachNhin: nhin,
        khachT: 0,
      });
      a.dem.visible = false;
      a.feet.forEach((f) => (f.visible = true));
      a.yaw = Math.PI;
      a.root.rotation.y = Math.PI;
      a.path = duongTuCong(cho!, "vai");
      const x = a as any;
      x.viecSau = k.viec;
      x.tenGoc = k.ten;
      x.so = ++demKhach;
      setTag(a, true);
      // đông quá thì người vào sớm nhất ra về
      const ks = [...actors.values()].filter((y) => y.khach && !y.khachDi);
      if (ks.length > MAX_KHACH) {
        ks.sort((p, q) => (p as any).so - (q as any).so);
        khachVeFn(ks[0].key.slice(2));
      }
      return k.viec;
    },
    /** Khách bình luận: hiện bong bóng lời nói trên đầu. */
    khachNoi(key: string, text: string): boolean {
      const a = actors.get("k-" + key);
      if (!a || a.khachDi) return false;
      showBubble(a, text);
      return true;
    },
    /** Khách tặng quà: lên chánh điện thắp hương vái Tổ. */
    khachThapHuong(key: string) {
      const a = actors.get("k-" + key);
      if (!a || a.khachDi) return;
      const ra = raSanTu(a);
      traCho("k-" + key);
      a.sitting = false;
      a.bow = 0;
      a.body.rotation.x = 0;
      a.khach = "vai";
      a.khachCho = altarSpot(a.key + "huong");
      a.khachT = 5;
      const p = { x: a.root.position.x, z: a.root.position.z };
      a.path = p.z < 13 && p.x < 16 ? [...ra.slice(0, -2), ...route({ x: AISLE, z: p.z }, a.khachCho)] : [...ra, { x: 0, z: 16 }, { x: 0, z: 12.6 }, ...route({ x: 0, z: 12.6 }, a.khachCho)];
      showBubble(a, "Con xin thắp nén hương dâng Ông Tổ!");
    },
    /** Khách rời live: đi ra cổng rồi biến mất. */
    khachVe(key: string) {
      khachVeFn(key);
    },
    /** Cộng công đức cho khách: chữ "+N công đức" bay lên, bảng tên ghi tổng công đức. */
    khachCongDuc(key: string, cong: number, tong: number) {
      const a = actors.get("k-" + key);
      if (!a || a.khachDi) return;
      if (cong > 0) nhayDiem(a, `+${cong} công đức`);
      a.name = `${(a as any).tenGoc ?? a.ten ?? ""} · ${tong} công đức`;
      setTag(a, true);
    },
    /** Lên vái Tổ xin điểm cao: đi lên trước bàn thờ, vái ba vái; Tổ sáng hào quang ban phúc (gọi banPhuc), rồi về chỗ. */
    vaiXin(banPhuc?: () => void, xong?: () => void): boolean {
      const me = [...actors.values()].find((x) => x.me);
      if (!me || meOverride || me.phat || me.bow > 0) return false;
      meOverride = true;
      cine = true;
      me.dao = true;
      me.sitting = false;
      me.body.rotation.x = 0;
      const p = { x: me.root.position.x, z: me.root.position.z };
      me.path = route(p, { x: 0, z: -6.9 });
      meArrive = () => {
        me.bow = 0.001;
        toSang = 4.5;
        banPhuc?.();
        meAfterBow = () => {
          meOverride = false;
          me.dao = false;
          me.destKey = "";
          setPeople(lastPeople, maxLvl, showAll ? "all" : "me");
          xong?.();
        };
      };
      return true;
    },
    setOnVieng(fn: ((key: string) => void) | null) {
      viengCb = fn;
    },
    /** Đếm khách đang trong chùa */
    soKhach(): number {
      return [...actors.values()].filter((y) => y.khach && !y.khachDi).length;
    },
    /** Cả chùa reo hò (khi có nhiều tim) */
    reo() {
      reoT = 2;
    },
    setTuQuay(on: boolean) {
      tuQuay = on;
      tourT = 0;
      if (!on) {
        viewTong = false;
        viewSan = false;
        viewAn = false;
      }
    },
    setOnNoi(fn: ((text: string, vai: string) => void) | null) {
      noiCb = fn;
    },
    setPaused(v: boolean) {
      paused = v;
    },
    setOnTap(fn: ((t: Tap) => void) | null) {
      onTap = fn;
    },
    /** Nhân vật ảo dừng lại, quay sang người hỏi và nói một câu. */
    npcNoi(key: string, text: string) {
      const a = actors.get(key);
      if (!a) return;
      let me: Actor | undefined;
      for (const x of actors.values()) if (x.me) me = x;
      if (!a.onDen) {
        // đang bận việc (chú tiểu bưng món) thì chỉ nói, không dừng lại
        a.faceTo = me ? { x: me.root.position.x, z: me.root.position.z } : { x: camera.position.x, z: camera.position.z };
        a.pause = Math.min(10, 4 + text.length * 0.07);
        a.path = [];
      }
      if (!a.tag) {
        a.name = a.ten ?? "";
        setTag(a, true);
      }
      showBubble(a, text);
      if (me && me.dao) me.faceTo = { x: a.root.position.x, z: a.root.position.z };
    },
    /** Nhân vật ảo gần chỗ mình nhất (trong bán kính r). */
    npcGan(r = 3): { key: string; ten: string; vai: string; nu: boolean } | null {
      let me: Actor | undefined;
      for (const x of actors.values()) if (x.me) me = x;
      if (!me) return null;
      let best: Actor | null = null;
      let bd = r;
      for (const a of actors.values()) {
        if (!a.npc) continue;
        const d = Math.hypot(a.root.position.x - me.root.position.x, a.root.position.z - me.root.position.z);
        if (d < bd) {
          bd = d;
          best = a;
        }
      }
      return best ? { key: best.key, ten: best.ten ?? "", vai: best.kind ?? "su", nu: Boolean(best.nuNpc) } : null;
    },
    setView(v: "toan" | "to" | "cao" | "theo") {
      const base = Math.round((goalYaw + yaw) / TWO_PI) * TWO_PI - yaw;
      viewTheo = v === "theo";
      velYaw = 0;
      lastTouch = performance.now();
      if (v === "toan" && viewAn) {
        goalTarget.set(AN_TAM.x - 0.5, 0.8, AN_TAM.z - 0.3);
        goalYaw = base - Math.PI / 2;
        goalPitch = 0.6;
        goalRadius = mobile ? 13 : 12;
      } else if (v === "toan" && viewSan) {
        goalTarget.set(1.5, 0.8, 24.5);
        goalYaw = base;
        goalPitch = 0.55;
        goalRadius = mobile ? 17 : 15;
      } else if (v === "toan") {
        goalTarget.set(0, 0.6, -1.5);
        goalYaw = base;
        goalPitch = 0.5;
        goalRadius = mobile ? 18 : 16.5;
      } else if (v === "to") {
        goalTarget.set(0, 2.4, -10.6);
        goalYaw = base;
        goalPitch = 0.22;
        goalRadius = 7.5;
      } else if (v === "cao") {
        goalTarget.set(0, 0, -1.2);
        goalPitch = 1.38;
        goalRadius = 22;
      } else {
        goalYaw = base;
        goalPitch = 0.42;
        goalRadius = 5;
      }
    },
    setLift(v: number) {
      lift = Math.max(0, Math.min(0.35, v));
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
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
