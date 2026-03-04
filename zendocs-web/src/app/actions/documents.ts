"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type DocumentRow = {
    id: string;
    name: string;
    content: string | null;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
};

/** Load all documents for the currently authenticated user */
export async function loadDocuments(): Promise<DocumentRow[]> {
    const { userId } = await auth();
    if (!userId) return [];

    const rows = await db
        .select()
        .from(documents)
        .where(eq(documents.userId, userId))
        .orderBy(documents.createdAt);

    return rows;
}

/** Upsert a document (insert or update on conflict) */
export async function saveDocument(doc: {
    id: string;
    name: string;
    content: string;
    description?: string;
}): Promise<void> {
    const { userId } = await auth();
    if (!userId) throw new Error("Not authenticated");

    await db
        .insert(documents)
        .values({
            id: doc.id,
            userId,
            name: doc.name,
            content: doc.content,
            description: doc.description ?? null,
            updatedAt: new Date(),
        })
        .onConflictDoUpdate({
            target: documents.id,
            set: {
                content: doc.content,
                name: doc.name,
                description: doc.description ?? null,
                updatedAt: new Date(),
            },
        });
}

/** Delete a document owned by the current user */
export async function deleteDocument(id: string): Promise<void> {
    const { userId } = await auth();
    if (!userId) throw new Error("Not authenticated");

    await db
        .delete(documents)
        .where(and(eq(documents.id, id), eq(documents.userId, userId)));
}
