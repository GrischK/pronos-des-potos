-- CreateEnum
CREATE TYPE "ExternalDataProvider" AS ENUM ('THE_SPORTS_DB', 'FOOTBALL_DATA');

-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "externalProvider" "ExternalDataProvider",
ADD COLUMN     "externalCompetitionId" TEXT,
ADD COLUMN     "externalSeason" TEXT,
ADD COLUMN     "externalLastSyncAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "externalTeamId" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "externalMatchId" TEXT;

-- CreateIndex
CREATE INDEX "Competition_externalProvider_externalCompetitionId_externalSeason_idx" ON "Competition"("externalProvider", "externalCompetitionId", "externalSeason");

-- CreateIndex
CREATE UNIQUE INDEX "Team_competitionId_externalTeamId_key" ON "Team"("competitionId", "externalTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_competitionId_externalMatchId_key" ON "Match"("competitionId", "externalMatchId");
