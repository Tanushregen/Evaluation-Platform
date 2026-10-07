-- Check-in process: a Pearson-style room check before the exam starts, verifying the
-- candidate's face is visible and the room is well-lit.
ALTER TABLE "Test"
ADD COLUMN "requireRoomCheck" BOOLEAN NOT NULL DEFAULT false;
