/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Phòng xả stress 3D: căn phòng ấm cúng chỉ có một mình người chơi.
 * Nhân vật có khuôn mặt biểu cảm (mắt chớp, lông mày, miệng, má đỏ, nước mắt)
 * và các tư thế: gào, hét, nói nỗi niềm, đấm gối, ngồi sám hối, xem video, nhẹ lòng.
 */

export type CheDo = "binh" | "gao" | "het" | "noi" | "dam" | "samhoi" | "xem" | "nhe";

type Mat = {
  mo: number; // mắt mở 0..1
  nham: "vui" | "tinh"; // khi nhắm: cười tít (^ ^) hay nhắm yên (‿ ‿)
  may: number; // lông mày: + cau có, - buồn
  mayY: number; // lông mày nhướn lên
  ha: number; // miệng há 0..1
  rong: number; // độ rộng miệng
  cuoi: number; // + cười, - mếu
  rang: number; // thấy răng (nghiến)
  ma: number; // má hồng / mặt đỏ
};

const MAT: Record<CheDo, Mat> = {
  binh: { mo: 0.85, nham: "tinh", may: -0.35, mayY: 0, ha: 0, rong: 0.9, cuoi: -0.35, rang: 0, ma: 0.15 },
  gao: { mo: 0.3, nham: "vui", may: 0.75, mayY: 0.01, ha: 0.95, rong: 1.35, cuoi: 0, rang: 0.6, ma: 0.85 },
  het: { mo: 0.08, nham: "vui", may: 0.2, mayY: 0.035, ha: 1, rong: 0.85, cuoi: 0, rang: 0, ma: 0.6 },
  noi: { mo: 0.75, nham: "tinh", may: -0.55, mayY: 0.01, ha: 0.2, rong: 0.9, cuoi: -0.5, rang: 0, ma: 0.35 },
  dam: { mo: 0.5, nham: "vui", may: 0.7, mayY: -0.01, ha: 0.12, rong: 1.2, cuoi: -0.1, rang: 1, ma: 0.6 },
  samhoi: { mo: 0, nham: "tinh", may: -0.2, mayY: 0, ha: 0, rong: 0.8, cuoi: 0.25, rang: 0, ma: 0.2 },
  xem: { mo: 0.9, nham: "tinh", may: 0, mayY: 0.005, ha: 0, rong: 1, cuoi: 0.5, rang: 0, ma: 0.25 },
  nhe: { mo: 0, nham: "vui", may: -0.05, mayY: 0.02, ha: 0.35, rong: 1.25, cuoi: 1, rang: 0.4, ma: 0.6 },
};

/* Tư thế tay: [vai trái x, vai trái z, khuỷu trái x, vai phải x, vai phải z, khuỷu phải x] */
const TAY: Record<string, number[]> = {
  nghi: [-0.45, -0.18, -1.0, -0.45, 0.18, -1.0],
  loa: [-1.75, 0.5, -1.95, -1.75, -0.5, -1.95], // khum tay quanh miệng
  omDau: [-2.55, -0.55, -1.75, -2.55, 0.55, -1.75], // hai tay ôm đầu
  giai: [-0.45, -0.18, -1.0, -1.1, 0.35, -0.9], // một tay giải bày
  chap: [-0.95, 0.42, -1.45, -0.95, -0.42, -1.45], // chắp tay
  damTrai: [-1.45, 0.25, -0.15, -0.5, 0.2, -1.6],
  damPhai: [-0.5, -0.2, -1.6, -1.45, -0.25, -0.15],
  mung: [-2.9, -0.55, -0.2, -2.9, 0.55, -0.2], // giơ hai tay mừng
};

