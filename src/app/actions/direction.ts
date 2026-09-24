"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const taskInput = z.object({
  title: z.string().trim().min(3),
  details: z.string().trim().optional(),
  assigneeId: z.string().min(1),
  accountId: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["BASSE", "NORMALE", "HAUTE"]),
});

/** La direction confie une tâche à un commercial. */
export async function assignTask(formData: FormData) {
  const manager = await requireUser("direction");
  const data = taskInput.parse({
    title: formData.get("title"),
    details: formData.get("details") || undefined,
    assigneeId: formData.get("assigneeId"),
    accountId: formData.get("accountId") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    priority: formData.get("priority") || "NORMALE",
  });
  const assignee = await db.user.findFirst({ where: { id: data.assigneeId, orgId: manager.orgId } });
  if (!assignee) throw new Error("Commercial introuvable");
  const account = data.accountId ? await db.account.findFirst({ where: { id: data.accountId, orgId: manager.orgId } }) : null;

  const task = await db.task.create({
    data: {
      orgId: manager.orgId,
      title: data.title,
      details: data.details,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(`${data.dueDate}T12:00:00`) : null,
      assigneeId: assignee.id,
      createdById: manager.id,
      accountId: account?.id ?? null,
      source: "DIRECTION",
    },
  });
  await db.auditLog.create({ data: { orgId: manager.orgId, userId: manager.id, action: "task.assigned", entity: "Task", entityId: task.id } });
  revalidatePath("/direction", "layout");
}

export async function cancelTask(taskId: string) {
  const manager = await requireUser("direction");
  await db.task.updateMany({ where: { id: taskId, orgId: manager.orgId, status: "A_FAIRE" }, data: { status: "ANNULEE" } });
  revalidatePath("/direction", "layout");
}
