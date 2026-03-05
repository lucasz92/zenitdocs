"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { documents, vaults } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type DocumentRow = {
    id: string;
    name: string;
    content: string | null;
    description: string | null;
    vaultId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type VaultRow = {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type ServerResponse<T> = { success: true; data: T } | { success: false; error: string };

// ── DOCUMENTS ───────────────────────────────────────────────────────

export async function loadDocuments(): Promise<ServerResponse<DocumentRow[]>> {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, error: "Not authenticated" };
        const rows = await db.select().from(documents).where(eq(documents.userId, userId)).orderBy(documents.createdAt);
        return { success: true, data: rows };
    } catch (err: any) {
        return { success: false, error: err.message || "Unknown database error" };
    }
}

export async function saveDocument(doc: {
    id: string; name: string; content: string; description?: string; vaultId?: string | null;
}): Promise<ServerResponse<void>> {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, error: "Not authenticated" };
        await db.insert(documents).values({
            id: doc.id, userId, name: doc.name, content: doc.content,
            description: doc.description ?? null,
            vaultId: doc.vaultId ?? null,
            updatedAt: new Date(),
        }).onConflictDoUpdate({
            target: documents.id,
            set: {
                content: doc.content, name: doc.name,
                description: doc.description ?? null,
                vaultId: doc.vaultId ?? null,
                updatedAt: new Date(),
            },
        });
        return { success: true, data: undefined };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed to save document" };
    }
}

export async function deleteDocument(id: string): Promise<ServerResponse<void>> {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, error: "Not authenticated" };
        await db.delete(documents).where(and(eq(documents.id, id), eq(documents.userId, userId)));
        return { success: true, data: undefined };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed to delete document" };
    }
}

export async function updateDocument(
    id: string,
    fields: Partial<{ name: string; description: string | null; vaultId: string | null }>
): Promise<ServerResponse<void>> {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, error: "Not authenticated" };
        await db.update(documents)
            .set({ ...fields, updatedAt: new Date() })
            .where(and(eq(documents.id, id), eq(documents.userId, userId)));
        return { success: true, data: undefined };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed to update document" };
    }
}


export async function loadVaults(): Promise<ServerResponse<VaultRow[]>> {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, error: "Not authenticated" };
        const rows = await db.select().from(vaults).where(eq(vaults.userId, userId)).orderBy(vaults.createdAt);
        return { success: true, data: rows };
    } catch (err: any) {
        return { success: false, error: err.message || "Unknown database error" };
    }
}

export async function saveVault(vault: {
    id: string; name: string; color?: string; icon?: string;
}): Promise<ServerResponse<void>> {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, error: "Not authenticated" };
        await db.insert(vaults).values({
            id: vault.id, userId, name: vault.name,
            color: vault.color ?? 'blue',
            icon: vault.icon ?? '📁',
            updatedAt: new Date(),
        }).onConflictDoUpdate({
            target: vaults.id,
            set: { name: vault.name, color: vault.color ?? 'blue', icon: vault.icon ?? '📁', updatedAt: new Date() },
        });
        return { success: true, data: undefined };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed to save vault" };
    }
}

export async function deleteVault(id: string): Promise<ServerResponse<void>> {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, error: "Not authenticated" };
        // Move documents out of this vault, don't delete them
        await db.update(documents)
            .set({ vaultId: null })
            .where(and(eq(documents.vaultId, id), eq(documents.userId, userId)));
        await db.delete(vaults).where(and(eq(vaults.id, id), eq(vaults.userId, userId)));
        return { success: true, data: undefined };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed to delete vault" };
    }
}
