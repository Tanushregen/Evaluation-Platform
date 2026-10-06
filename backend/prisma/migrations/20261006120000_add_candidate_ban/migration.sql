-- Per-test violation/ban email template (sent when an admin force-submits a candidate as a
-- proctoring-violation ban, instead of the normal completion email).
ALTER TABLE "Test"
ADD COLUMN "banEmailSubject" TEXT,
ADD COLUMN "banEmailBody" TEXT,
ADD COLUMN "normalBrowserBanEmailSubject" TEXT,
ADD COLUMN "normalBrowserBanEmailBody" TEXT;

-- Marks an attempt as force-submitted specifically as a proctoring-violation ban, distinct
-- from an ordinary "candidate went quiet" force-submit.
ALTER TABLE "TestAttempt"
ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "banReason" TEXT,
ADD COLUMN "bannedAt" TIMESTAMP(3);
