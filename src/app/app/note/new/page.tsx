import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { NoteRecorder } from "@/components/NoteRecorder";
import { demoTranscriptFor } from "@/lib/demo/transcripts";
import { fmtTime } from "@/lib/format";

export const metadata = { title: "Nouvelle note" };

export default async function NewNotePage({ searchParams }: PageProps<"/app/note/new">) {
  const user = await requireUser("sales");
  const sp = await searchParams;
  const visitId = typeof sp.visit === "string" ? sp.visit : undefined;
  const visit = visitId ? await db.visit.findFirst({ where: { id: visitId, userId: user.id }, include: { account: true } }) : null;
  const accountId = visit?.accountId ?? (typeof sp.account === "string" ? sp.account : undefined);

  const accounts = await db.account.findMany({
    where: { orgId: user.orgId },
    select: { id: true, name: true, city: true, ownerId: true },
    orderBy: { name: "asc" },
  });
  const mine = accounts.filter((a) => a.ownerId === user.id);
  const others = accounts.filter((a) => a.ownerId !== user.id);

  return (
    <>
      <PageHeader
        title="Nouvelle note"
        subtitle={visit ? `Rendez-vous de ${fmtTime(visit.startsAt)} · ${visit.account.name}` : "Dictez votre compte rendu de visite"}
        back={visit ? "/app" : undefined}
      />
      <NoteRecorder
        mine={mine}
        others={others}
        defaultAccountId={accountId}
        visitId={visit?.id}
        demoTranscript={demoTranscriptFor(accountId ?? user.id)}
        demoMode={process.env.DEMO_MODE !== "false"}
      />
    </>
  );
}
