const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });

function adminEmail(request, env) {
  // This header is supplied by Cloudflare Access after the request passes
  // an Access policy protecting /admin.html and /api/messages*.
  const email = (request.headers.get("Cf-Access-Authenticated-User-Email") || "")
    .trim()
    .toLowerCase();

  const allowed = String(env.ADMIN_EMAILS || "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  if (!email || !allowed.includes(email)) return null;
  return email;
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function onRequestGet({ request, env }) {
  const email = adminEmail(request, env);
  if (!email) return json({ error: "Unauthorized. Sign in through the admin access page." }, 401);
  if (!env.DB) return json({ error: "Database binding DB is missing." }, 503);

  try {
    const [messageRows, statsRow] = await Promise.all([
      env.DB.prepare(
        "SELECT id, name, email, subject, message, status, created_at FROM messages ORDER BY id DESC LIMIT 250"
      ).all(),
      env.DB.prepare(
        "SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END), 0) AS unread, COALESCE(SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END), 0) AS replied FROM messages"
      ).first()
    ]);

    return json({
      adminEmail: email,
      messages: messageRows.results || [],
      stats: statsRow || { total: 0, unread: 0, replied: 0 }
    });
  } catch (error) {
    return json({ error: "Unable to load messages." }, 500);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!adminEmail(request, env)) return json({ error: "Unauthorized." }, 401);
  if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);

  try {
    const data = await request.json();
    const id = Number(data.id);
    const status = String(data.status || "");

    if (!Number.isSafeInteger(id) || id < 1 ||
        !["unread", "read", "replied"].includes(status)) {
      return json({ error: "Invalid message or status." }, 400);
    }

    const result = await env.DB.prepare(
      "UPDATE messages SET status = ? WHERE id = ?"
    ).bind(status, id).run();

    if (!result.meta || result.meta.changes === 0) {
      return json({ error: "Message not found." }, 404);
    }

    return json({ success: true });
  } catch (error) {
    return json({ error: "Unable to update message." }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!adminEmail(request, env)) return json({ error: "Unauthorized." }, 401);
  if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);

  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isSafeInteger(id) || id < 1) {
      return json({ error: "Invalid message ID." }, 400);
    }

    const result = await env.DB.prepare(
      "DELETE FROM messages WHERE id = ?"
    ).bind(id).run();

    if (!result.meta || result.meta.changes === 0) {
      return json({ error: "Message not found." }, 404);
    }

    return json({ success: true });
  } catch (error) {
    return json({ error: "Unable to delete message." }, 500);
  }
}