DELETE FROM "LayoutItem"
WHERE "surface" = 'WEB' AND "preset" = 'FREE';

WITH ranked AS (
  SELECT
    "id",
    "kind",
    ROW_NUMBER() OVER (PARTITION BY "dashboardId", "kind" ORDER BY "order", "id") - 1 AS position
  FROM "LayoutItem"
  WHERE "surface" = 'WEB' AND "preset" = 'ZIMA'
)
UPDATE "LayoutItem" AS layout
SET
  "preset" = 'FREE',
  "x" = (CASE WHEN ranked."kind" = 'WIDGET' THEN 0 ELSE 380 + (ranked.position % 4) * 126 END)::integer,
  "y" = (CASE WHEN ranked."kind" = 'WIDGET' THEN ranked.position * 132 ELSE FLOOR(ranked.position / 4.0) * 126 END)::integer,
  "w" = CASE WHEN ranked."kind" = 'WIDGET' THEN 340 ELSE 112 END,
  "h" = CASE WHEN ranked."kind" = 'WIDGET' THEN 116 ELSE 112 END
FROM ranked
WHERE layout."id" = ranked."id";

UPDATE "Dashboard"
SET "branding" = '{
  "backgroundColor": "#101416",
  "panelColor": "#181d20",
  "textColor": "#e7eaec",
  "borderColor": "#343b3f",
  "radius": 5,
  "panelOpacity": 100,
  "wallpaperOverlay": 55,
  "fontScale": 100
}'::jsonb || "branding";
