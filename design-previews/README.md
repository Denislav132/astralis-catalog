# Design Preview Backups

This folder contains visual preview files and safe backups that are not part of the live app.

Current live hero backup:

- `Hero.backup-20260427-134913.tsx`

Current catalog backup:

- `catalog-backup-20260427-151112/page.tsx`
- `catalog-backup-20260427-151112/ProductCard.tsx`
- `catalog-backup-20260427-151112/CategoryFilters.tsx`

To restore the live hero exactly as it was at the time of the backup, replace:

- `src/components/Hero.tsx`

with:

- `design-previews/Hero.backup-20260427-134913.tsx`

To restore the catalog exactly as it was at the time of the backup, replace:

- `src/app/page.tsx`
- `src/components/ProductCard.tsx`
- `src/components/CategoryFilters.tsx`

with the matching files in:

- `design-previews/catalog-backup-20260427-151112/`
