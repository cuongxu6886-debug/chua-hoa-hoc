import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Nhập môn | Chùa Hóa Học" };

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="dang-ky" />
    </Suspense>
  );
}
