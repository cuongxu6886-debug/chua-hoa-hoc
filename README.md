# Chùa Hóa Học

Web học Hóa kiểu "đi chùa online" cho học sinh THPT.

- **Xin quẻ:** mỗi quẻ là một câu trắc nghiệm A, B, C, D (Hóa 10, 11, 12).
  - Trả lời đúng: gõ mõ, tích công đức, lên 1 cấp.
  - Trả lời sai: lên **Điện Tổ** vái Ông Tổ nghề Hóa ba vái rồi ngồi tụng "kinh" (kiến thức trọng tâm của chuyên đề vừa sai).
- **Cấp và độ khó:** cấp từ 1 đến 100, câu hỏi khó dần theo cấp. Chạm cấp 100 là **Sám hối thành công**.
- **Thời gian phạt:** sai lần đầu tụng 1 phút; sai liên tiếp thì tăng dần, tối đa 5 phút.
- **Điện Tổ** có 100 chỗ ngồi; đầy thì xếp hàng ngoài sân.
- **Hương:** mua bằng hoa hồng tặng trên live TikTok, hoặc đổi bằng công đức. Mỗi nén thắp lên đẩy học sinh lên 5 cấp.
- **Màn hình live** đọc to tên người vào chùa, người tặng quà, người thắp hương, người ngồi phạt, người sám hối thành công.

Công nghệ: Next.js 15 (React 19) và Supabase (cơ sở dữ liệu, đăng nhập). Chấm điểm và tính giờ phạt đều làm trên máy chủ, học sinh không xem được đáp án trước.

---

## 1. Chuẩn bị (đều có gói miễn phí)

