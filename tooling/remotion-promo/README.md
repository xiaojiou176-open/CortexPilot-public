# OpenVibeCoding Remotion Promo

Repo-owned source for a short OpenVibeCoding promo video.

This folder is intentionally standalone so we can iterate on public-facing video
assets without expanding the main workspace graph.

## Commands

```bash
pnpm --dir tooling/remotion-promo install
pnpm --dir tooling/remotion-promo studio
pnpm --dir tooling/remotion-promo render:poster
pnpm --dir tooling/remotion-promo render:mp4
```

## Outputs

- Poster: `docs/assets/storefront/openvibecoding-command-tower-teaser-poster.png`
- MP4: `docs/assets/storefront/openvibecoding-command-tower-teaser.mp4`

Both assets now belong to the tracked public storefront surface. Render into the
repo-owned outputs above, then review size, readability, and truthfulness
before calling the asset live on a public front door.
