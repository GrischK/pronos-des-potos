-- AlterTable
ALTER TABLE "Competition"
ADD COLUMN "bonusEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bonusWinnerTeamId" TEXT,
ADD COLUMN "bonusSecondTeamId" TEXT,
ADD COLUMN "bonusThirdTeamId" TEXT;

-- CreateTable
CREATE TABLE "CompetitionBonusPrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "winnerTeamId" TEXT NOT NULL,
    "secondTeamId" TEXT NOT NULL,
    "thirdTeamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionBonusPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionBonusPrediction_userId_competitionId_key" ON "CompetitionBonusPrediction"("userId", "competitionId");

-- CreateIndex
CREATE INDEX "CompetitionBonusPrediction_competitionId_idx" ON "CompetitionBonusPrediction"("competitionId");

-- AddForeignKey
ALTER TABLE "CompetitionBonusPrediction" ADD CONSTRAINT "CompetitionBonusPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionBonusPrediction" ADD CONSTRAINT "CompetitionBonusPrediction_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionBonusPrediction" ADD CONSTRAINT "CompetitionBonusPrediction_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionBonusPrediction" ADD CONSTRAINT "CompetitionBonusPrediction_secondTeamId_fkey" FOREIGN KEY ("secondTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionBonusPrediction" ADD CONSTRAINT "CompetitionBonusPrediction_thirdTeamId_fkey" FOREIGN KEY ("thirdTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_bonusWinnerTeamId_fkey" FOREIGN KEY ("bonusWinnerTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_bonusSecondTeamId_fkey" FOREIGN KEY ("bonusSecondTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_bonusThirdTeamId_fkey" FOREIGN KEY ("bonusThirdTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
