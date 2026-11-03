/** Thực đơn trai đường Chùa Hóa Học: món ăn đặt tên theo hóa học cho vui. */

export type NhomMon = "chinh" | "uong" | "trang";
export type Mon = {
  id: string;
  nhom: NhomMon;
  ten: string;
  /** Công thức hoặc chất hóa học gắn với món */
  chat: string;
  moTa: string;
  /** Lời chú tiểu nói khi bưng món ra (viết để đọc to bằng tiếng Việt) */
  loi: string;
  loai: "bat" | "coc" | "dia";
  mau: number;
  /** Bậc tu hành cần đạt để gọi được món (mặc định 1) */
  bac?: number;
};

export const NHOM_MON: { v: NhomMon; ten: string }[] = [
  { v: "chinh", ten: "Món chính" },
  { v: "uong", ten: "Đồ uống" },
  { v: "trang", ten: "Tráng miệng" },
];

export const THUC_DON: Mon[] = [
  {
    id: "com-hidro",
    nhom: "chinh",
    ten: "Cơm xào Hiđro",
    chat: "H₂",
    moTa: "Cơm xào nhẹ như khí hiđro, ăn xong thấy bay bổng.",
    loi: "Cơm xào hiđrô đây ạ! Nhẹ như khí hiđrô, ăn xong lên cấp vù vù.",
    loai: "dia",
    mau: 0xe8c66a,
  },
  {
    id: "pho-nacl",
    bac: 2,
    nhom: "chinh",
    ten: "Phở chay nước dùng NaCl 0,9%",
    chat: "NaCl",
    moTa: "Nước dùng nêm muối vừa đúng nồng độ nước muối sinh lí.",
    loi: "Phở chay nước dùng muối ăn chín phần nghìn, đậm đà vừa miệng ạ.",
    loai: "bat",
    mau: 0xc98a4a,
  },
  {
    id: "bun-cu",
    bac: 3,
    nhom: "chinh",
    ten: "Bún riêu xanh lam Cu(OH)₂",
    chat: "Cu(OH)₂",
    moTa: "Màu xanh lam như kết tủa đồng hiđroxit, nhưng làm từ hoa đậu biếc.",
    loi: "Bún riêu xanh lam như đồng hai hiđrôxit, mà nhuộm bằng hoa đậu biếc nên ăn được ạ!",
    loai: "bat",
    mau: 0x4a8fd6,
  },
  {
    id: "mi-tinh-bot",
    bac: 3,
    nhom: "chinh",
    ten: "Mì xào tinh bột (C₆H₁₀O₅)ₙ",
    chat: "(C₆H₁₀O₅)ₙ",
    moTa: "Sợi mì toàn tinh bột, no lâu để ngồi học cả buổi.",
    loi: "Mì xào tinh bột đây ạ, no lâu để thí chủ học cả buổi chiều.",
    loai: "dia",
    mau: 0xd9b26a,
  },
  {
    id: "dau-sot",
    bac: 4,
    nhom: "chinh",
    ten: "Đậu phụ sốt cà chua pH 4,5",
    chat: "pH 4,5",
    moTa: "Sốt cà chua hơi chua, vì có axit citric và axit malic.",
    loi: "Đậu phụ sốt cà chua, pH bốn phẩy năm, chua chua ngọt ngọt ạ.",
    loai: "dia",
    mau: 0xd6502a,
  },
  {
    id: "canh-iot",
    bac: 4,
    nhom: "chinh",
    ten: "Canh rong biển giàu I₂",
    chat: "I₂",
    moTa: "Rong biển nhiều iot, tốt cho tuyến giáp.",
    loi: "Canh rong biển giàu iốt, tốt cho tuyến giáp của thí chủ ạ.",
    loai: "bat",
    mau: 0x3f7a4a,
  },
  {
    id: "nuoc-co-ga",
    nhom: "uong",
    ten: "Nước H₂O có ga CO₂",
    chat: "H₂O + CO₂",
    moTa: "Khí CO₂ hòa tan tạo axit cacbonic, sủi bọt mát lạnh.",
    loi: "Nước hát hai ô có ga đây ạ, toàn bọt khí cacbônic, mát lạnh luôn!",
    loai: "coc",
    mau: 0xcfe9ff,
  },
  {
    id: "tra-xanh",
    nhom: "uong",
    ten: "Trà xanh Catechin",
    chat: "C₁₅H₁₄O₆",
    moTa: "Trà xanh giàu catechin, chất chống oxi hóa.",
    loi: "Trà xanh giàu catechin, chống ôxi hóa, uống cho tỉnh táo ạ.",
    loai: "coc",
    mau: 0x9bc46a,
  },
  {
    id: "nuoc-chanh",
    bac: 2,
    nhom: "uong",
    ten: "Nước chanh axit xitric",
    chat: "C₆H₈O₇",
    moTa: "Chua nhờ axit xitric, nhớ cho thêm đường saccarozơ.",
    loi: "Nước chanh axit xitric, chua chua ngọt ngọt đây ạ.",
    loai: "coc",
    mau: 0xfff0a0,
  },
  {
    id: "sua-dau",
    bac: 3,
    nhom: "uong",
    ten: "Sữa đậu nành Ca²⁺",
    chat: "Ca²⁺",
    moTa: "Sữa đậu nành bổ sung canxi cho xương chắc khỏe.",
    loi: "Sữa đậu nành bổ sung canxi, uống cho xương chắc khỏe ạ.",
    loai: "coc",
    mau: 0xf3ead6,
  },
  {
    id: "nuoc-dua",
    bac: 4,
    nhom: "uong",
    ten: "Nước dừa K⁺ bù khoáng",
    chat: "K⁺",
    moTa: "Nước dừa nhiều ion kali, bù khoáng sau khi chơi ở sân.",
    loi: "Nước dừa nhiều ion kali, bù khoáng sau khi chơi ngoài sân ạ.",
    loai: "coc",
    mau: 0xf6f6ee,
  },
  {
    id: "che-duong",
    nhom: "trang",
    ten: "Chè đỗ đen đường C₁₂H₂₂O₁₁",
    chat: "C₁₂H₂₂O₁₁",
    moTa: "Chè nấu với đường saccarozơ, ngọt vừa phải.",
    loi: "Chè đỗ đen đường saccarôzơ đây ạ, ăn xong nhớ súc miệng nhé.",
    loai: "bat",
    mau: 0x3a2a2a,
  },
  {
    id: "kem-da",
    bac: 4,
    nhom: "trang",
    ten: "Kem hỗn hợp sinh hàn NaCl + đá",
    chat: "NaCl + H₂O(r)",
    moTa: "Muối trộn đá hạ nhiệt độ xuống dưới 0°C để làm kem.",
    loi: "Kem làm bằng hỗn hợp muối với đá, lạnh dưới không độ luôn ạ!",
    loai: "dia",
    mau: 0xf7d7e6,
  },
  {
    id: "xoi-gac",
    bac: 2,
    nhom: "trang",
    ten: "Xôi gấc β-caroten",
    chat: "C₄₀H₅₆",
    moTa: "Màu đỏ cam của gấc là β-caroten, tốt cho mắt.",
    loi: "Xôi gấc đỏ au nhờ bêta carôten, tốt cho mắt thí chủ ạ.",
    loai: "dia",
    mau: 0xe0502a,
  },
  {
    id: "lau-vang",
    nhom: "chinh",
    ten: "Lẩu nấm vàng Au 24K",
    chat: "Au",
    moTa: "Món dành riêng cho Đại đệ tử: nấm xếp như thỏi vàng, nước dùng ngọt thanh.",
    loi: "Lẩu nấm vàng ròng, món đặc biệt chỉ dành cho Đại đệ tử thôi ạ!",
    loai: "bat",
    mau: 0xe8b43a,
    bac: 5,
  },
  {
    id: "mam-co",
    nhom: "chinh",
    ten: "Mâm cỗ Truyền nhân Ông Tổ",
    chat: "C₆H₁₂O₆",
    moTa: "Xôi, chè, bánh chưng chay ngọt lành như đường glucozơ. Ông Tổ ban cho truyền nhân.",
    loi: "Mâm cỗ Ông Tổ ban riêng cho truyền nhân đây ạ! Chúc thí chủ ngon miệng.",
    loai: "dia",
    mau: 0xd65a2a,
    bac: 6,
  },
];
