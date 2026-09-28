const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const clean = (v, n=8000) => String(v ?? "").trim().slice(0, n);

function instructions(mode) {
  const base = `You are the AI English teacher inside Safa Y Educational Center.
Teach clearly, patiently and practically. The learner may be an Afghan student.
Use simple international English. If the learner asks in Pashto, briefly explain difficult points in Pashto.
Do not claim to be a human. Keep responses useful and educational.`;
  return {
    chat: base + " This is conversation practice. Correct important errors gently and continue with a useful question.",
    speaking: base + " This is speaking coaching. Improve grammar, naturalness and pronunciation-friendly wording. Give a better version and one speaking challenge.",
    grammar: base + " This is grammar practice. Explain the rule simply, give examples, identify errors, and provide one exercise.",
    vocabulary: base + " This is vocabulary practice. Give meaning, part of speech, pronunciation help, examples and one practice question."
  }[mode] || base;
}

app.get("/api/health", (req,res) => res.json({
  ok:true,
  app:"Safa Y Educational Center",
  aiConfigured:Boolean(process.env.OPENAI_API_KEY),
  model:MODEL
}));

app.post("/api/chat", async (req,res) => {
  try {
    if (!process.env.OPENAI_API_KEY)
      return res.status(500).json({error:"OPENAI_API_KEY is not configured on the server."});

    const mode = ["chat","speaking","grammar","vocabulary"].includes(req.body?.mode)
      ? req.body.mode : "chat";
    const message = clean(req.body?.message);
    if (!message) return res.status(400).json({error:"Message is required."});

    const history = Array.isArray(req.body?.history)
      ? req.body.history.slice(-12).map(x => ({
          role:x.role === "assistant" ? "assistant" : "user",
          content:clean(x.content,3000)
        }))
      : [];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`
      },
      body:JSON.stringify({
        model:MODEL,
        instructions:instructions(mode),
        input:[...history,{role:"user",content:message}]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(data);
      return res.status(response.status).json({
        error:data?.error?.message || "AI request failed."
      });
    }
    res.json({reply:data.output_text || "No response received.",model:MODEL});
  } catch (e) {
    console.error(e);
    res.status(500).json({error:"Server error. Please try again."});
  }
});

app.get("*",(req,res)=>{
  res.sendFile(path.join(__dirname,"public","index.html"));
});

app.listen(PORT,()=>console.log(`Safa Y Educational Center running on ${PORT}`));
