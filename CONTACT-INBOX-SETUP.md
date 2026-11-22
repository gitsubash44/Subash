# Contact inbox integration (Cloudflare Pages)

This feature is on the branch \`feature/cloudflare-contact-inbox\`. It is not live until the branch is merged/deployed and the Cloudflare resources below are configured.

## Files added or updated

- \`index.html\`: replaces the simulated success message with a real form submission to \`/api/contact\`.
- \`static/js/contact.js\`: submits the form and displays success/error feedback.
- \`functions/api/contact.js\`: validates and stores public submissions in D1.
- \`functions/api/messages.js\`: lists, updates, and deletes messages for the protected inbox.
- \`admin.html\`, \`static/css/admin.css\`, \`static/js/admin.js\`: responsive private inbox at \`/admin.html\`.
- \`database/contact-messages.sql\`: D1 schema.

## 1. Confirm Pages build settings

In Cloudflare Dashboard → Workers & Pages → your Pages project → Settings → Builds & deployments:

- Framework preset: **None** (only if this is a plain static HTML project).
- Build command: leave empty (only if the existing project does not require a build).
- Build output directory: the directory that contains the deployed \`index.html\`. For this repository's root-level \`index.html\`, use \`/\` or \`.\` as accepted by the Pages dashboard.
- Root directory: repository root.

Do not change an existing working build configuration if your current deployment uses a different output folder. Pages Functions must be included in the deployed output at the project root alongside the site's files.

## 2. Create the D1 database

1. Cloudflare Dashboard → Storage & databases → D1 SQL Database → Create.
2. Database name: \`subash-contact-messages\` (or another name you prefer).
3. Open the database → Console.
4. Copy and run all SQL from \`database/contact-messages.sql\`.

## 3. Bind D1 to Pages

1. Open your Pages project → Settings → Functions → D1 database bindings.
2. Add a binding:
   - Variable name: \`DB\`
   - D1 database: \`subash-contact-messages\`
3. Save and redeploy the project after adding the binding.

The function code expects the binding name to be exactly \`DB\`.

## 4. Protect the admin page with Cloudflare Access

The public contact endpoint \`/api/contact\` must remain public. Protect both the dashboard and the messages API.

1. Cloudflare Zero Trust → Access → Applications → Add an application → Self-hosted.
2. Add an application covering your website hostname and these paths:
   - \`/admin.html\`
   - \`/api/messages*\`
3. Create an **Allow** policy limited to your own email address (and any other administrators you explicitly trust).
4. Make sure the policy covers every hostname that can serve the site, including the \`pages.dev\` hostname if it remains enabled. Alternatively, disable the \`pages.dev\` hostname if you do not need it.
5. Keep \`/api/contact\` outside this Access application so visitors can submit the public form.

The messages API additionally checks the Cloudflare Access identity header against an allowlist. In Pages project → Settings → Variables and Secrets, add a production environment variable:

- Name: \`ADMIN_EMAILS\`
- Value: your authorized email address (lowercase). For multiple administrators, separate addresses with commas.

This value is an allowlist, not a password. Do not put administrator passwords, API keys, or secrets in browser JavaScript or in Git.

**Important:** the Access application and allow policy are required. Do not rely on the identity header check alone. Protect the Pages and custom-domain hostnames consistently so the API cannot be reached through an unprotected alternate hostname.

## 5. Deploy and test

1. Merge the pull request for \`feature/cloudflare-contact-inbox\` into the production branch after reviewing it.
2. Wait for Cloudflare Pages to finish the deployment.
3. Submit a test message from the live contact form.
4. Open the D1 Console and run:
   \`SELECT id, name, email, subject, status, created_at FROM messages ORDER BY id DESC LIMIT 10;\`
5. Sign in using the allowed email and open \`https://YOUR-DOMAIN/admin.html\`.
6. Test search, status changes, reply-by-email, CSV export, and delete.

## Security and operational notes

- The contact endpoint has server-side validation, a 12 KB request limit, same-origin checking when an Origin header is present, parameterized SQL, and a honeypot field.
- The inbox returns the latest 250 messages. CSV export exports the messages currently loaded into the dashboard.
- Cloudflare Access protects the private UI/API; use a narrow email allowlist and MFA/IdP controls where available.
- Before promoting this for high-volume public use, add Cloudflare Turnstile and/or a Cloudflare rate-limiting rule for \`POST /api/contact\`, plus an operational retention/backup policy for the D1 data.
- The dashboard marks a message as replied when the visitor clicks Reply (it opens the user's email app). It does not verify that an email was actually sent.
- No email notifications are configured in this version; messages are stored in D1 and viewed in the dashboard.
