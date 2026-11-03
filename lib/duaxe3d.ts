/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Đua xe 3D vòng quanh chùa (three.js dựng bằng khối cơ bản).
 * Xe chạy trên đường vòng khép kín, nhân vật ngồi trên xe, có bình năng lượng
 * để ăn, sao tốc độ, chum nước chắn đường. Đối thủ: Ông Tổ (luôn về trước),
 * Chú tiểu (thắng được) hoặc chạy một mình tính giờ.
 */

export type DoiDua = "to" | "tieu" | "mot";
export type DuaHud = {
  vong: number;
  tongVong: number;
  hang: number;
  soXe: number;
  nangLuong: number;
  tocDo: number;
  thoiGian: number;
  dem: number | null;
  tang: boolean;
};
export type DuaKetQua = { thang: boolean; hang: number; thoiGian: number; vongNhanh: number };
export type DuaSuKien = "an" | "sao" | "va" | "phep" | "vong" | "toVe" | "vuot" | "xuatPhat" | "dem";

const TONG_VONG = 3;
const RONG = 8; // bề rộng mặt đường
const LE = 3.5; // xe chạy trên đường trong khoảng ±LE
const MEP = 4.7; // ra tới mép cỏ thì dừng

export function createDuaXe3D(
  THREE: any,
  host: HTMLElement,
  opts: {
    doi: DoiDua;
    gioi: "nam" | "nu";
    ten: string;
    /** Bậc tu hành 1..6: xe nhanh hơn, nhiều năng lượng hơn, màu xịn hơn */
    bac?: number;
    onHud: (h: DuaHud) => void;
    onXong: (kq: DuaKetQua) => void;
    onSuKien?: (e: DuaSuKien, so?: number) => void;
  }
) {
  const mobile =
    window.matchMedia("(pointer: coarse)").matches || Math.min(window.screen.width, window.screen.height) < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(mobile ? 1.25 : 2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "dua3d-canvas";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const TROI = 0xbcd9ec;
  scene.background = new THREE.Color(TROI);
  scene.fog = new THREE.Fog(TROI, 40, 110);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 220);

  scene.add(new THREE.HemisphereLight(0xfff4dc, 0x5a6b3a, 1.7));
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.4);
  sun.position.set(30, 50, 20);
  scene.add(sun);

  const matCache = new Map<string, any>();
  function mat(color: number, o: Record<string, unknown> = {}) {
    const k = color + JSON.stringify(o);
    let m = matCache.get(k);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color, ...o });
      matCache.set(k, m);
    }
    return m;
  }
  function chuTexture(text: string, w: number, h: number, nen: string, mau: string, co = 0.55) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    g.fillStyle = nen;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = mau;
    g.lineWidth = Math.max(4, h * 0.06);
    g.strokeRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2);
    g.fillStyle = mau;
    g.font = `800 ${Math.round(h * co)}px 'Be Vietnam Pro', system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + h * 0.04);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function nhanTen(text: string, mau = "#ffe9a8") {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(40,20,12,0.78)";
    g.beginPath();
    if (typeof g.roundRect === "function") g.roundRect(4, 6, 248, 52, 26);
    else g.rect(4, 6, 248, 52);
    g.fill();
    g.fillStyle = mau;
    g.font = "800 30px 'Be Vietnam Pro', system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 128, 34);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    s.scale.set(2.6, 0.65, 1);
    s.renderOrder = 5;
    return s;
  }

  /* ---------------- Đường đua ---------------- */
  const diem = [
    [0, -27], [16, -26], [28, -19], [33, -6], [31, 8], [24, 18], [12, 22], [2, 28],
    [-10, 30], [-22, 25], [-31, 14], [-34, 0], [-30, -14], [-18, -24],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(diem, true, "centripetal");
  const SO = 720;
  const P = curve.getSpacedPoints(SO); // SO+1 điểm, điểm cuối trùng điểm đầu
  const L = curve.getLength();
  const T: any[] = [];
  const R: any[] = [];
  for (let i = 0; i < SO; i++) {
    const a = P[i];
    const b = P[(i + 1) % SO];
    const t = new THREE.Vector3().subVectors(b, a).normalize();
    T.push(t);
    R.push(new THREE.Vector3(-t.z, 0, t.x));
  }
  const _p = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _r = new THREE.Vector3();
  /** Vị trí theo quãng đường đã chạy và độ lệch ngang (dương là bên phải). */
  function viTri(dist: number, lat: number, out = _p) {
    const u = ((((dist % L) + L) % L) / L) * SO;
    const i = Math.floor(u) % SO;
    const f = u - Math.floor(u);
    const j = (i + 1) % SO;
    out.lerpVectors(P[i], P[j], f);
    _t.lerpVectors(T[i], T[j], f).normalize();
    _r.set(-_t.z, 0, _t.x);
    out.addScaledVector(_r, lat);
    return out;
  }

  // mặt đất cỏ
  const dat = new THREE.Mesh(new THREE.CircleGeometry(160, 48), mat(0x6f9446));
  dat.rotation.x = -Math.PI / 2;
  dat.position.y = -0.02;
  scene.add(dat);

  function dai(w0: number, w1: number, y: number, mauFn: (i: number) => number) {
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i <= SO; i++) {
      const k = i % SO;
      const p = P[k];
      const r = R[k];
      pos.push(p.x + r.x * w0, y, p.z + r.z * w0, p.x + r.x * w1, y, p.z + r.z * w1);
      c.setHex(mauFn(i));
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (i < SO) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    scene.add(m);
    return m;
  }
  // lề đá ong hai bên, mặt đường lát gạch, vạch giữa đứt quãng, bó vỉa đỏ trắng
  dai(-RONG / 2 - 1.6, RONG / 2 + 1.6, 0.0, () => 0xb59a6e);
  dai(-RONG / 2, RONG / 2, 0.02, (i) => (Math.floor(i / 6) % 2 ? 0x8d8273 : 0x968b7b));
  dai(-0.12, 0.12, 0.035, (i) => (Math.floor(i / 8) % 2 ? 0x968b7b : 0xf3ead6));
  dai(-RONG / 2 - 0.5, -RONG / 2, 0.04, (i) => (Math.floor(i / 5) % 2 ? 0xd2402a : 0xf3ead6));
  dai(RONG / 2, RONG / 2 + 0.5, 0.04, (i) => (Math.floor(i / 5) % 2 ? 0xd2402a : 0xf3ead6));

  // vạch xuất phát ca rô
  {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 32;
    const g = c.getContext("2d")!;
    for (let x = 0; x < 16; x++)
      for (let y = 0; y < 2; y++) {
        g.fillStyle = (x + y) % 2 ? "#1d1d1d" : "#f6f1e6";
        g.fillRect(x * 16, y * 16, 16, 16);
      }
    const tex = new THREE.CanvasTexture(c);
    const vach = new THREE.Mesh(new THREE.PlaneGeometry(RONG, 1), new THREE.MeshBasicMaterial({ map: tex }));
    vach.rotation.x = -Math.PI / 2;
    const p = viTri(0, 0, new THREE.Vector3());
    vach.position.set(p.x, 0.05, p.z);
    // mặt phẳng nằm ngang, cạnh dài theo phương ngang đường
    vach.rotation.set(-Math.PI / 2, 0, -Math.atan2(R[0].z, R[0].x));
    scene.add(vach);
  }

  /* ---------------- Ngôi chùa ở giữa ---------------- */
  const chua = new THREE.Group();
  scene.add(chua);
  {
    const nen = new THREE.Mesh(new THREE.BoxGeometry(26, 0.8, 20), mat(0xc9b28a));
    nen.position.y = 0.4;
    chua.add(nen);
    const bac = new THREE.Mesh(new THREE.BoxGeometry(20, 0.6, 14), mat(0xb39a72));
    bac.position.y = 1.1;
    chua.add(bac);
    const tuong = new THREE.Mesh(new THREE.BoxGeometry(16, 4.4, 9), mat(0xe9d7b4));
    tuong.position.y = 3.6;
    chua.add(tuong);
    const cua = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.2), mat(0x7a2a1a));
    cua.position.set(0, 2.9, 4.55);
    chua.add(cua);
    for (const s of [-1, 1]) {
      const cs = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 0.2), mat(0x7a2a1a));
      cs.position.set(s * 4.8, 3.4, 4.55);
      chua.add(cs);
    }
    const cot = new THREE.CylinderGeometry(0.32, 0.36, 4.6, 10);
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(cot, mat(0xa8321f));
      c.position.set(-7.2 + i * 2.88, 3.7, 5.6);
      chua.add(c);
    }
    function mai(w: number, d: number, h: number, y: number) {
      const g = new THREE.ConeGeometry(1, 1, 4, 1, false, Math.PI / 4);
      const m = new THREE.Mesh(g, mat(0x6b3326));
      m.scale.set(w * 0.72, h, d * 0.72);
      m.position.y = y;
      chua.add(m);
      // đầu đao cong vàng ở bốn góc
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          const dao = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.6, 6), mat(0xe2b957));
          dao.position.set((sx * w) / 2, y - h / 2 + 0.35, (sz * d) / 2);
          dao.rotation.z = -sx * 0.8;
          dao.rotation.x = sz * 0.8;
          chua.add(dao);
        }
      return m;
    }
    mai(21, 13, 2.6, 7.0);
    const lau = new THREE.Mesh(new THREE.BoxGeometry(9, 2, 5.5), mat(0xb8402a));
    lau.position.y = 8.9;
    chua.add(lau);
    mai(13, 8, 2.2, 10.9);
    const ngoc = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), mat(0xf0cb6e, { emissive: 0x6a4a10 }));
    ngoc.position.y = 12.4;
    chua.add(ngoc);
    const bien = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 1.3),
      new THREE.MeshBasicMaterial({ map: chuTexture("CHÙA HÓA HỌC", 512, 112, "#8f2a1a", "#f0cb6e", 0.5) })
    );
    bien.position.set(0, 5.4, 6.0);
    chua.add(bien);
    // lư hương trước sân
    const lu = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 1.2, 12), mat(0x8a6a2a));
    lu.position.set(0, 1.4, 8.6);
    chua.add(lu);
    // gác chuông bên cạnh
    const gac = new THREE.Group();
    gac.position.set(-10.5, 0.8, 6.5);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.2, 8), mat(0xa8321f));
        c.position.set(sx * 1, 1.6, sz * 1);
        gac.add(c);
      }
    const mg = new THREE.Mesh(new THREE.ConeGeometry(2, 1.4, 4, 1, false, Math.PI / 4), mat(0x6b3326));
    mg.position.y = 3.8;
    gac.add(mg);
    const chuong = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.9, 12), mat(0xc79a3a));
    chuong.position.y = 2.4;
    gac.add(chuong);
    chua.add(gac);
    // hồ sen
    const ho = new THREE.Mesh(new THREE.CircleGeometry(3.2, 28), mat(0x4f8fa8));
    ho.rotation.x = -Math.PI / 2;
    ho.position.set(11, 0.82, 6.6);
    chua.add(ho);
    for (let i = 0; i < 7; i++) {
      const la = new THREE.Mesh(new THREE.CircleGeometry(0.42, 10), mat(0x4f8a3a));
      la.rotation.x = -Math.PI / 2;
      const a = i * 0.9;
      la.position.set(11 + Math.cos(a) * 1.9, 0.86, 6.6 + Math.sin(a) * 1.6);
      chua.add(la);
      if (i % 2 === 0) {
        const hoa = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat(0xf2a7b8));
        hoa.position.set(la.position.x, 1.0, la.position.z);
        chua.add(hoa);
      }
    }
    chua.rotation.y = 0.12;
    chua.scale.setScalar(1.3);
  }

  /* ---------------- Cổng tam quan ngay vạch xuất phát ---------------- */
  {
    const g = new THREE.Group();
    const p0 = viTri(0, 0, new THREE.Vector3());
    g.position.copy(p0);
    g.rotation.y = Math.atan2(R[0].x, R[0].z) - Math.PI / 2;
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 6.4, 0.9), mat(0xa8321f));
      c.position.set(s * (RONG / 2 + 1.4), 3.2, 0);
      g.add(c);
      const dau = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1, 4, 1, false, Math.PI / 4), mat(0x6b3326));
      dau.position.set(s * (RONG / 2 + 1.4), 6.9, 0);
      g.add(dau);
    }
    const xa = new THREE.Mesh(new THREE.BoxGeometry(RONG + 4.6, 0.7, 1), mat(0x6b3326));
    xa.position.y = 6.2;
    g.add(xa);
    const bien = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 1.1),
      new THREE.MeshBasicMaterial({ map: chuTexture("VẠCH ĐÍCH", 512, 96, "#8f2a1a", "#f0cb6e", 0.56), side: THREE.DoubleSide })
    );
    bien.position.set(0, 5.2, 0);
    g.add(bien);
    scene.add(g);
  }

  /* ---------------- Cây, đèn lồng, cờ ngũ sắc, đồi xa ---------------- */
  const thanCay = new THREE.CylinderGeometry(0.22, 0.3, 1.6, 6);
  const tanCay = new THREE.ConeGeometry(1.5, 3.2, 7);
  const tanTron = new THREE.IcosahedronGeometry(1.6, 0);
  function cay(x: number, z: number, s = 1, tron = false) {
    const t = new THREE.Mesh(thanCay, mat(0x6b4a2e));
    t.position.set(x, 0.8 * s, z);
    t.scale.setScalar(s);
    scene.add(t);
    const l = new THREE.Mesh(tron ? tanTron : tanCay, mat(tron ? 0x4f7f34 : 0x3e6d34));
    l.position.set(x, (tron ? 2.6 : 3) * s, z);
    l.scale.setScalar(s);
    scene.add(l);
  }
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < SO; i += 22) {
    for (const s of [-1, 1]) {
      const off = s * (RONG / 2 + 5 + rnd() * 7);
      if (s > 0 && i % 66) continue; // phía trong ít cây để thấy chùa
      const p = viTri((i / SO) * L, off, new THREE.Vector3());
      if (Math.hypot(p.x, p.z) < 19) continue;
      cay(p.x, p.z, 0.8 + rnd() * 0.7, rnd() < 0.4);
    }
  }
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r = 58 + rnd() * 30;
    const doi = new THREE.Mesh(new THREE.ConeGeometry(10 + rnd() * 10, 8 + rnd() * 10, 6), mat(0x7ea07a));
    doi.position.set(Math.cos(a) * r, 2, Math.sin(a) * r);
    scene.add(doi);
  }
  const cotDen = new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6);
  const quaDen = new THREE.SphereGeometry(0.36, 10, 8);
  const matDen = new THREE.MeshLambertMaterial({ color: 0xd2402a, emissive: 0x7a1a0a });
  for (let i = 0; i < SO; i += 18) {
    for (const s of [-1, 1]) {
      const p = viTri((i / SO) * L, s * (RONG / 2 + 2.1), new THREE.Vector3());
      const c = new THREE.Mesh(cotDen, mat(0x3a2418));
      c.position.set(p.x, 1.2, p.z);
      scene.add(c);
      const d = new THREE.Mesh(quaDen, matDen);
      d.position.set(p.x, 2.5, p.z);
      d.scale.y = 1.25;
      scene.add(d);
    }
  }
  // dây cờ ngũ sắc giăng ngang đường vài chỗ
  const MAU_CO = [0x2f6db5, 0xf2c230, 0xd2402a, 0xf6f1e6, 0xe8812a];
  const tamGiac = new THREE.BufferGeometry();
  tamGiac.setAttribute("position", new THREE.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.5, 0], 3));
  tamGiac.computeVertexNormals();
  for (const k of [0.18, 0.42, 0.66, 0.86]) {
    const d0 = k * L;
    const a = viTri(d0, -(RONG / 2 + 2.1), new THREE.Vector3());
    const b = viTri(d0, RONG / 2 + 2.1, new THREE.Vector3());
    for (let i = 0; i <= 14; i++) {
      const f = i / 14;
      const co = new THREE.Mesh(tamGiac, new THREE.MeshLambertMaterial({ color: MAU_CO[i % 5], side: THREE.DoubleSide }));
      co.position.set(a.x + (b.x - a.x) * f, 4.2 - Math.sin(f * Math.PI) * 0.6, a.z + (b.z - a.z) * f);
      co.lookAt(co.position.x + T[Math.floor(k * SO)].x, co.position.y, co.position.z + T[Math.floor(k * SO)].z);
      scene.add(co);
    }
  }

  /* ---------------- Khán giả ven đường ---------------- */
  const AO = [0xb8b1a3, 0x7f98ab, 0xc9772a, 0x7a5a3e, 0xd98a2b, 0x8a9fae, 0xb0442e, 0x5f8a6a];
  const khanGia: { m: any; y0: number; pha: number; dist: number }[] = [];
  const thanKG = new THREE.CylinderGeometry(0.28, 0.4, 0.9, 8);
  const dauKG = new THREE.SphereGeometry(0.27, 10, 8);
  for (const k of [0.05, 0.22, 0.38, 0.55, 0.72, 0.9]) {
    for (let j = 0; j < 6; j++) {
      const dist = k * L + (j - 2.5) * 1.1;
      const side = k > 0.5 ? -1 : 1;
      const p = viTri(dist, side * (RONG / 2 + 3.2 + (j % 2) * 0.9), new THREE.Vector3());
      const g = new THREE.Group();
      const th = new THREE.Mesh(thanKG, mat(AO[(j + Math.round(k * 10)) % AO.length]));
      th.position.y = 0.45;
      g.add(th);
      const d = new THREE.Mesh(dauKG, mat(0xf0c39a));
      d.position.y = 1.13;
      g.add(d);
      const toc = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x2b1d16));
      toc.position.y = 1.16;
      if (j % 3) g.add(toc);
      for (const s of [-1, 1]) {
        const tay = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), mat(0xf0c39a));
        tay.position.set(s * 0.32, 1.0, 0.15);
        g.add(tay);
      }
      g.position.copy(p);
      const q = viTri(dist, 0, new THREE.Vector3());
      g.lookAt(q.x, 0, q.z);
      scene.add(g);
      khanGia.push({ m: g, y0: 0, pha: j * 1.3 + k * 9, dist });
    }
  }

  /* ---------------- Xe ---------------- */
  const banhGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 14);
  banhGeo.rotateZ(Math.PI / 2);
  type Xe = { g: any; banh: any[]; lua: any; nguoi: any; nghieng: number };
  function lamXe(mau: number, kieu: "con-nam" | "con-nu" | "to" | "tieu", ten?: string): Xe {
    const g = new THREE.Group();
    const than = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 2.7), mat(mau));
    than.position.y = 0.5;
    g.add(than);
    const mui = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.32, 0.9), mat(mau));
    mui.position.set(0, 0.48, 1.65);
    g.add(mui);
    const can = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.4), mat(0x2a211c));
    can.position.set(0, 0.42, 2.05);
    g.add(can);
    const ghe = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.18), mat(0x2a211c));
    ghe.position.set(0, 0.95, -0.6);
    g.add(ghe);
    const duoi = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.45), mat(0xe2b957));
    duoi.position.set(0, 1.25, -1.25);
    g.add(duoi);
    for (const s of [-1, 1]) {
      const tru = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), mat(0x2a211c));
      tru.position.set(s * 0.6, 1.0, -1.25);
      g.add(tru);
    }
    const vo = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 14), mat(0x2a211c));
    vo.position.set(0, 1.0, 0.45);
    vo.rotation.x = -0.9;
    g.add(vo);
    const banh: any[] = [];
    for (const [x, z] of [[-0.95, 0.95], [0.95, 0.95], [-0.95, -0.95], [0.95, -0.95]]) {
      const b = new THREE.Mesh(banhGeo, mat(0x1d1a17));
      b.position.set(x, 0.42, z);
      g.add(b);
      banh.push(b);
    }
    const lua = new THREE.Mesh(
      new THREE.ConeGeometry(0.26, 1.2, 10),
      new THREE.MeshBasicMaterial({ color: 0xffa640, transparent: true, opacity: 0.85 })
    );
    lua.rotation.x = -Math.PI / 2;
    lua.position.set(0, 0.55, -1.75);
    lua.visible = false;
    g.add(lua);

    // người ngồi trên xe
    const ng = new THREE.Group();
    ng.position.set(0, 0.7, -0.25);
    const aoMau = kieu === "to" ? 0xe9e2cf : kieu === "tieu" ? 0xd98a2b : kieu === "con-nu" ? 0xb23a48 : 0x3f6f9f;
    const ao = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.75, 10), mat(aoMau));
    ao.position.y = 0.38;
    ng.add(ao);
    const dau = new THREE.Mesh(new THREE.SphereGeometry(0.33, 14, 10), mat(0xf0c39a));
    dau.position.y = 1.0;
    ng.add(dau);
    for (const s of [-1, 1]) {
      const mat2 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), mat(0x24160f));
      mat2.position.set(s * 0.11, 1.03, 0.3);
      ng.add(mat2);
      const tay = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), mat(0xf0c39a));
      tay.position.set(s * 0.26, 0.55, 0.62);
      ng.add(tay);
    }
    if (kieu === "con-nu") {
      const toc = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(0x2b1d16));
      toc.position.y = 1.03;
      toc.rotation.x = -0.35;
      ng.add(toc);
      const bui = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat(0x2b1d16));
      bui.position.set(0, 1.3, -0.24);
      ng.add(bui);
    } else if (kieu === "con-nam") {
      const toc = new THREE.Mesh(new THREE.SphereGeometry(0.345, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), mat(0x2b1d16));
      toc.position.y = 1.02;
      ng.add(toc);
    } else if (kieu === "to") {
      const rau = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 8), mat(0xf6f1e6));
      rau.position.set(0, 0.68, 0.24);
      rau.rotation.x = Math.PI;
      ng.add(rau);
      const mu = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.3, 10), mat(0x8f2a1a));
      mu.position.y = 1.32;
      ng.add(mu);
      const hao = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.05, 6, 24),
        new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.8 })
      );
      hao.position.set(0, 1.05, -0.12);
      ng.add(hao);
    } else {
      const chom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), mat(0x2b1d16));
      chom.position.set(0, 1.3, 0.12);
      ng.add(chom);
    }
    g.add(ng);
    if (ten) {
      const nt = nhanTen(ten, kieu === "to" ? "#ffe066" : "#ffd3a1");
      nt.position.y = 2.9;
      g.add(nt);
    }
    scene.add(g);
    return { g, banh, lua, nguoi: ng, nghieng: 0 };
  }

  /* ---------------- Vật phẩm, chướng ngại ---------------- */
  type Vat = { loai: "binh" | "sao"; dist: number; lat: number; m: any; an: number };
  const vat: Vat[] = [];
  const binhGeo = new THREE.ConeGeometry(0.5, 0.8, 14);
  const coBinhGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.45, 10);
  const matNuoc = new THREE.MeshLambertMaterial({ color: 0x55e08a, emissive: 0x1f8a46, transparent: true, opacity: 0.92 });
  const matThuy = new THREE.MeshLambertMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.55 });
  const saoGeo = new THREE.OctahedronGeometry(0.6, 0);
  const matSao = new THREE.MeshLambertMaterial({ color: 0xffd34a, emissive: 0xa86a00 });
  const vongSang = new THREE.RingGeometry(0.7, 0.9, 20);
  const LAN = [-2.4, 0, 2.4];
  for (let k = 0, d = 22; d < L - 8; k++, d += 17) {
    const loai = k % 4 === 3 ? "sao" : "binh";
    const g = new THREE.Group();
    if (loai === "binh") {
      const b = new THREE.Mesh(binhGeo, matNuoc);
      b.position.y = 0.4;
      g.add(b);
      const c = new THREE.Mesh(coBinhGeo, matThuy);
      c.position.y = 0.98;
      g.add(c);
    } else {
      g.add(new THREE.Mesh(saoGeo, matSao));
    }
    const vs = new THREE.Mesh(vongSang, new THREE.MeshBasicMaterial({ color: loai === "sao" ? 0xffe066 : 0x9dffc0, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    vs.rotation.x = -Math.PI / 2;
    vs.position.y = -0.85;
    g.add(vs);
    const lat = LAN[(k * 2 + (k % 3)) % 3];
    viTri(d, lat, g.position);
    g.position.y = 0.9;
    scene.add(g);
    vat.push({ loai, dist: d, lat, m: g, an: 0 });
  }
  type Chum = { dist: number; lat: number; m: any };
  const chum: Chum[] = [];
  const chumGeo = new THREE.SphereGeometry(0.7, 12, 10);
  for (let k = 0, d = 40; d < L - 20; k++, d += 31) {
    const lat = k % 2 ? 2.5 : -2.5;
    // tránh trùng chỗ vật phẩm
    if (vat.some((v) => Math.abs(v.dist - d) < 4 && Math.abs(v.lat - lat) < 1.5)) continue;
    const m = new THREE.Mesh(chumGeo, mat(0x8a4f2a));
    m.scale.set(1, 1.15, 1);
    viTri(d, lat, m.position);
    m.position.y = 0.75;
    scene.add(m);
    const mieng = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.2, 12), mat(0x6e3a1e));
    mieng.position.set(m.position.x, 1.55, m.position.z);
    scene.add(mieng);
    chum.push({ dist: d, lat, m });
  }

  /* ---------------- Người đua ---------------- */
  type Tay = { dist: number; lat: number; v: number; xe: Xe; xong: number | null };
  const toi: Tay = {
    dist: 0,
    lat: opts.doi === "mot" ? 0 : -1.8,
    v: 0,
    xe: lamXe([0x2f6db5, 0xd2402a, 0xc9ced6, 0x8a4fd2, 0xf0c040, 0x2fc4b0][Math.min(5, Math.max(0, (opts.bac ?? 1) - 1))], opts.gioi === "nu" ? "con-nu" : "con-nam"),
    xong: null,
  };
  const doiThu: Tay | null =
    opts.doi === "mot"
      ? null
      : {
          dist: opts.doi === "to" ? 1.2 : 0,
          lat: 1.8,
          v: 0,
          xe: opts.doi === "to" ? lamXe(0xe2b957, "to", "Ông Tổ") : lamXe(0xe8812a, "tieu", "Chú tiểu"),
          xong: null,
        };

  /* ---------------- Trạng thái ---------------- */
  const phim = { trai: false, phai: false, tang: false };
  const BAC_XE = Math.min(6, Math.max(1, opts.bac ?? 1)) - 1;
  let nangLuong = 35 + BAC_XE * 10;
  let turbo = 0;
  let va = 0;
  let rung = 0;
  let dem = -1; // > 0 đang đếm ngược
  let chay = false;
  let thoiGian = 0;
  let batDauVong = 0;
  let vongNhanh = Infinity;
  let vongTruoc = 0;
  let hudT = 0;
  let phepT = 0;
  let dangSau = false;
  let demTruoc = 4;
  let ketThuc = false;
  let reoT = 0;
  let gioiThieu = true; // trước khi xuất phát: máy quay bay vòng quanh chùa
  let tGT = 0;
  const VMAX = 17 + BAC_XE * 0.5;
  const VTANG = 27 + BAC_XE * 1;
  const VTURBO = 30;

  const camPos = new THREE.Vector3();
  const camNhin = new THREE.Vector3();
  function datXe(t: Tay, steer: number, dt: number) {
    const p = viTri(t.dist, t.lat, t.xe.g.position);
    p.y = 0;
    const tt = _t.clone();
    t.xe.nghieng += (steer - t.xe.nghieng) * Math.min(1, dt * 8);
    t.xe.g.lookAt(p.x + tt.x + _r.x * steer * 0.35, 0, p.z + tt.z + _r.z * steer * 0.35);
    t.xe.g.rotateZ(t.xe.nghieng * 0.08);
    for (const b of t.xe.banh) b.rotation.x += (t.v * dt) / 0.42;
    t.xe.nguoi.rotation.z = -t.xe.nghieng * 0.18;
    t.xe.nguoi.position.y = 0.7 + Math.sin(thoiGian * 18) * 0.015 * (t.v / VMAX);
  }

  function hud() {
    const vong = Math.min(TONG_VONG, Math.floor(Math.max(0, toi.dist) / L) + 1);
    const hang = doiThu ? (doiThu.dist > toi.dist ? 2 : 1) : 1;
    opts.onHud({
      vong,
      tongVong: TONG_VONG,
      hang,
      soXe: doiThu ? 2 : 1,
      nangLuong: Math.round(nangLuong),
      tocDo: Math.round(toi.v * 4.2),
      thoiGian,
      dem: dem > 0 ? Math.ceil(dem) : null,
      tang: turbo > 0 || (phim.tang && nangLuong > 0),
    });
  }

  function capNhat(dt: number) {
    if (dem > 0) {
      dem -= dt;
      const n = Math.ceil(dem);
      if (n !== demTruoc && n > 0) {
        demTruoc = n;
        opts.onSuKien?.("dem", n);
      }
      if (dem <= 0) {
        chay = true;
        opts.onSuKien?.("xuatPhat");
      }
    }
    const tongL = TONG_VONG * L;
    if (chay) {
      thoiGian += dt;
      // ---- xe của con ----
      const steer = (phim.phai ? 1 : 0) - (phim.trai ? 1 : 0);
      if (toi.xong === null) {
        toi.lat += steer * dt * (4 + 5 * Math.min(1, toi.v / VMAX));
        toi.lat = Math.max(-MEP, Math.min(MEP, toi.lat));
      }
      const tang = toi.xong === null && phim.tang && nangLuong > 0;
      if (tang) nangLuong = Math.max(0, nangLuong - 32 * dt);
      if (turbo > 0) turbo -= dt;
      if (va > 0) va -= dt;
      let muc = turbo > 0 ? VTURBO : tang ? VTANG : VMAX;
      if (Math.abs(toi.lat) > LE + 0.3) muc = Math.min(muc, 9);
      if (va > 0) muc = Math.min(muc, 6);
      if (toi.xong !== null) muc = 4;
      toi.v += (muc - toi.v) * Math.min(1, dt * (muc > toi.v ? 1.3 : 3));
      toi.dist += toi.v * dt;
      toi.xe.lua.visible = tang || turbo > 0;
      toi.xe.lua.scale.set(1, 0.7 + Math.random() * 0.6, 1);

      // ăn vật phẩm, va chum
      const d0 = ((toi.dist % L) + L) % L;
      for (const v of vat) {
        if (v.an > 0) continue;
        let dd = Math.abs(v.dist - d0);
        dd = Math.min(dd, L - dd);
        if (dd < 1.5 && Math.abs(v.lat - toi.lat) < 1.35) {
          v.an = 7;
          v.m.visible = false;
          if (v.loai === "binh") {
            nangLuong = Math.min(100, nangLuong + 34);
            opts.onSuKien?.("an");
          } else {
            turbo = 2.2;
            opts.onSuKien?.("sao");
          }
        }
      }
      if (va <= 0)
        for (const c of chum) {
          let dd = Math.abs(c.dist - d0);
          dd = Math.min(dd, L - dd);
          if (dd < 1.4 && Math.abs(c.lat - toi.lat) < 1.4) {
            va = 0.9;
            rung = 0.5;
            toi.v *= 0.35;
            turbo = 0;
            opts.onSuKien?.("va");
          }
        }

      // ---- đối thủ ----
      if (doiThu) {
        if (opts.doi === "to") {
          // Ông Tổ luôn giữ khoảng cách phía trước, con tăng tốc thì Tổ dùng phép
          const gan = toi.dist + 6;
          let muc2 = 17.6;
          if (doiThu.dist < gan) muc2 = toi.v + 5 + (gan - doiThu.dist) * 2;
          else if (doiThu.dist > toi.dist + 24) muc2 = 13;
          if (doiThu.xong !== null) muc2 = 6;
          doiThu.v += (muc2 - doiThu.v) * Math.min(1, dt * 3);
          doiThu.dist += doiThu.v * dt;
          if (doiThu.xong === null && doiThu.dist < toi.dist + 1.4) {
            doiThu.dist = toi.dist + 1.4;
            if (thoiGian - phepT > 6) {
              phepT = thoiGian;
              opts.onSuKien?.("phep");
            }
          }
          doiThu.xe.lua.visible = doiThu.v > 19;
          const lan = Math.sin(thoiGian * 0.6) * 2;
          doiThu.lat += (lan - doiThu.lat) * Math.min(1, dt * 1.5);
        } else {
          // Chú tiểu chạy đều, né chum
          let muc2 = 17.4 + Math.sin(thoiGian * 0.7) * 0.8;
          if (doiThu.xong !== null) muc2 = 5;
          if (doiThu.dist < 2) muc2 = Math.min(muc2, 16);
          doiThu.v += (muc2 - doiThu.v) * Math.min(1, dt * 1.2);
          doiThu.dist += doiThu.v * dt;
          const dn = ((doiThu.dist % L) + L) % L;
          let lan = Math.sin(thoiGian * 0.45 + 1) * 1.6;
          for (const c of chum) {
            const dd = c.dist - dn;
            if (dd > 0 && dd < 10) lan = c.lat > 0 ? -1.6 : 1.6;
          }
          doiThu.lat += (lan - doiThu.lat) * Math.min(1, dt * 1.8);
          doiThu.xe.lua.visible = false;
        }
        if (doiThu.xong === null && doiThu.dist >= tongL) {
          doiThu.xong = thoiGian;
          if (toi.xong === null) opts.onSuKien?.("toVe");
        }
        const sau = doiThu.dist > toi.dist;
        if (!sau && dangSau && toi.xong === null && thoiGian > 2) opts.onSuKien?.("vuot");
        dangSau = sau;
        // hai xe sát nhau thì đẩy ra
        if (Math.abs(doiThu.dist - toi.dist) < 2.6 && Math.abs(doiThu.lat - toi.lat) < 1.7) {
          const day = doiThu.lat > toi.lat ? 1 : -1;
          toi.lat -= day * dt * 3;
          doiThu.lat += day * dt * 3;
        }
      }

      // ---- vòng, về đích ----
      const vongNay = Math.floor(toi.dist / L);
      if (vongNay > vongTruoc && toi.xong === null) {
        vongTruoc = vongNay;
        const tv = thoiGian - batDauVong;
        batDauVong = thoiGian;
        vongNhanh = Math.min(vongNhanh, tv);
        if (vongNay < TONG_VONG) opts.onSuKien?.("vong", vongNay + 1);
      }
      if (toi.xong === null && toi.dist >= tongL) {
        toi.xong = thoiGian;
        reoT = 3;
        const hang = doiThu && doiThu.xong !== null && doiThu.xong <= toi.xong ? 2 : 1;
        const kq: DuaKetQua = { thang: hang === 1, hang, thoiGian: toi.xong, vongNhanh: vongNhanh === Infinity ? toi.xong : vongNhanh };
        setTimeout(() => !ketThuc && opts.onXong(kq), 1600);
      }
    }
    for (const v of vat)
      if (v.an > 0) {
        v.an -= dt;
        if (v.an <= 0) v.m.visible = true;
      } else {
        v.m.rotation.y += dt * 2.4;
        v.m.position.y = 0.9 + Math.sin(thoiGian * 3 + v.dist) * 0.18;
      }

    datXe(toi, (phim.phai ? 1 : 0) - (phim.trai ? 1 : 0), dt);
    if (doiThu) datXe(doiThu, 0, dt);

    // khán giả nhảy lên khi xe chạy qua
    if (reoT > 0) reoT -= dt;
    const d0 = ((toi.dist % L) + L) % L;
    for (const k of khanGia) {
      let dd = Math.abs(k.dist - d0);
      dd = Math.min(dd, L - dd);
      const nhay = reoT > 0 || dd < 14 || dem > 0;
      k.m.position.y = nhay ? Math.abs(Math.sin(thoiGian * 9 + k.pha)) * 0.35 : 0;
    }

    if (gioiThieu) {
      tGT += dt;
      const a = -1.2 + tGT * 0.18;
      camera.position.set(Math.cos(a) * 46, 17 + Math.sin(tGT * 0.3) * 3, Math.sin(a) * 46);
      camera.lookAt(0, 4, 0);
      hudT -= dt;
      if (hudT <= 0) {
        hudT = 0.1;
        hud();
      }
      return;
    }
    // camera bám sau lưng
    const p = toi.xe.g.position;
    viTri(toi.dist, toi.lat, _p);
    const f = _t.clone();
    const sau = 6.2 + (toi.v / VMAX) * 0.8;
    camPos.set(p.x - f.x * sau, 2.9, p.z - f.z * sau);
    const k = 1 - Math.exp(-dt * 7);
    if (camera.position.lengthSq() === 0) camera.position.copy(camPos);
    camera.position.lerp(camPos, k);
    if (rung > 0) {
      rung -= dt;
      camera.position.x += (Math.random() - 0.5) * rung * 0.8;
      camera.position.y += (Math.random() - 0.5) * rung * 0.5;
    }
    camNhin.set(p.x + f.x * 5, 1.1, p.z + f.z * 5);
    camera.lookAt(camNhin);
    const fov = 62 + Math.max(0, toi.v - VMAX) * 0.9;
    if (Math.abs(camera.fov - fov) > 0.1) {
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 4);
      camera.updateProjectionMatrix();
    }

    hudT -= dt;
    if (hudT <= 0) {
      hudT = 0.1;
      hud();
    }
  }

  function resize() {
    const w = host.clientWidth || 300;
    const h = host.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let raf = 0;
  let last = performance.now();
  function vong(now: number) {
    raf = requestAnimationFrame(vong);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.hidden) return;
    capNhat(dt);
    renderer.render(scene, camera);
  }
  datXe(toi, 0, 0);
  if (doiThu) datXe(doiThu, 0, 0);
  raf = requestAnimationFrame(vong);
  hud();

  return {
    setPhim(p: Partial<typeof phim>) {
      Object.assign(phim, p);
    },
    batDau() {
      gioiThieu = false;
      dem = 3.2;
      demTruoc = 4;
    },
    dispose() {
      ketThuc = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o: any) => {
        o.geometry?.dispose?.();
        const m = o.material;
        if (m) for (const mm of Array.isArray(m) ? m : [m]) {
          mm.map?.dispose?.();
          mm.dispose?.();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
