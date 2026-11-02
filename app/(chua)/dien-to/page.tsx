import DienTo from "@/components/DienTo";

export const metadata = { title: "Điện Tổ | Chùa Hóa Học" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <DienTo aiEnabled={(process.env.ANTHROPIC_API_KEY ?? "").startsWith("sk-")} />;
}