- Tài khoản [Supabase](https://supabase.com) để lưu dữ liệu và đăng nhập.
- Tài khoản [GitHub](https://github.com) để chứa code.
- Tài khoản [Vercel](https://vercel.com) để đưa web lên mạng.

Tên các mục trong trang quản lý của Supabase và Vercel có thể thay đổi theo thời gian. Nếu không thấy đúng chữ như dưới đây, tìm mục có ý nghĩa tương tự.

## 2. Tạo cơ sở dữ liệu Supabase

1. Vào Supabase, tạo project mới. Chọn vùng gần Việt Nam, ví dụ Singapore.
2. Mở **SQL Editor**:
   1. Dán toàn bộ nội dung file `supabase/schema.sql` rồi bấm **Run**.
   2. Mở tab mới, dán `supabase/seed.sql` rồi **Run**. Bước này nạp 18 chuyên đề, 18 bài kinh và 82 câu hỏi mẫu.
      Kho GitHub công khai **không** chứa `seed.sql` và `data/questions.json` (có đáp án), để học sinh không xem lén được. Hai file này chỉ có trong bản zip gửi riêng cho thầy cô.
3. Vào **Project Settings → API**, chép ba giá trị:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`. Chỉ cần nếu dùng webhook quà TikTok. Tuyệt đối không đưa khóa này cho ai.
4. Bật **vào chùa bằng tên** (học sinh chỉ nhập tên, chọn Nam/Nữ, không cần email):
   1. **Authentication → Sign In / Providers**, bật **Allow anonymous sign-ins**, bấm **Save**.
   2. **Authentication → Rate Limits**, tăng **Anonymous users** (mặc định khoảng 30 lượt mỗi giờ cho một địa chỉ IP) lên khoảng 500. Cả lớp dùng chung một mạng wifi thì Supabase coi là một IP, để thấp sẽ có em bị chặn.

   Tài khoản vào bằng tên gắn với trình duyệt của học sinh. Mở lại cùng máy, cùng trình duyệt là vào tiếp đúng cấp cũ. Đổi máy, xóa lịch sử duyệt web hoặc bấm "Ra khỏi chùa" thì sẽ bắt đầu lại từ cấp 1.

Chạy lại hai file SQL nhiều lần không làm mất dữ liệu và không nhân đôi câu hỏi mẫu.

## 3. Đưa web lên mạng bằng Vercel

1. Tạo kho (repository) mới trên GitHub, tải toàn bộ thư mục này lên.
2. Vào Vercel → **Add New → Project** → chọn kho vừa tạo.
3. Ở phần **Environment Variables**, thêm các biến trong file `.env.example`:

| Biến | Bắt buộc | Ghi chú |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Có | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Có | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Khi dùng webhook | service_role key |
| `TIKTOK_WEBHOOK_SECRET` | Khi dùng webhook | Chuỗi bí mật tự đặt, càng dài càng tốt |
| `TIKTOK_GIFT_NAMES` | Không | Mặc định `rose,hoa hồng` |
| `HUONG_PER_GIFT` | Không | Mỗi bông hồng đổi mấy nén hương, mặc định 1 |
| `ANTHROPIC_API_KEY` | Không | Bật "Hỏi Ông Tổ" bằng AI |
| `ANTHROPIC_MODEL` | Không | Mặc định `claude-haiku-5-5` |

4. Bấm **Deploy**. Xong sẽ có đường link dạng `https://ten-du-an.vercel.app`.
5. Quay lại Supabase → **Authentication → URL Configuration**, đặt **Site URL** là đường link đó.

### Cách khác: đưa lên Render (giống trang tyhh-school)

1. Tải thư mục này lên một kho GitHub (như bước 1 ở trên).
2. Vào [Render](https://render.com) → **New → Blueprint** → chọn kho đó. Render đọc file `render.yaml` và tự điền cách build, cách chạy.
3. Điền các ô còn trống:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
   - `SUPABASE_SERVICE_ROLE_KEY` nếu dùng webhook quà TikTok;
   - `ANTHROPIC_API_KEY` để trống nếu không dùng Hỏi Ông Tổ.

   `TIKTOK_WEBHOOK_SECRET` được Render tự tạo; xem lại trong mục Environment của dịch vụ.
4. Bấm **Apply**. Vài phút sau có đường link dạng `https://chua-hoa-hoc.onrender.com`. Tên có thể khác nếu đã có người dùng tên này.
5. Đặt **Site URL** trong Supabase là đường link đó (như bước 5 ở trên).

### Tự cập nhật khi có code mới

Kho có sẵn `.github/workflows/deploy-render.yml`. Lấy **Deploy Hook** trong Render (dịch vụ → Settings → Deploy Hook), rồi thêm vào GitHub ở **Settings → Secrets and variables → Actions** với tên `RENDER_DEPLOY_HOOK`. Từ đó mỗi lần đẩy code lên nhánh `main`, Render tự build lại.

Gói miễn phí của Render tự "ngủ" khi lâu không có người vào. Người vào đầu tiên sau đó phải đợi khoảng một phút để web thức dậy. Trước buổi live, nên mở web trước vài phút.

## 4. Cấp quyền thầy cô (quản trị)

Cách nhanh: vào web bằng tên như học sinh (ví dụ tên `Thầy Cường`), rồi trong Supabase → SQL Editor chạy:

```sql
update public.profiles set role = 'admin'
where id = (select id from public.profiles where display_name = 'Thầy Cường'
            order by created_at desc limit 1);
```

Cách này chỉ giữ quyền trên đúng máy, đúng trình duyệt đó. Muốn đăng nhập quản trị ở nhiều máy (ví dụ máy chạy màn hình live):

1. Supabase → **Authentication → Users → Add user → Create new user**, nhập email và mật khẩu, tích **Auto Confirm User**.
2. Chạy câu SQL (đổi email):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'email-cua-ban@gmail.com');
```

3. Trên web, bấm **Thầy cô đăng nhập bằng email** dưới nút Vào chùa.

3. Tải lại web. Thanh trên cùng sẽ có nút **Quản trị**.

Trang Quản trị có bốn mục:

- **Câu hỏi:** thêm, sửa, ẩn, xóa; nhập hàng loạt từ JSON; tải toàn bộ về JSON.
- **Học sinh:** xem cấp, công đức, hương, số câu đúng/sai; tặng hương; xóa phạt cho học sinh bị kẹt.
- **Hương TikTok:** cộng hương theo tên TikTok của người tặng; xem hương đang chờ người nhận; đường link webhook.
- **Cấu hình:** đổi luật chơi, không cần sửa code.

## 5. Luật chơi và cấu hình

Tất cả các số dưới đây sửa ở **Quản trị → Cấu hình** (bảng `app_config`):

| Khóa | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `max_level` | 100 | Cấp cao nhất, chạm là sám hối thành công |
| `levels_per_tier` | 25 | Mỗi 25 cấp câu hỏi khó lên một mức: Nhận biết → Thông hiểu → Vận dụng → Vận dụng cao |
| `level_up_on_correct` | 1 | Đúng một câu lên bao nhiêu cấp |
| `level_down_on_wrong` | 1 | Sai một câu hạ bao nhiêu cấp |
| `penalty_step_minutes` | 1 | Sai liên tiếp lần thứ n phải tụng n × số này phút |
| `max_penalty_minutes` | 5 | Tối đa số phút tụng một lần |
| `room_capacity` | 100 | Số chỗ ngồi trong Điện Tổ |
| `incense_level_boost` | 5 | Mỗi nén hương đẩy lên bao nhiêu cấp |
| `incense_cost_merit` | 20 | Bao nhiêu công đức đổi 1 nén hương; đặt 0 để tắt |
| `merit_tier_1` … `merit_tier_4` | 1, 2, 3, 5 | Công đức cho câu đúng ở mỗi mức |
| `ask_to_daily_limit` | 10 | Số lần hỏi Ông Tổ (AI) mỗi ngày |
| `join_announce_gap_minutes` | 30 | Vắng bao lâu thì lần vào sau được đọc tên lại |

Một số quy tắc giữ cho công bằng:

- **Không đổi được quẻ khó:** quẻ đã xin phải trả lời mới xin quẻ khác.
- **Công đức chỉ tính lần đúng đầu tiên** của mỗi câu. Làm đúng lại vẫn được lên cấp.
- **Chỉ tính giờ tụng khi học sinh mở trang Điện Tổ.** Rời trang thì đồng hồ dừng; rời quá 45 giây thì mất chỗ và phải xếp hàng lại, nhưng số giây đã tụng vẫn giữ.
- **Cấp 100 phải tự trả lời đúng mới qua được.** Thắp hương chỉ đẩy lên tối đa cấp 99.

## 6. Màn hình live (chiếu lên TikTok)

1. Trên máy tính đang live, đăng nhập bằng tài khoản thầy cô rồi mở `https://ten-du-an.vercel.app/man-hinh-live`.
   - Nên dùng **Microsoft Edge trên Windows**: Edge có sẵn giọng tiếng Việt tự nhiên (HoaiMy, NamMinh).
   - Chrome cũng đọc được nếu máy có giọng tiếng Việt.
2. Bấm **Bắt đầu đọc thông báo**. Trình duyệt chỉ cho phát tiếng sau một lần bấm.
3. Chọn giọng, tốc độ đọc và loại thông báo muốn đọc, rồi bấm **Ẩn bảng điều khiển** cho gọn.
4. Trong TikTok LIVE Studio (hoặc OBS), thêm nguồn **chụp cửa sổ** trình duyệt đó. Nhớ bật thu cả âm thanh của cửa sổ.

Màn hình live tự cập nhật 3 giây một lần, gồm:

- Ông Tổ và dòng thông báo đang đọc.
- Số đệ tử đang trong chùa, số người đang ngồi phạt, số người chờ ngoài sân.
- Danh sách sự kiện vừa xảy ra, bảng vàng top 10 và sơ đồ 100 chỗ ngồi.

Nhiều người vào chùa cùng lúc thì được gộp thành một câu cho khỏi đọc dồn dập.

## 7. Hương và quà TikTok

Học sinh ghi **tên TikTok** (phần sau dấu @) trong **Hồ sơ**. Hương được cộng theo tên này.

- **Cộng tay (luôn dùng được):** thấy quà hoa hồng trên live thì vào **Quản trị → Hương TikTok**, gõ tên TikTok người tặng và số hương. Nếu chưa có học sinh nào gắn tên đó, hương được giữ lại; ai gắn tên đó trong Hồ sơ sẽ nhận.
- **Tự động bằng webhook:**
  - Nếu phần mềm livestream của bạn gửi được webhook khi có quà, cho nó gọi:

    ```
    https://ten-du-an.vercel.app/api/qua-tiktok?key=TIKTOK_WEBHOOK_SECRET&user={username}&gift={giftname}&count={repeatcount}
    ```

  - Thay `{username}`, `{giftname}`, `{repeatcount}` bằng đúng tên biến của phần mềm đó.
  - Đường link nhận cả GET lẫn POST (JSON).
  - Phần này chưa được thử với phần mềm thật. Hãy tặng thử một bông hồng rồi xem **Quản trị → Hương TikTok** để chắc chắn.

Lưu ý:

- **TikTok chỉ cho người từ 18 tuổi trở lên mua, gửi hoặc nhận quà ảo.** Phần lớn học sinh THPT chưa đủ tuổi, vì vậy web có sẵn cách đổi hương bằng công đức.
- **TikTok không có kênh chính thức** cho web bên ngoài đọc quà trên live. Vì vậy cách cộng tay luôn là đường dự phòng.

## 8. Hỏi Ông Tổ (AI, tùy chọn)

Đặt `ANTHROPIC_API_KEY` (lấy ở [console.anthropic.com](https://console.anthropic.com)) là trang Điện Tổ có thêm ô **Hỏi Ông Tổ**.

- Ông Tổ gợi ý từng bước, không giải hộ ngay, và chỉ trả lời chuyện Hóa.
- Mỗi học sinh có số lượt hỏi giới hạn mỗi ngày; đang chịu phạt thì không hỏi được.
- Tính năng này tính phí theo lượt dùng trên tài khoản Anthropic của bạn. Mặc định dùng model rẻ nhất là `claude-haiku-5-5`.

Không đặt khóa thì ô hỏi tự ẩn, mọi phần khác vẫn chạy.

## 9. Thêm câu hỏi

- **Cách nhanh:** Quản trị → Câu hỏi → **Thêm câu hỏi**, hoặc **Nhập từ JSON**. Mẫu JSON:

```json
[
  {
    "topic": "t12-kim-loai",
    "level": 2,
    "content": "Kim loại nào sau đây có tính khử mạnh nhất?",
    "options": ["Fe", "Cu", "Mg", "Ag"],
    "answer": "C",
    "explanation": "Mg có thế điện cực chuẩn nhỏ nhất."
  }
]
```

- **`level`** là mức khó: 1 = Nhận biết, 2 = Thông hiểu, 3 = Vận dụng, 4 = Vận dụng cao.
- **Mã chuyên đề (`topic`)** nằm trong `data/topics.json`, ví dụ `t10-nguyen-tu`, `t11-can-bang`, `t12-ester-lipid`.
- **Sửa nội dung kinh:** trong Supabase → Table Editor → bảng `topics`, cột `kinh`.
- **Nạp lại bộ câu mẫu:** sửa `data/questions.json` (chỉ có trong bản zip; xem mẫu ở `data/questions.example.json`), chạy `npm run seed` để tạo lại `supabase/seed.sql`, rồi chạy file đó trong SQL Editor. Đừng đưa hai file này lên kho công khai.

Nên có ít nhất khoảng 25 câu cho mỗi mức để học sinh ít gặp lại câu cũ.

## 10. Nhạc nền

Nhạc nền nằm ở `public/nhac/nhac-nen.mp3`. File này được tách từ video bạn gửi, làm mềm đầu và cuối để lặp liền mạch.

- **Phát nhạc:** nhạc phát nhỏ sau lần chạm đầu tiên vào trang, vì trình duyệt không cho tự phát trước đó. Học sinh tắt/bật bằng nút nốt nhạc trên thanh trên cùng.
- **Đổi nhạc:** thay file khác cùng tên.
- **Bản quyền:** nếu nhạc lấy từ thư viện nhạc của TikTok, giấy phép thường chỉ cho dùng trong TikTok. Hãy chắc là bạn có quyền dùng bản nhạc trên web riêng.

## 11. Chạy thử trên máy tính

Cần Node.js 20 trở lên.

```bash
npm install
cp .env.example .env.local   # rồi điền các khóa Supabase
npm run dev                  # mở http://localhost:3000
```

## Cấu trúc thư mục

```
app/                  Các trang (chánh điện, điện Tổ, bảng vàng, sổ sám hối, hồ sơ, quản trị, màn hình live) và API
components/           Giao diện: Ông Tổ, mõ, tràng hạt 100 cấp, bát hương, phòng 100 chỗ ngồi…
lib/                  Kết nối Supabase, âm thanh mõ/chuông, kiểu dữ liệu
supabase/schema.sql   Bảng, bảo mật, hàm chấm điểm và tính giờ phạt
supabase/seed.sql     Chuyên đề, kinh, câu hỏi mẫu (tạo từ data/)
data/                 topics.json (chuyên đề + kinh), questions.json (câu hỏi mẫu)
public/               Logo trên ngực Ông Tổ, nhạc nền
```
