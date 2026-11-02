import { redirect } from "next/navigation";

/** Không còn đăng ký riêng: vào chùa bằng tên ở trang /dang-nhap. */
export default function Page() {
  redirect("/dang-nhap");
}
