CREATE TYPE "LayoutPreset" AS ENUM ('FREE', 'ZIMA', 'FOCUS', 'COMPACT');
ALTER TABLE "Dashboard" ADD COLUMN "layoutPreset" "LayoutPreset" NOT NULL DEFAULT 'FREE';
ALTER TABLE "LayoutItem" ADD COLUMN "preset" "LayoutPreset" NOT NULL DEFAULT 'FREE';
DROP INDEX IF EXISTS "LayoutItem_dashboardId_surface_idx";
CREATE INDEX "LayoutItem_dashboardId_surface_preset_idx" ON "LayoutItem"("dashboardId", "surface", "preset");
