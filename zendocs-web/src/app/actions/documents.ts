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


export type ServerResponse<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
};

/** Load all documents for the currently authenticated user */
export async function loadDocuments(): Promise<ServerResponse<DocumentRow[]>> {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, error: "Not authenticated" };

        const rows = await db
            .select()
            .from(documents)
            .where(eq(documents.userId, userId))
            .orderBy(documents.createdAt);

        return {
            success: true,
            data: rows
        };
    } catch (err: any) {
        console.error("Server Action 'loadDocuments' Error:", err);
        return {
            success: false,
            error: err.message || "Unknown database error"
        };
    }
}

/** Upsert a document (insert or update on conflict) */
export async function saveDocument(doc: {
    id: string;
    name: string;
    content: string;
    description?: string;
}): Promise<ServerResponse<void>> {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, error: "Not authenticated" };

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
        return { success: true, data: undefined };
    } catch (err: any) {
        console.error("Server Action 'saveDocument' Error:", err);
        return { success: false, error: err.message || "Failed to save document" };
    }
}

/** Delete a document owned by the current user */
export async function deleteDocument(id: string): Promise<ServerResponse<void>> {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, error: "Not authenticated" };

        await db
            .delete(documents)
            .where(and(eq(documents.id, id), eq(documents.userId, userId)));
        return { success: true, data: undefined };
    } catch (err: any) {
        console.error("Server Action 'deleteDocument' Error:", err);
        return { success: false, error: err.message || "Failed to delete document" };
    }
}
