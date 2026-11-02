import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Vào chùa | Chùa Hóa Học" };

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="dang-nhap" />
    </Suspense>
  );
}
