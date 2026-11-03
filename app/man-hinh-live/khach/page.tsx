import { redirect } from "next/navigation";
import LiveKhach from "@/components/LiveKhach";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Chùa live | Chùa Hóa Học" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap?tiep=/man-hinh-live/khach");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/chanh-dien");
  return <LiveKhach />;
}
