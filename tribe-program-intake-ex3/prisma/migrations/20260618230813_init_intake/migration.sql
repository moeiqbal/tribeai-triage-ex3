-- CreateTable
CREATE TABLE "Intake" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budgetRange" TEXT NOT NULL,
    "timeline" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiStatus" TEXT NOT NULL DEFAULT 'pending',
    "aiSummary" TEXT,
    "aiTags" TEXT,
    "aiRiskChecklist" TEXT,
    "aiError" TEXT
);
