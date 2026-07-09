# Lechest Blog

A warm, high-texture personal blog for Johnny Zeppelin Lechest, designed around a snow-night cabin, firelight, quiet essays, and a short romantic pixel game.

## What is included

- Static GitHub Pages site in `site/`
- Cozy responsive UI with generated hero and avatar assets
- Blog posts loaded from `site/content/posts.json`
- Owner Studio for publishing posts through the GitHub REST API
- Pixel game tab with a short win condition and a final "I love you" scene
- Visitor map UI with live current-location plotting and an optional backend hook
- Anonymous comment adapter prepared for Cusdis

## Deploy

Push this repository to `johnnyZeppelin/Lechest-Blog` on the `main` branch. The included GitHub Actions workflow deploys `site/` to GitHub Pages.

Expected URL:

```text
https://johnnyzeppelin.github.io/Lechest-Blog/
```

If Pages does not start automatically, open the repository on GitHub, go to Settings > Pages, and select GitHub Actions as the source.

## Owner Studio

The site is static, so it cannot keep a private OAuth secret. The owner publishing flow uses a GitHub fine-grained personal access token that stays in the browser.

Create a fine-grained token with:

- Resource owner: `johnnyZeppelin`
- Repository access: only `Lechest-Blog`
- Permissions: Contents read and write, Metadata read-only

Then open the Studio tab, paste the token, connect GitHub, write a post, and publish. The page verifies that the token belongs to `johnnyZeppelin` before allowing updates.

## Anonymous Comments

GitHub Pages cannot safely accept anonymous writes by itself. To enable public guest comments, create a Cusdis project and paste its app id into `site/config.js`:

```js
cusdis: {
  host: "https://cusdis.com",
  appId: "YOUR_CUSDIS_APP_ID"
}
```

Until then, the comment area stores local browser notes only.

## Visitor Map

The map can show the current visitor using a public IP-location lookup. Persistent visitor history needs a tiny backend. Add an endpoint to `site/config.js`:

```js
visitorEndpoint: "https://your-endpoint.example/visits"
```

The endpoint contract is:

- `POST` accepts `{ city, country, lat, lon }`
- `GET` returns `[{ city, country, lat, lon }]`

Cloudflare Workers, Supabase Edge Functions, or a small serverless function all work well.
