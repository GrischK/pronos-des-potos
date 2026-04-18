-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "apiFootballLeagueId" INTEGER,
ADD COLUMN     "apiFootballSeason" INTEGER,
ADD COLUMN     "apiFootballLastSyncAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "apiFootballFixtureId" INTEGER;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "apiFootballTeamId" INTEGER;

-- CreateIndex
CREATE INDEX "Competition_apiFootballLeagueId_apiFootballSeason_idx" ON "Competition"("apiFootballLeagueId", "apiFootballSeason");

-- CreateIndex
CREATE UNIQUE INDEX "Team_competitionId_apiFootballTeamId_key" ON "Team"("competitionId", "apiFootballTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_competitionId_apiFootballFixtureId_key" ON "Match"("competitionId", "apiFootballFixtureId");
