const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) {
      return json({ error: "Contact service is not configured yet." }, 503);
    }

    const origin = request.headers.get("Origin");
    const requestOrigin = new URL(request.url).origin;
    if (origin && origin !== requestOrigin) {
      return json({ error: "Invalid request origin." }, 403);
    }

    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return json({ error: "Please submit the form using the website." }, 415);
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 12000) {
      return json({ error: "Your message is too large." }, 413);
    }

    let data;
    try {
      data = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid form submission." }, 400);
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return json({ error: "Invalid form submission." }, 400);
    }
    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const subject = String(data.subject || "").trim();
    const message = String(data.message || "").trim();
    const website = String(data.website || "").trim();

    // Honeypot: silently accept automated submissions without storing them.
    if (website) return json({ success: true }, 201);

    if (!name || !email || !subject || !message) {
      return json({ error: "Please complete all fields." }, 400);
    }

    if (
      name.length > 100 ||
      email.length > 254 ||
      subject.length > 200 ||
      message.length > 5000 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return json({ error: "Please check your details and try again." }, 400);
    }

    await env.DB.prepare(
      "INSERT INTO messages (name, email, subject, message, status) VALUES (?, ?, ?, ?, 'unread')"
    ).bind(name, email, subject, message).run();

    return json({ success: true }, 201);
  } catch (error) {
    return json({ error: "The message could not be saved. Please try again later." }, 500);
  }
}