export function createPhong3D(THREE: any, host: HTMLElement, opts: { gioi: "nam" | "nu"; ten: string }) {
  const mobile =
    window.matchMedia("(pointer: coarse)").matches || Math.min(window.screen.width, window.screen.height) < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(mobile ? 1.5 : 2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "phong3d-canvas";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a1a12);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);

  scene.add(new THREE.HemisphereLight(0xffe9cc, 0x4a2c1c, 1.35));
  const den = new THREE.PointLight(0xffc27a, 9, 12, 1.6);
  den.position.set(0, 3.4, 1.2);
  scene.add(den);
  const denNen = new THREE.PointLight(0xff9a40, 3, 5, 2);
  denNen.position.set(-2.6, 1.0, -3.4);
  scene.add(denNen);
  const denTv = new THREE.PointLight(0x9fc8ff, 0, 5, 2);
  denTv.position.set(-3.8, 2, 0.5);
  scene.add(denTv);

  const cache = new Map<string, any>();
  const mat = (color: number, o: Record<string, unknown> = {}) => {
    const k = color + JSON.stringify(o);
    if (!cache.has(k)) cache.set(k, new THREE.MeshLambertMaterial({ color, ...o }));
    return cache.get(k);
  };
  function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /* ---------------- Căn phòng ---------------- */
  const sanTex = canvasTex(512, 512, (g) => {
    for (let r = 0; r < 8; r++) {
      g.fillStyle = r % 2 ? "#a7774a" : "#b3824f";
      g.fillRect(0, r * 64, 512, 64);
      g.strokeStyle = "rgba(60,30,10,0.45)";
      g.lineWidth = 2;
      g.strokeRect(0, r * 64, 512, 64);
      for (let x = (r % 3) * 70; x < 512; x += 210) {
        g.beginPath();
        g.moveTo(x, r * 64);
        g.lineTo(x, r * 64 + 64);
        g.stroke();
      }
    }
  });
  sanTex.wrapS = sanTex.wrapT = THREE.RepeatWrapping;
  sanTex.repeat.set(2, 2);
  const san = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshLambertMaterial({ map: sanTex }));
  san.rotation.x = -Math.PI / 2;
  scene.add(san);
  const tuongMat = mat(0xead8bb);
  const goMat = mat(0x6b4226);
  for (const [x, z, ry] of [
    [0, -5, 0],
    [-5, 0, Math.PI / 2],
    [5, 0, -Math.PI / 2],
  ] as const) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(10, 4.4), tuongMat);
    t.position.set(x, 2.2, z);
    t.rotation.y = ry;
    scene.add(t);
    const op = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.0), goMat);
    op.position.set(x * 0.998, 0.5, z * 0.998);
    op.rotation.y = ry;
    scene.add(op);
    const nep = new THREE.Mesh(new THREE.PlaneGeometry(10, 0.08), mat(0x3e2414));
    nep.position.set(x * 0.997, 1.02, z * 0.997);
    nep.rotation.y = ry;
    scene.add(nep);
  }
  const tran = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat(0x3a2418));
  tran.rotation.x = Math.PI / 2;
  tran.position.y = 4.4;
  scene.add(tran);
  for (const x of [-3, 0, 3]) {
    const xa = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 10), mat(0x4a2c18));
    xa.position.set(x, 4.25, 0);
    scene.add(xa);
  }

  // Cửa sổ có trăng và sao
  const troiTex = canvasTex(512, 384, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 384);
    gr.addColorStop(0, "#0d1a3a");
    gr.addColorStop(1, "#3a3f6e");
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 384);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(255,255,240,${0.3 + ((i * 37) % 10) / 14})`;
      g.fillRect((i * 97) % 512, (i * 53) % 300, 2, 2);
    }
    const tr = g.createRadialGradient(370, 110, 10, 370, 110, 90);
    tr.addColorStop(0, "rgba(255,248,220,1)");
    tr.addColorStop(0.35, "rgba(255,240,200,0.9)");
    tr.addColorStop(1, "rgba(255,240,200,0)");
    g.fillStyle = tr;
    g.fillRect(250, 0, 260, 240);
    g.fillStyle = "#1c2a20";
    for (let x = 0; x < 512; x += 30) {
      g.beginPath();
      g.moveTo(x, 384);
      g.lineTo(x + 15, 300 - ((x * 7) % 40));
      g.lineTo(x + 30, 384);
      g.fill();
    }
  });
  const cuaSo = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), new THREE.MeshBasicMaterial({ map: troiTex }));
  cuaSo.position.set(1.6, 2.4, -4.98);
  scene.add(cuaSo);
  for (const [w, h, x, y] of [
    [2.6, 0.1, 1.6, 3.35],
    [2.6, 0.1, 1.6, 1.45],
    [0.1, 1.9, 0.35, 2.4],
    [0.1, 1.9, 2.85, 2.4],
    [0.06, 1.8, 1.6, 2.4],
    [2.4, 0.06, 1.6, 2.4],
  ] as const) {
    const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), mat(0x4a2c18));
    k.position.set(x, y, -4.94);
    scene.add(k);
  }
  for (const sx of [-1, 1]) {
    const rem = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.3, 0.06), mat(0xb0442e));
    rem.position.set(1.6 + sx * 1.55, 2.35, -4.9);
    scene.add(rem);
  }

  // Bàn thấp, nến, lư hương, chậu cây, đèn lồng
  const ban = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.7), goMat);
  ban.position.set(-2.4, 0.45, -3.9);
  scene.add(ban);
  for (const x of [-3.05, -1.75])
    for (const z of [-4.15, -3.65]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.45, 0.07), goMat);
      c.position.set(x, 0.22, z);
      scene.add(c);
    }
  const lua: any[] = [];
  for (const [x, h] of [
    [-2.95, 0.3],
    [-2.7, 0.22],
    [-2.1, 0.26],
  ] as const) {
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 12), mat(0xf6efe0));
    n.position.set(x, 0.49 + h / 2, -3.85);
    scene.add(n);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffb24a }));
    f.scale.y = 1.8;
    f.position.set(x, 0.49 + h + 0.05, -3.85);
    scene.add(f);
    lua.push(f);
  }
  const lu = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.16, 14), mat(0x8a6a2a));
  lu.position.set(-2.4, 0.57, -3.85);
  scene.add(lu);
  const khoiTex = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, "rgba(235,230,220,0.6)");
    gr.addColorStop(1, "rgba(235,230,220,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  });
  const khoi: { s: any; life: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: khoiTex, transparent: true, depthWrite: false }));
    scene.add(s);
    khoi.push({ s, life: i / 8 });
  }
  for (const [x, z] of [
    [3.9, -3.9],
    [-4.1, 3.6],
  ] as const) {
    const chau = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.5, 14), mat(0xb0442e));
    chau.position.set(x, 0.25, z);
    scene.add(chau);
    for (let i = 0; i < 7; i++) {
      const la = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat(i % 2 ? 0x3f7a3a : 0x4f8a42));
      la.scale.set(0.6, 1.4, 0.6);
      const a = (i / 7) * Math.PI * 2;
      la.position.set(x + Math.cos(a) * 0.18, 0.85 + (i % 3) * 0.15, z + Math.sin(a) * 0.18);
      la.rotation.z = Math.cos(a) * 0.5;
      la.rotation.x = Math.sin(a) * 0.5;
      scene.add(la);
    }
  }
  const denLong = new THREE.Mesh(new THREE.SphereGeometry(0.35, 18, 14), mat(0xd2402a, { emissive: 0xa02a10, emissiveIntensity: 0.7 }));
  denLong.scale.y = 1.25;
  denLong.position.set(0, 3.6, 1.2);
  scene.add(denLong);
  const dayDen = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4), mat(0x2a1a12));
  dayDen.position.set(0, 4.15, 1.2);
  scene.add(dayDen);
  // Thảm và bồ đoàn
  const tham = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), mat(0x7a2a24));
  tham.rotation.x = -Math.PI / 2;
  tham.position.set(0, 0.01, 0.5);
  scene.add(tham);
  const vienTham = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.45, 48), mat(0xe2b957, { side: THREE.DoubleSide }));
  vienTham.rotation.x = -Math.PI / 2;
  vienTham.position.set(0, 0.015, 0.5);
  scene.add(vienTham);
  const boDoan = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.18, 28), mat(0x9a6a2a));
  boDoan.position.set(0, 0.09, 0.5);
  scene.add(boDoan);
  // Bảng chữ trên tường
  {
    const tex = canvasTex(768, 192, (g) => {
      g.fillStyle = "#6e1d12";
      g.fillRect(0, 0, 768, 192);
      g.strokeStyle = "#e2b957";
      g.lineWidth = 10;
      g.strokeRect(8, 8, 752, 176);
      g.fillStyle = "#ffe29a";
      g.font = "800 76px 'Be Vietnam Pro', system-ui, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("Buông xuống, nhẹ lòng", 384, 100);
    });
    const b = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: tex }));
    b.position.set(-1.7, 3.5, -4.97);
    scene.add(b);
  }

  // Gối ôm để đấm
  const goi = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 8, 16), mat(0xe8d6b0));
  goi.rotation.z = Math.PI / 2;
  goi.rotation.y = 1.2;
  goi.position.set(1.0, 0.24, 0.95);
  scene.add(goi);
  let goiDap = 0;

  // Tivi trên tường trái
  const vienTv = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 3.4), mat(0x2a1a12));
  vienTv.position.set(-4.93, 2.3, 0.3);
  scene.add(vienTv);
  const choTex = canvasTex(640, 360, (g) => {
    g.fillStyle = "#14100c";
    g.fillRect(0, 0, 640, 360);
    g.fillStyle = "#e2b957";
    g.font = "700 34px 'Be Vietnam Pro', system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText("Video tĩnh tâm", 320, 170);
    g.font = "500 24px 'Be Vietnam Pro', system-ui, sans-serif";
    g.fillStyle = "#c9b896";
    g.fillText("Bấm “Xem video tĩnh tâm” để phát", 320, 215);
  });
  const manHinhMat = new THREE.MeshBasicMaterial({ map: choTex });
  const manHinh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), manHinhMat);
  manHinh.position.set(-4.86, 2.3, 0.3);
  manHinh.rotation.y = Math.PI / 2;
  scene.add(manHinh);
  let videoTex: any = null;

  /* ---------------- Nhân vật ---------------- */
  const SKIN = new THREE.Color(0xf0c39a);
  const DO = new THREE.Color(0xf08a6a);
  const daMat = new THREE.MeshLambertMaterial({ color: SKIN.clone() });
  const aoMau = opts.gioi === "nu" ? 0x8a9fc0 : 0xb8b1a3;
  const aoMat = mat(aoMau);
  const tocMat = mat(0x2b1d16);
  const nv = new THREE.Group();
  nv.position.set(0, 0.18, 0.5);
  scene.add(nv);
  // chân xếp bằng
  for (const s of [-1, 1]) {
    const chan = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.42, 6, 12), aoMat);
    chan.rotation.z = Math.PI / 2;
    chan.rotation.y = s * 0.45;
    chan.position.set(s * 0.12, 0.1, 0.16);
    nv.add(chan);
    const ban2 = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), mat(0x2a211c));
    ban2.scale.set(1, 0.7, 1.4);
    ban2.position.set(-s * 0.2, 0.08, 0.32);
    nv.add(ban2);
  }
  // thân trên (xoay quanh hông để cúi, ngả)
  const tren = new THREE.Group();
  tren.position.y = 0.06;
  nv.add(tren);
  const ao = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.62, 22), aoMat);
  ao.position.y = 0.31;
  tren.add(ao);
  const co = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 20), mat(opts.gioi === "nu" ? 0xf6efe0 : 0xe0b13c));
  co.rotation.x = Math.PI / 2;
  co.position.y = 0.6;
  tren.add(co);
  if (opts.gioi !== "nu") {
    const dai = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.31, 0.12, 22, 1, true), mat(0xe0b13c, { side: THREE.DoubleSide }));
    dai.position.y = 0.28;
    dai.rotation.z = 0.2;
    tren.add(dai);
  }
  // đầu
  const dau = new THREE.Group();
  dau.position.y = 0.96;
  tren.add(dau);
  const soDau = new THREE.Mesh(new THREE.SphereGeometry(0.32, 28, 22), daMat);
  soDau.scale.set(1, 1.04, 0.96);
  dau.add(soDau);
  const mui = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), daMat);
  mui.position.set(0, -0.03, 0.31);
  dau.add(mui);
  if (opts.gioi === "nu") {
    const toc = new THREE.Mesh(new THREE.SphereGeometry(0.34, 26, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), tocMat);
    toc.rotation.x = -0.25;
    toc.position.y = 0.015;
    dau.add(toc);
    const sau = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.55, 20, 1, true, Math.PI * 0.6, Math.PI * 0.8), tocMat);
    sau.position.set(0, -0.2, -0.04);
    sau.rotation.y = Math.PI;
    dau.add(sau);
    const mai = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 8, Math.PI * 1.1, Math.PI * 0.8, 0, Math.PI * 0.32), tocMat);
    mai.rotation.x = 0.45;
    mai.position.set(0, 0.04, 0.03);
    dau.add(mai);
    const kep = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat(0xd2402a));
    kep.position.set(0.2, 0.2, 0.16);
    dau.add(kep);
  } else {
    const toc = new THREE.Mesh(new THREE.SphereGeometry(0.335, 26, 18, 0, Math.PI * 2, 0, Math.PI * 0.42), tocMat);
    toc.rotation.x = -0.18;
    dau.add(toc);
    for (const s of [-1, 1]) {
      const tai = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), daMat);
      tai.scale.set(0.6, 1, 1);
      tai.position.set(s * 0.315, 0, 0);
      dau.add(tai);
    }
  }
  // mắt
  type Mat1 = { nhom: any; tron: any; nhamVui: any; nhamTinh: any; may: any; x: number };
  const mat1: Mat1[] = [];
  for (const s of [-1, 1]) {
    const nhom = new THREE.Group();
    nhom.position.set(s * 0.115, 0.04, 0.27);
    dau.add(nhom);
    const tron = new THREE.Group();
    nhom.add(tron);
    const trang = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    trang.scale.set(1, 1.18, 0.45);
    tron.add(trang);
    const con = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), new THREE.MeshBasicMaterial({ color: 0x3a2214 }));
    con.scale.set(1, 1.1, 0.45);
    con.position.z = 0.022;
    tron.add(con);
    const sang = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    sang.position.set(0.014, 0.02, 0.045);
    tron.add(sang);
    const vien = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 20, Math.PI), new THREE.MeshBasicMaterial({ color: 0x2a1a12 }));
    vien.position.z = 0.012;
    vien.scale.set(1, 1.15, 1);
    tron.add(vien);
    const nhamVui = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x2a1a12 }));
    nhamVui.position.z = 0.03;
    nhom.add(nhamVui);
    const nhamTinh = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x2a1a12 }));
    nhamTinh.rotation.z = Math.PI;
    nhamTinh.position.set(0, 0.012, 0.03);
    nhom.add(nhamTinh);
    const may = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0x2b1d16 }));
    may.position.set(s * 0.115, 0.15, 0.285);
    dau.add(may);
    mat1.push({ nhom, tron, nhamVui, nhamTinh, may, x: s });
  }
  // má hồng
  const maMat = new THREE.MeshBasicMaterial({ color: 0xff7a8a, transparent: true, opacity: 0.2, depthWrite: false });
  for (const s of [-1, 1]) {
    const ma = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), maMat);
    ma.position.set(s * 0.19, -0.06, 0.265);
    ma.rotation.y = s * 0.55;
    dau.add(ma);
  }
  // miệng
  const mieng = new THREE.Group();
  mieng.position.set(0, -0.13, 0.285);
  dau.add(mieng);
  const cuoi = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.011, 8, 20, Math.PI), new THREE.MeshBasicMaterial({ color: 0x7a2a1a }));
  mieng.add(cuoi);
  const longMieng = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 12), new THREE.MeshBasicMaterial({ color: 0x5a1210 }));
  longMieng.scale.set(1, 0.1, 0.3);
  mieng.add(longMieng);
  const luoi = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshBasicMaterial({ color: 0xe0606a }));
  luoi.scale.set(1.2, 0.5, 0.4);
  luoi.position.set(0, -0.03, 0.01);
  mieng.add(luoi);
  const rang = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  rang.position.set(0, 0.02, 0.012);
  mieng.add(rang);

  // tay: vai → khuỷu → bàn tay
  type Tay = { vai: any; khuyu: any };
  const tay: Tay[] = [];
  for (const s of [-1, 1]) {
    const vai = new THREE.Group();
    vai.position.set(s * 0.25, 0.56, 0);
    tren.add(vai);
    const bap = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.2, 6, 10), aoMat);
    bap.position.y = -0.14;
    vai.add(bap);
    const khuyu = new THREE.Group();
    khuyu.position.y = -0.28;
    vai.add(khuyu);
    const canh = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.18, 6, 10), aoMat);
    canh.position.y = -0.12;
    khuyu.add(canh);
    const banTay = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), daMat);
    banTay.position.y = -0.26;
    khuyu.add(banTay);
    tay.push({ vai, khuyu });
  }

  /* ---------------- Hiệu ứng ---------------- */
  const songGeo = new THREE.TorusGeometry(0.25, 0.012, 6, 40);
  const song: { m: any; t: number; to: number }[] = [];
  function phatSong(to: number) {
    const m = new THREE.Mesh(songGeo, new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true, opacity: 0.8, depthWrite: false }));
    const p = new THREE.Vector3();
    mieng.getWorldPosition(p);
    m.position.copy(p);
    m.position.z += 0.1;
    scene.add(m);
    song.push({ m, t: 0, to });
  }
  const giotGeo = new THREE.SphereGeometry(0.018, 8, 6);
  const giotMat = new THREE.MeshBasicMaterial({ color: 0x8fd3ff, transparent: true, opacity: 0.85 });
  const giot: { m: any; v: number; t: number }[] = [];
  function roiLe() {
    const e = mat1[Math.random() < 0.5 ? 0 : 1];
    const p = new THREE.Vector3();
    e.nhom.getWorldPosition(p);
    const m = new THREE.Mesh(giotGeo, giotMat);
    m.scale.set(1, 1.4, 1);
    m.position.set(p.x + e.x * 0.03, p.y - 0.06, p.z + 0.02);
    scene.add(m);
    giot.push({ m, v: 0, t: 0 });
  }
  const hoi: { s: any; t: number; x: number }[] = [];
  function phunHoi() {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: khoiTex, transparent: true, depthWrite: false, color: 0xffd0c0 }));
    const p = new THREE.Vector3();
    dau.getWorldPosition(p);
    s.position.set(p.x + (Math.random() - 0.5) * 0.3, p.y + 0.35, p.z);
    scene.add(s);
    hoi.push({ s, t: 0, x: (Math.random() - 0.5) * 0.4 });
  }
  const long: { m: any; v: any; t: number }[] = [];
  function longVu() {
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true }));
      m.position.copy(goi.position);
      m.position.y += 0.2;
      scene.add(m);
      long.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 2), t: 0 });
    }
  }
  const canhHoa: { m: any; v: any; t: number; r: number }[] = [];
  function racHoa() {
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.05, 6), new THREE.MeshBasicMaterial({ color: [0xffb7c5, 0xffe08a, 0xfff6ea][i % 3], side: THREE.DoubleSide, transparent: true }));
      m.position.set((Math.random() - 0.5) * 3, 3 + Math.random(), 0.5 + (Math.random() - 0.5) * 2);
      scene.add(m);
      canhHoa.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 0.3, -0.5 - Math.random() * 0.4, 0), t: 0, r: Math.random() * 6 });
    }
  }
  // Chữ nỗi niềm bay ra cửa sổ rồi tan
  const chuBay: { s: any; t: number; tu: any }[] = [];
  function chuNoiNiem(text: string) {
    const font = "700 40px 'Be Vietnam Pro', system-ui, sans-serif";
    const probe = document.createElement("canvas").getContext("2d")!;
    probe.font = font;
    const tu = text.split(/\s+/);
    const dong: string[] = [];
    let cur = "";
    for (const w of tu) {
      const t2 = cur ? cur + " " + w : w;
      if (probe.measureText(t2).width > 520 && cur) {
        dong.push(cur);
        cur = w;
      } else cur = t2;
    }
    if (cur) dong.push(cur);
    dong.length = Math.min(dong.length, 5);
    const w = Math.ceil(Math.min(600, Math.max(...dong.map((d) => probe.measureText(d).width)) + 50));
    const h = dong.length * 52 + 40;
    const tex = canvasTex(w, h, (g) => {
      g.fillStyle = "rgba(255,250,238,0.94)";
      g.beginPath();
      g.roundRect?.(2, 2, w - 4, h - 4, 24);
      if (!g.roundRect) g.rect(2, 2, w - 4, h - 4);
      g.fill();
      g.font = font;
      g.fillStyle = "#3a2214";
      g.textAlign = "center";
      g.textBaseline = "middle";
      dong.forEach((d, i) => g.fillText(d, w / 2, 26 + 20 + i * 52 - 6));
    });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.set(w * 0.0032, h * 0.0032, 1);
    const p = new THREE.Vector3();
    dau.getWorldPosition(p);
    s.position.set(p.x, p.y + 0.55, p.z + 0.1);
    scene.add(s);
    chuBay.push({ s, t: 0, tu: s.position.clone() });
  }
  const bui: { m: any; v: any; t: number }[] = [];
  function tanThanhBui(p: any) {
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true }));
      m.position.copy(p);
      scene.add(m);
      bui.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 1.2, Math.random() * 0.8, (Math.random() - 0.5) * 1.2 - 0.3), t: 0 });
    }
  }

  /* ---------------- Trạng thái ---------------- */
  let cheDo: CheDo = "binh";
  let doTo = 0; // độ to từ micro (0..1), hoặc đang giữ nút hét
  let giuHet = false;
  const hien: Mat = { ...MAT.binh };
  let chop = 0;
  let henChop = 2;
  let t = 0;
  let henSong = 0;
  let henLe = 1.5;
  let henHoi = 0;
  let damBen = 0;
  let damT = 0;
  let thoPha = 0;
  const camPos = new THREE.Vector3(2.2, 2.0, 4.6);
  const camNhin = new THREE.Vector3(0, 1.0, 0.4);
  const wantPos = new THREE.Vector3();
  const wantNhin = new THREE.Vector3();
  let rung = 0;

  function datTay(ten: string, k: number) {
    const a = TAY[ten];
    tay[0].vai.rotation.x += (a[0] - tay[0].vai.rotation.x) * k;
    tay[0].vai.rotation.z += (a[1] - tay[0].vai.rotation.z) * k;
    tay[0].khuyu.rotation.x += (a[2] - tay[0].khuyu.rotation.x) * k;
    tay[1].vai.rotation.x += (a[3] - tay[1].vai.rotation.x) * k;
    tay[1].vai.rotation.z += (a[4] - tay[1].vai.rotation.z) * k;
    tay[1].khuyu.rotation.x += (a[5] - tay[1].khuyu.rotation.x) * k;
  }

  function capNhat(dt: number) {
    t += dt;
    const k = 1 - Math.exp(-dt * 9);
    const dangHet = (cheDo === "gao" || cheDo === "het") && (giuHet || doTo > 0.12);
    // Biểu cảm đích
    const dich: Mat = { ...MAT[cheDo] };
    if ((cheDo === "gao" || cheDo === "het") && !dangHet) {
      // chưa hét: lấy hơi, mặt căng
      dich.ha = 0.08;
      dich.mo = cheDo === "gao" ? 0.6 : 0.7;
      dich.ma = 0.35;
    } else if (dangHet) {
      const v = Math.max(doTo, giuHet ? 0.85 : 0);
      dich.ha = 0.5 + v * 0.5 + Math.sin(t * 30) * 0.04;
      dich.ma = Math.min(1, dich.ma + v * 0.2);
    }
    if (cheDo === "noi") dich.ha = 0.08 + Math.abs(Math.sin(t * 9)) * 0.3 * (Math.sin(t * 1.7) > -0.4 ? 1 : 0.2);
    if (cheDo === "samhoi") {
      // thở: hít vào 4 giây, thở ra 6 giây
      thoPha = (t % 10) / 10;
    }
    for (const key of Object.keys(dich) as (keyof Mat)[]) {
      if (key === "nham") continue;
      (hien as any)[key] += ((dich as any)[key] - (hien as any)[key]) * k;
    }
    hien.nham = dich.nham;

    // chớp mắt
    henChop -= dt;
    if (henChop <= 0) {
      chop = 0.16;
      henChop = 2 + Math.random() * 3.5;
    }
    if (chop > 0) chop -= dt;
    const mo = Math.max(0, hien.mo * (chop > 0 ? 0.05 : 1));
    for (const e of mat1) {
      e.tron.scale.y = Math.max(0.06, mo);
      e.tron.visible = mo > 0.1;
      e.nhamVui.visible = mo <= 0.1 && hien.nham === "vui";
      e.nhamTinh.visible = mo <= 0.1 && hien.nham === "tinh";
      // lông mày: + cau có (đầu trong hạ xuống), - buồn (đầu trong nhướn lên)
      e.may.rotation.z = -e.x * hien.may * 0.5;
      e.may.position.y = 0.15 + hien.mayY + (hien.may < 0 ? -hien.may * 0.01 : -hien.may * 0.012);
    }
    // miệng
    const ha = hien.ha;
    longMieng.visible = ha > 0.06;
    luoi.visible = ha > 0.45;
    longMieng.scale.set(hien.rong * (0.75 + ha * 0.4), Math.max(0.1, ha * 1.05), 0.3);
    longMieng.position.y = -ha * 0.025;
    rang.visible = hien.rang > 0.3 || (ha > 0.3 && hien.cuoi > 0.5);
    rang.scale.x = hien.rong * 0.9;
    rang.position.y = ha > 0.2 ? ha * 0.03 : 0;
    cuoi.visible = ha < 0.5;
    const c = hien.cuoi;
    cuoi.rotation.z = c >= 0 ? Math.PI : 0;
    cuoi.scale.set(hien.rong * 0.9, Math.max(0.12, Math.abs(c)) * 0.8, 1);
    cuoi.position.y = c >= 0 ? 0.02 : -0.03;
    // má, mặt đỏ khi gào
    maMat.opacity = 0.12 + hien.ma * 0.55;
    daMat.color.copy(SKIN).lerp(DO, Math.max(0, (hien.ma - 0.5) * 0.9));

    // Tư thế
    let lean = 0;
    let quayDau = 0;
    let nghieng = 0;
    let tayTen = "nghi";
    let rungThan = 0;
    switch (cheDo) {
      case "gao":
        tayTen = dangHet ? "omDau" : "nghi";
        lean = dangHet ? -0.22 : 0.05;
        rungThan = dangHet ? 0.018 : 0;
        break;
      case "het":
        tayTen = "loa";
        lean = dangHet ? -0.3 : 0;
        rungThan = dangHet ? 0.012 : 0;
        break;
      case "noi":
        tayTen = "giai";
        nghieng = Math.sin(t * 0.8) * 0.08;
        lean = 0.06;
        tay[1].khuyu.rotation.x += Math.sin(t * 3) * 0.02;
        break;
      case "dam": {
        quayDau = 1.15; // quay người về phía gối bên phải
        if (damT > 0) {
          damT -= dt;
          tayTen = damBen ? "damPhai" : "damTrai";
          lean = 0.22;
        } else {
          tayTen = "nghi";
          lean = 0.08;
        }
        break;
      }
      case "samhoi":
        tayTen = "chap";
        lean = 0.06 + Math.sin(thoPha * Math.PI * 2 - Math.PI / 2) * 0.05;
        break;
      case "xem":
        quayDau = -0.75;
        lean = -0.02;
        break;
      case "nhe":
        tayTen = "mung";
        lean = -0.1 + Math.abs(Math.sin(t * 4)) * 0.05;
        nghieng = Math.sin(t * 3) * 0.1;
        break;
      default:
        lean = 0.12;
        nghieng = Math.sin(t * 0.5) * 0.05;
    }
    datTay(tayTen, 1 - Math.exp(-dt * (cheDo === "dam" ? 22 : 8)));
    tren.rotation.x += (lean - tren.rotation.x) * k;
    tren.rotation.y += (quayDau * 0.6 - tren.rotation.y) * k;
    dau.rotation.y += (quayDau * 0.5 - dau.rotation.y) * k;
    dau.rotation.z += (nghieng - dau.rotation.z) * k;
    dau.rotation.x += ((cheDo === "samhoi" ? 0.18 : cheDo === "binh" ? 0.12 : dangHet ? -0.25 : 0) - dau.rotation.x) * k;
    const tho = cheDo === "samhoi" ? Math.sin(thoPha * Math.PI * 2 - Math.PI / 2) * 0.03 : Math.sin(t * 1.6) * 0.01;
    tren.scale.set(1 + tho * 0.5, 1 + tho, 1 + tho * 0.5);
    tren.position.x = rungThan ? (Math.random() - 0.5) * rungThan * 2 : 0;
    tren.position.z = rungThan ? (Math.random() - 0.5) * rungThan * 2 : 0;

    // Sóng âm, hơi nóng, nước mắt, gối
    if (dangHet) {
      henSong -= dt;
      if (henSong <= 0) {
        phatSong(cheDo === "gao" ? 1.4 : 1);
        henSong = cheDo === "gao" ? 0.16 : 0.12;
      }
      rung = Math.max(rung, (cheDo === "gao" ? 0.05 : 0.035) * Math.max(0.6, doTo));
      if (cheDo === "gao") {
        henHoi -= dt;
        if (henHoi <= 0) {
          phunHoi();
          henHoi = 0.25;
        }
      }
    }
    if (cheDo === "dam" && damT <= 0 && hien.may > 0.5) {
      henHoi -= dt;
      if (henHoi <= 0) {
        phunHoi();
        henHoi = 0.9;
      }
    }
    if (cheDo === "noi" || (cheDo === "samhoi" && t % 20 < 8)) {
      henLe -= dt;
      if (henLe <= 0) {
        roiLe();
        henLe = cheDo === "noi" ? 0.9 + Math.random() : 1.6;
      }
    }
    for (let i = song.length - 1; i >= 0; i--) {
      const s = song[i];
      s.t += dt;
      const r = 1 + s.t * 5 * s.to;
      s.m.scale.set(r, r, r);
      s.m.position.z += dt * 2.2;
      s.m.material.opacity = Math.max(0, 0.8 - s.t * 1.1);
      if (s.t > 0.75) {
        scene.remove(s.m);
        s.m.material.dispose();
        song.splice(i, 1);
      }
    }
    for (let i = giot.length - 1; i >= 0; i--) {
      const g = giot[i];
      g.t += dt;
      g.v += dt * (g.t < 0.5 ? 0.25 : 2.5);
      g.m.position.y -= g.v * dt;
      g.m.position.z += dt * 0.02;
      if (g.m.position.y < 0.3 || g.t > 2) {
        scene.remove(g.m);
        giot.splice(i, 1);
      }
    }
    for (let i = hoi.length - 1; i >= 0; i--) {
      const h = hoi[i];
      h.t += dt;
      h.s.position.y += dt * 0.9;
      h.s.position.x += h.x * dt;
      h.s.scale.setScalar(0.15 + h.t * 0.6);
      h.s.material.opacity = Math.max(0, 0.7 - h.t * 0.7);
      if (h.t > 1) {
        scene.remove(h.s);
        h.s.material.dispose();
        hoi.splice(i, 1);
      }
    }
    goiDap = Math.max(0, goiDap - dt * 3);
    const ep = Math.sin(goiDap * Math.PI) * 0.35;
    goi.scale.set(1 + ep * 0.6, 1 - ep, 1 + ep * 0.6);
    goi.position.y = 0.24 - ep * 0.06;
    for (let i = long.length - 1; i >= 0; i--) {
      const l = long[i];
      l.t += dt;
      l.v.y -= dt * 1.2;
      l.v.multiplyScalar(0.985);
      l.m.position.addScaledVector(l.v, dt);
      l.m.rotation.x += dt * 4;
      l.m.rotation.y += dt * 3;
      l.m.material.opacity = Math.max(0, 1 - l.t / 2);
      if (l.t > 2 || l.m.position.y < 0.02) {
        scene.remove(l.m);
        l.m.geometry.dispose();
        l.m.material.dispose();
        long.splice(i, 1);
      }
    }
    for (let i = canhHoa.length - 1; i >= 0; i--) {
      const h = canhHoa[i];
      h.t += dt;
      h.m.position.addScaledVector(h.v, dt);
      h.m.position.x += Math.sin(t * 2 + h.r) * dt * 0.3;
      h.m.rotation.set(t * 2 + h.r, t * 1.5, 0);
      if (h.m.position.y < 0.02 || h.t > 8) {
        scene.remove(h.m);
        h.m.geometry.dispose();
        h.m.material.dispose();
        canhHoa.splice(i, 1);
      }
    }
    // chữ nỗi niềm: dừng trên đầu 2,2 giây rồi bay ra cửa sổ, nhỏ dần và tan thành bụi sáng
    for (let i = chuBay.length - 1; i >= 0; i--) {
      const c2 = chuBay[i];
      c2.t += dt;
      const u = Math.max(0, (c2.t - 2.2) / 3);
      if (u > 0) {
        const e = u * u * (3 - 2 * u);
        c2.s.position.set(c2.tu.x + (1.6 - c2.tu.x) * e, c2.tu.y + (2.4 - c2.tu.y) * e + Math.sin(u * Math.PI) * 0.4, c2.tu.z + (-4.6 - c2.tu.z) * e);
        c2.s.material.opacity = 1 - Math.max(0, u - 0.6) / 0.4;
        c2.s.material.rotation = Math.sin(t * 3) * 0.05;
      } else c2.s.position.y = c2.tu.y + Math.sin(t * 2) * 0.03;
      if (u >= 1) {
        tanThanhBui(c2.s.position);
        scene.remove(c2.s);
        c2.s.material.map?.dispose();
        c2.s.material.dispose();
        chuBay.splice(i, 1);
      }
    }
    for (let i = bui.length - 1; i >= 0; i--) {
      const b = bui[i];
      b.t += dt;
      b.m.position.addScaledVector(b.v, dt);
      b.m.material.opacity = Math.max(0, 1 - b.t / 1.4);
      if (b.t > 1.4) {
        scene.remove(b.m);
        b.m.geometry.dispose();
        b.m.material.dispose();
        bui.splice(i, 1);
      }
    }

    // nến lung linh, khói hương, đèn lồng đung đưa
    const fl = 1 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7.7) * 0.08 + (dangHet ? (Math.random() - 0.5) * 0.6 : 0);
    lua.forEach((f, i) => f.scale.set(1, 1.8 * (fl + i * 0.05), 1));
    denNen.intensity = 3 * fl;
    for (const p of khoi) {
      p.life += dt * 0.12;
      if (p.life > 1) p.life -= 1;
      p.s.position.set(-2.4 + Math.sin(p.life * 9 + t) * 0.08 * p.life, 0.7 + p.life * 1.8, -3.85);
      p.s.scale.setScalar(0.1 + p.life * 0.55);
      p.s.material.opacity = (1 - p.life) * 0.45;
    }
    denLong.rotation.z = Math.sin(t * 0.9) * 0.04 + (dangHet ? Math.sin(t * 25) * 0.05 : 0);
    if (videoTex) denTv.intensity = 1.6 + Math.sin(t * 5) * 0.3;

    // Máy quay theo chế độ
    switch (cheDo) {
      case "gao":
      case "het":
        wantPos.set(0.45, 1.42, 2.55);
        wantNhin.set(0, 1.15, 0.5);
        break;
      case "noi":
        wantPos.set(0.5, 1.6, 3.2);
        wantNhin.set(0, 1.45, 0.5);
        break;
      case "dam":
        wantPos.set(-0.6, 1.7, 3.3);
        wantNhin.set(0.5, 0.7, 0.8);
        break;
      case "samhoi":
        wantPos.set(0.0, 1.45, 3.1);
        wantNhin.set(0, 0.95, 0.5);
        break;
      case "xem":
        wantPos.set(2.9, 1.9, 3.4);
        wantNhin.set(-2.2, 1.55, 0.2);
        break;
      case "nhe":
        wantPos.set(0, 1.6, 3.4);
        wantNhin.set(0, 1.1, 0.5);
        break;
      default:
        wantPos.set(2.1, 2.0, 4.3);
        wantNhin.set(0, 0.95, 0.3);
    }
    wantPos.x += Math.sin(t * 0.15) * 0.25;
    const kc = 1 - Math.exp(-dt * 2.2);
    camPos.lerp(wantPos, kc);
    camNhin.lerp(wantNhin, kc);
    camera.position.copy(camPos);
    if (rung > 0) {
      camera.position.x += (Math.random() - 0.5) * rung;
      camera.position.y += (Math.random() - 0.5) * rung;
      rung = Math.max(0, rung - dt * 0.15);
    }
    camera.lookAt(camNhin);
  }

  function resize() {
    const w = host.clientWidth || 300;
    const h = host.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.9 ? 55 : 42;
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
  raf = requestAnimationFrame(vong);

  return {
    setCheDo(c: CheDo) {
      cheDo = c;
      if (c === "nhe") racHoa();
    },
    /** Độ to giọng từ micro (0..1) */
    setDoTo(v: number) {
      doTo = Math.max(0, Math.min(1, v));
    },
    /** Đang giữ nút hét */
    setGiuHet(v: boolean) {
      giuHet = v;
    },
    /** Thả một câu nỗi niềm: hiện trên đầu rồi bay ra cửa sổ, tan thành bụi sáng */
    noi(text: string) {
      chuNoiNiem(text);
    },
    /** Đấm gối một cái */
    dam() {
      damBen = 1 - damBen;
      damT = 0.18;
      goiDap = 1;
      if (Math.random() < 0.6) longVu();
      rung = Math.max(rung, 0.02);
    },
    /** Gắn video để tivi phát */
    setVideo(v: HTMLVideoElement | null) {
      if (videoTex) {
        videoTex.dispose();
        videoTex = null;
      }
      if (v) {
        videoTex = new THREE.VideoTexture(v);
        videoTex.colorSpace = THREE.SRGBColorSpace;
        manHinhMat.map = videoTex;
      } else {
        manHinhMat.map = choTex;
        denTv.intensity = 0;
      }
      manHinhMat.needsUpdate = true;
    },
    racHoa,
    /** Pha thở khi ngồi sám hối: 0..0,4 hít vào, 0,4..1 thở ra (chu kì 10 giây) */
    layTho(): number {
      return thoPha;
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o: any) => {
        o.geometry?.dispose?.();
        const m = o.material;
        if (m) for (const mm of Array.isArray(m) ? m : [m]) {
          if (mm.map && mm.map !== videoTex) mm.map.dispose?.();
          mm.dispose?.();
        }
      });
      videoTex?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
