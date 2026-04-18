-- Delete stale competitions created from the removed TheSportsDB provider.
-- Related teams, matches, predictions and players are removed explicitly to avoid
-- relying on mixed cascade/restrict constraints.
DELETE FROM "Prediction"
WHERE "matchId" IN (
    SELECT "id"
    FROM "Match"
    WHERE "competitionId" IN (
        SELECT "id"
        FROM "Competition"
        WHERE "externalProvider" = 'THE_SPORTS_DB'
    )
);

DELETE FROM "CompetitionPlayer"
WHERE "competitionId" IN (
    SELECT "id"
    FROM "Competition"
    WHERE "externalProvider" = 'THE_SPORTS_DB'
);

DELETE FROM "Match"
WHERE "competitionId" IN (
    SELECT "id"
    FROM "Competition"
    WHERE "externalProvider" = 'THE_SPORTS_DB'
);

DELETE FROM "Team"
WHERE "competitionId" IN (
    SELECT "id"
    FROM "Competition"
    WHERE "externalProvider" = 'THE_SPORTS_DB'
);

DELETE FROM "Competition"
WHERE "externalProvider" = 'THE_SPORTS_DB';

-- Remove THE_SPORTS_DB from the enum by recreating it.
ALTER TYPE "ExternalDataProvider" RENAME TO "ExternalDataProvider_old";

CREATE TYPE "ExternalDataProvider" AS ENUM ('FOOTBALL_DATA');

ALTER TABLE "Competition"
ALTER COLUMN "externalProvider" TYPE "ExternalDataProvider"
USING "externalProvider"::text::"ExternalDataProvider";

DROP TYPE "ExternalDataProvider_old";
