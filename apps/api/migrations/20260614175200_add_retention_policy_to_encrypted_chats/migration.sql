-- AlterTable
ALTER TABLE "encrypted_chats"
ADD COLUMN "retentionDays" INTEGER,
ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "encrypted_chats_expiresAt_idx" ON "encrypted_chats"("expiresAt");
