CREATE TABLE "Section" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "dashboardId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "Section" ADD CONSTRAINT "Section_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Section_dashboardId_idx" ON "Section"("dashboardId");
ALTER TABLE "Application" ADD COLUMN "sectionId" TEXT;
ALTER TABLE "Application" ADD CONSTRAINT "Application_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Application_sectionId_idx" ON "Application"("sectionId");
ALTER TABLE "LayoutItem" ADD COLUMN "sectionId" TEXT;
ALTER TABLE "LayoutItem" ADD CONSTRAINT "LayoutItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
