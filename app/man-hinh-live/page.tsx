import { redirect } from "next/navigation";
import ManHinhLive from "@/components/ManHinhLive";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Màn hình live | Chùa Hóa Học" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap?tiep=/man-hinh-live");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/chanh-dien");
  return <ManHinhLive />;
}
