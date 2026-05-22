ALTER TABLE "CompetitionBonusPrediction"
ALTER COLUMN "winnerTeamId" DROP NOT NULL,
ALTER COLUMN "secondTeamId" DROP NOT NULL,
ALTER COLUMN "thirdTeamId" DROP NOT NULL;

ALTER TABLE "CompetitionBonusPrediction" DROP CONSTRAINT "CompetitionBonusPrediction_winnerTeamId_fkey";
ALTER TABLE "CompetitionBonusPrediction" DROP CONSTRAINT "CompetitionBonusPrediction_secondTeamId_fkey";
ALTER TABLE "CompetitionBonusPrediction" DROP CONSTRAINT "CompetitionBonusPrediction_thirdTeamId_fkey";

ALTER TABLE "CompetitionBonusPrediction"
ADD CONSTRAINT "CompetitionBonusPrediction_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompetitionBonusPrediction"
ADD CONSTRAINT "CompetitionBonusPrediction_secondTeamId_fkey" FOREIGN KEY ("secondTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompetitionBonusPrediction"
ADD CONSTRAINT "CompetitionBonusPrediction_thirdTeamId_fkey" FOREIGN KEY ("thirdTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
