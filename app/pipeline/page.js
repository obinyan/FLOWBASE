import { redirect } from "next/navigation";

export const metadata = { title: "Pipeline – Flowbase" };

export default function PipelinePage() {
  redirect("/workspace?tab=pipeline");
}
