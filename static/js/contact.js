(() => {
  "use strict";

  const form = document.getElementById("contact-form");
  if (!form) return;

  const resultBox = document.getElementById("contact-result");
  const submitButton = document.getElementById("contact-submit");

  function showMessage(message, type) {
    resultBox.className = "alert alert-" + type + " mb-3";
    resultBox.textContent = message;
    resultBox.style.display = "block";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      subject: form.elements.subject.value.trim(),
      message: form.elements.message.value.trim(),
      website: form.elements.website.value.trim()
    };

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    resultBox.style.display = "none";

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Your message could not be sent. Please try again.");
      }

      form.reset();
      showMessage("Thank you! Your message has been sent successfully. I will get back to you soon.", "success");
    } catch (error) {
      showMessage(error.message || "Something went wrong. Please try again later.", "danger");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send Message";
    }
  });
})();