ALTER TABLE "LayoutItem" ADD COLUMN "elementKey" TEXT;

UPDATE "LayoutItem"
SET "y" = "y" + 84
WHERE "surface" = 'WEB' AND "preset" = 'FREE';

INSERT INTO "LayoutItem" ("id", "surface", "preset", "kind", "x", "y", "w", "h", "order", "dashboardId", "elementKey")
SELECT concat('chrome_', md5(random()::text || clock_timestamp()::text || d."id" || e.key)),
       'WEB'::"Surface", 'FREE'::"LayoutPreset", 'DASHBOARD_ELEMENT'::"ItemKind",
       e.x,
       CASE WHEN e.key = 'FOOTER' THEN (
         SELECT COALESCE(MAX(li."y" + li."h"), 796) + 24
         FROM "LayoutItem" li
         WHERE li."dashboardId" = d."id" AND li."surface" = 'WEB' AND li."preset" = 'FREE'
       ) ELSE e.y END,
       e.w, e.h, 1000 + e.ord, d."id", e.key
FROM "Dashboard" d
CROSS JOIN (VALUES
  ('BRAND', 0, 4, 230, 64, 1),
  ('CLOCK', 250, 4, 100, 64, 2),
  ('WEATHER', 370, 4, 210, 64, 3),
  ('SEARCH', 600, 12, 480, 44, 4),
  ('ACTIONS', 1100, 8, 160, 52, 5),
  ('ADD', 1280, 8, 52, 52, 6),
  ('FOOTER', 0, 820, 1332, 30, 7)
) AS e(key, x, y, w, h, ord);
