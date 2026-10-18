// Vercel serverless function: answers one fixed question per call.
// Visitors can only pick a question number, never type their own prompt.

const QUESTIONS = [
  { q: "What does Kemira do?",
    ref: "Global leader in sustainable chemistry for water-intensive industries." },
  { q: "What are Kemira's sustainability initiatives?",
    ref: "Not covered by the reference sheet. Check kemira.com." },
  { q: "Who are Kemira's customers?",
    ref: "Municipal and industrial water treatment companies, and the fiber industry. [verify on kemira.com]" },
  { q: "Who are Kemira's competitors?",
    ref: "Companies do not publish competitor lists, so this cannot be confirmed from kemira.com." },
  { q: "How large is Kemira in terms of revenue and employees?",
    ref: "2025: revenue EUR 2.8 billion, 4,911 employees. [verify on kemira.com]" },
];

module.exports = async (req, res) => {
  const i = Number(req.query.i);
  if (!Number.isInteger(i) || i < 0 || i >= QUESTIONS.length) {
    return res.status(400).json({ error: "Invalid question index" });
  }
  const item = QUESTIONS[i];

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini", // check current names in the OpenAI docs
        max_tokens: 350,
        messages: [{ role: "user", content: item.q }],
      }),
    });

    if (!r.ok) {
      return res.status(502).json({ error: `OpenAI request failed (${r.status})` });
    }
    const data = await r.json();

    // Only successful answers are cached (24 h at Vercel's CDN).
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({
      total: QUESTIONS.length,
      question: item.q,
      answer: data.choices[0].message.content,
      reference: item.ref,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: "Request failed" });
  }
};