# Maternal Stress PROM Network

Interactive GitHub Pages network built from the supplied PROM classification table.

## Interpretation

- Each node is one PROM row.
- Node size represents the `Included record count` in the source table.
- Node colour represents the Stage 1 stress construct.
- A link joins two PROMs when their `Included records (author–year)` lists share at least one identifier.
- Link thickness represents the number of shared author–year records.

Counts are publication-record counts and may exceed the number of independent underlying studies when one study produced multiple publications.

## Publish with GitHub Pages

1. Create a GitHub repository and upload all files in this folder to its root.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder, then save.
5. Open the Pages URL after deployment completes.

The site uses Cytoscape.js from jsDelivr and does not require a server-side language or build step.
