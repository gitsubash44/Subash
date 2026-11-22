(() => {
  "use strict";

  const list = document.getElementById("message-list");
  const alertBox = document.getElementById("page-alert");
  const searchInput = document.getElementById("search-input");
  const statusFilter = document.getElementById("status-filter");
  const dialog = document.getElementById("message-dialog");
  let messages = [];

  document.getElementById("year").textContent = new Date().getFullYear();

  function showAlert(message) {
    alertBox.textContent = message;
    alertBox.hidden = false;
  }

  function clearAlert() {
    alertBox.textContent = "";
    alertBox.hidden = true;
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(options.body ? { "Content-Type": "application/json" } : {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Admin access is required. Sign in with your authorized Cloudflare Access account, then refresh this page.");
      }
      throw new Error(data.error || "The request could not be completed.");
    }
    return data;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatDate(value) {
    if (!value) return "Date unavailable";
    const date = new Date(value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z"));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  function updateStats(stats) {
    document.getElementById("total-count").textContent = stats.total ?? 0;
    document.getElementById("unread-count").textContent = stats.unread ?? 0;
    document.getElementById("replied-count").textContent = stats.replied ?? 0;
  }

  function makeButton(label, className, handler) {
    const button = element("button", "btn " + className, label);
    button.type = "button";
    button.addEventListener("click", handler);
    return button;
  }

  function openMessage(message) {
    document.getElementById("dialog-subject").textContent = message.subject;
    document.getElementById("dialog-name").textContent = message.name;
    document.getElementById("dialog-email").textContent = message.email;
    document.getElementById("dialog-date").textContent = formatDate(message.created_at);
    document.getElementById("dialog-message").textContent = message.message;
    const reply = document.getElementById("dialog-reply");
    reply.href = "mailto:" + encodeURIComponent(message.email) +
      "?subject=" + encodeURIComponent("Re: " + message.subject);
    document.getElementById("dialog-mark-read").onclick = async () => {
      await updateStatus(message.id, "read");
      dialog.close();
    };
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  function render() {
    const query = searchInput.value.trim().toLowerCase();
    const filter = statusFilter.value;
    const visible = messages.filter(message => {
      const matchesStatus = filter === "all" || message.status === filter;
      const haystack = [message.name, message.email, message.subject, message.message].join(" ").toLowerCase();
      return matchesStatus && haystack.includes(query);
    });

    list.replaceChildren();
    document.getElementById("result-count").textContent =
      visible.length + " of " + messages.length + " messages";

    if (!visible.length) {
      const empty = element("div", "empty-state");
      empty.append(
        element("i", "bi bi-inbox"),
        element("h3", " ", messages.length ? "No matching messages" : "Your inbox is empty"),
        element("p", " ", messages.length ? "Try another search or status filter." : "New contact form submissions will appear here.")
      );
      list.append(empty);
      return;
    }

    visible.forEach(message => {
      const row = element("article", "message-row");
      const main = element("div", "message-main");
      main.tabIndex = 0;
      main.setAttribute("role", "button");
      main.setAttribute("aria-label", "View message from " + message.name);

      const topline = element("div", "message-topline");
      topline.append(
        element("span", "message-name", message.name),
        element("span", "message-email", message.email),
        element("span", "status-badge status-" + message.status, message.status)
      );
      main.append(
        topline,
        element("p", "message-subject", message.subject),
        element("p", "message-preview", message.message.length > 180 ? message.message.slice(0, 180) + "…" : message.message),
        element("p", "message-date", formatDate(message.created_at))
      );
      main.addEventListener("click", () => openMessage(message));
      main.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openMessage(message);
        }
      });

      const actions = element("div", "message-actions");
      const statusButton = makeButton(
        message.status === "unread" ? "Mark read" : "Mark unread",
        "btn-outline-secondary",
        () => updateStatus(message.id, message.status === "unread" ? "read" : "unread")
      );
      const reply = element("a", "btn btn-outline-primary", "Reply");
      reply.href = "mailto:" + encodeURIComponent(message.email) +
        "?subject=" + encodeURIComponent("Re: " + message.subject);
      reply.addEventListener("click", () => {
        if (message.status !== "replied") updateStatus(message.id, "replied");
      });
      const remove = makeButton("Delete", "btn-outline-danger", () => deleteMessage(message.id));
      actions.append(statusButton, reply, remove);
      row.append(main, actions);
      list.append(row);
    });
  }

  async function loadMessages() {
    clearAlert();
    list.replaceChildren(element("div", "empty-state", "Loading messages…"));
    try {
      const data = await api("/api/messages");
      messages = Array.isArray(data.messages) ? data.messages : [];
      updateStats(data.stats || {});
      document.getElementById("admin-email").textContent = data.adminEmail || "Authorized administrator";
      render();
    } catch (error) {
      messages = [];
      list.replaceChildren();
      showAlert(error.message);
      document.getElementById("result-count").textContent = "Inbox unavailable";
    }
  }

  async function updateStatus(id, status) {
    try {
      await api("/api/messages", {
        method: "PATCH",
        body: JSON.stringify({ id, status })
      });
      await loadMessages();
    } catch (error) {
      showAlert(error.message);
    }
  }

  async function deleteMessage(id) {
    if (!window.confirm("Delete this contact message permanently?")) return;
    try {
      await api("/api/messages?id=" + encodeURIComponent(id), { method: "DELETE" });
      await loadMessages();
    } catch (error) {
      showAlert(error.message);
    }
  }

  function csvCell(value) {
    return '"' + String(value ?? "").replace(/"/g, '""') + '"';
  }

  function exportCsv() {
    const headers = ["ID", "Name", "Email", "Subject", "Message", "Status", "Received"];
    const rows = messages.map(message => [
      message.id, message.name, message.email, message.subject,
      message.message, message.status, message.created_at
    ]);
    const csv = [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = element("a");
    anchor.href = url;
    anchor.download = "subash-contact-messages.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  document.getElementById("refresh-btn").addEventListener("click", loadMessages);
  document.getElementById("export-btn").addEventListener("click", exportCsv);
  searchInput.addEventListener("input", render);
  statusFilter.addEventListener("change", render);
  document.getElementById("dialog-close").addEventListener("click", () => dialog.close());

  loadMessages();
})();