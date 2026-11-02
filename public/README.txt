ScamLens brand assets

Files:
- favicon.ico: multi-size browser favicon
- favicon-16.png, favicon-32.png, favicon-64.png: small browser icons
- favicon-192.png, favicon-512.png: app/PWA icon sizes
- scamlens-logo-optimized.jpg: optimized copy of the supplied logo
- scamlens-og-image.png / .jpg: 1200x630 social sharing preview

Recommended placement:
Copy the favicon files and scamlens-og-image.png into your project's public/ folder.
Keep the existing public/scamlens-logo.png until the app references are updated and tested.
Then add/update the relevant tags in index.html (do not duplicate existing tags):
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
<meta property="og:type" content="website">
<meta property="og:title" content="ScamLens | Look Closer. Stay Safer.">
<meta property="og:description" content="Understand suspicious messages before you click, pay, or reply.">
<meta property="og:image" content="https://scam-lensai.vercel.app/scamlens-og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="ScamLens | Look Closer. Stay Safer.">
<meta name="twitter:description" content="Understand suspicious messages before you click, pay, or reply.">
<meta name="twitter:image" content="https://scam-lensai.vercel.app/scamlens-og-image.png">

Do not replace existing index.html metadata blindly. Merge these tags into the existing <head> and check for duplicates.
