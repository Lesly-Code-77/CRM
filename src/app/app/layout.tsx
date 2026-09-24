import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BottomNav } from "@/components/BottomNav";

export default async function SalesLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser("sales");
  const pending = await db.voiceNote.count({ where: { userId: user.id, status: "A_VALIDER" } });
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-28">
      {children}
      <BottomNav pending={pending} />
    </div>
  );
}
