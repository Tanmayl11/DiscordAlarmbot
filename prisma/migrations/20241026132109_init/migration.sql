-- CreateTable
CREATE TABLE "Alarm" (
    "id" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "dayNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executionTime" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Alarm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alarm_guildId_idx" ON "Alarm"("guildId");

-- CreateIndex
CREATE INDEX "Alarm_isActive_idx" ON "Alarm"("isActive");
