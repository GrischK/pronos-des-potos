-- Allow knockout fixtures to be imported before teams are known.
ALTER TABLE "Match" ADD COLUMN "homePlaceholder" TEXT,
ADD COLUMN "awayPlaceholder" TEXT;

ALTER TABLE "Match" ALTER COLUMN "homeTeamId" DROP NOT NULL;
ALTER TABLE "Match" ALTER COLUMN "awayTeamId" DROP NOT NULL;
