const selectionDiv = document.getElementById("selection");
const emailFormDiv = document.getElementById("email-form");

document.getElementById("analyze-btn").addEventListener("click", () => {
  const chain = document.getElementById("chain").value;
  console.log(`Selected chain: ${chain}`);

  // Hide dropdown and button, show email form
  selectionDiv.style.display = "none";
  emailFormDiv.style.display = "block";
});

document.getElementById("send-btn").addEventListener("click", async () => {
  const emailInput = document.getElementById("email");
  const chain = document.getElementById("chain").value;
  const email = emailInput.value;

  if (!email) {
    alert("Please enter your email!");
    return;
  }

  try {
    const response = await fetch("http://localhost:5000/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, chain }),
    });

    const result = await response.json();

    if (result.success) {
      alert(`Results for ${chain} sent to ${email}`);

      // Reset form: hide email form, show selection
      emailFormDiv.style.display = "none";
      selectionDiv.style.display = "block";
      emailInput.value = ""; // clear email input
      document.getElementById("chain").selectedIndex = 0; // reset dropdown
    } else {
      alert("Failed to send email: " + result.error);
    }
  } catch (err) {
    console.error(err);
    alert("Error sending email.");
  }
});
