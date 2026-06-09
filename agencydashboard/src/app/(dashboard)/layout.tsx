import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

/** Persistent app shell: left sidebar + topbar wrapping every dashboard screen. */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
