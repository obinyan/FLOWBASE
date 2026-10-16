import LeadsTable from "@/components/LeadsTable";

export const metadata = { title: "Leads – Flowbase" };

export default async function LeadsPage({ searchParams }) {
  const params = await searchParams;
  return <LeadsTable initialQuery={params?.search || ""} initialPriority={params?.filter === "priority"} />;
}
