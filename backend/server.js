import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import sgMail from "@sendgrid/mail";
import sgClient from "@sendgrid/client";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgClient.setApiKey(process.env.SENDGRID_API_KEY);

// Configure Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

function isValidEmail(email) {
  const re = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return re.test(email);
}

// Helper function to add user to SendGrid list
async function addToSendGridList(email, listId) {
  const request = {
    url: "/v3/marketing/contacts",
    method: "PUT",
    body: {
      list_ids: [listId],
      contacts: [{ email }],
    },
  };

  try {
    const [response, body] = await sgClient.request(request);
    console.log("Added to list successfully", response.statusCode);
    return true;
  } catch (err) {
    console.error("Failed to add to list:", err.response ? err.response.body : err);
    return false;
  }
}

// API route
app.post("/send-email", async (req, res) => {
  const { email, chain } = req.body;

  if (!email || !chain || !isValidEmail(email)) {
    return res.status(400).json({ error: "Valid email and chain are required" });
  }

  // 1️⃣ Store user input in Supabase first
  try {
    const { data, error } = await supabase
      .from("user_inputs")
      .insert([{ email, chain }]);

    if (error) {
      console.error("Supabase insert error:", error);
    } else {
      console.log("User input stored in Supabase:", data);
    }
  } catch (err) {
    console.error("Unexpected Supabase error:", err);
  }

  // 2️⃣ Prepare SendGrid email
  const msg = {
    to: email,
    from: process.env.SENDGRID_VERIFIED_SENDER, 
    subject: `Developer Health Report for ${chain}`,
    text: `Here are the results for your chosen chain: ${chain}.`,
    html: `<h2>Developer Health Report</h2>
           <p>You selected: <strong>${chain}</strong></p>
           <p>Stay tuned for more insights!</p>`,
  };

  // 3️⃣ Send email and add to SendGrid list
  try {
    if (process.env.NODE_ENV === "production") {
      await sgMail.send(msg);
      await addToSendGridList(email, process.env.SENDGRID_LIST_ID);
    } else {
      console.log(`DEV MODE: Would send email to ${email}`);
      console.log(`DEV MODE: Would add ${email} to SendGrid list ${process.env.SENDGRID_LIST_ID}`);
    }

    res.json({ success: true, message: "Data stored and email processed!" });
  } catch (error) {
    if (error.response) {
      console.error("SendGrid error:", error.response.body);
    } else {
      console.error("Unexpected SendGrid error:", error);
    }
    res.status(500).json({ error: "Failed to send email" });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
