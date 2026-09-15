import { redirect } from "next/navigation";

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  redirect("/shop");
  return children;
}
