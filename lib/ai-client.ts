import { generateText } from "ai";
import { getProviderModel, type ProviderName } from "@/lib/vercel-ai-setup";
import type { ConversationTurn } from "@/lib/memory-manager";
import { findMatchingAnswer } from "@/lib/knowledge-base";

const DEFAULT_SYSTEM_PROMPT = `You are a helpful, friendly voice assistant.
- Speak naturally like a human.
- Keep responses concise (3-5 seconds speech).
- If the user explicitly tells you their name, use it when appropriate. Otherwise, do not assume or invent a name.
- Remember key facts from the conversation.
- Match the user's language and tone.
- Pause naturally between sentences.
- Confirm understanding when needed.`;

function shouldUseGroundedSearch(userText: string) {
  const query = userText.toLowerCase();
  return /\b(today|current|latest|now|price|stock|weather|news|rate|gold|bitcoin|usd|exchange|inflation|market|date|day|time)\b/.test(
    query,
  );
}

async function getGeminiAnswer(args: {
  userText: string;
  history: ConversationTurn[];
  grounded: boolean;
}) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `${DEFAULT_SYSTEM_PROMPT}\n- If the user asks for current facts, dates, prices, or live information, use search-grounded answers when available.`,
            },
          ],
        },
        contents: [
          ...args.history.map((turn) => ({
            role: turn.role === "assistant" ? "model" : "user",
            parts: [{ text: turn.content }],
          })),
          {
            role: "user",
            parts: [{ text: args.userText }],
          },
        ],
        ...(args.grounded ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      }),
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  return text || null;
}

export async function generateAgentResponse(args: {
  provider: ProviderName;
  model?: string;
  userText: string;
  language: string;
  history: ConversationTurn[];
}) {
  // Use Gemini with search grounding first for time-sensitive questions so generic FAQ keywords do not win.
  const liveSearchAnswer = await getGeminiAnswer({
    userText: args.userText,
    history: args.history,
    grounded: shouldUseGroundedSearch(args.userText),
  });
  if (liveSearchAnswer) {
    return liveSearchAnswer;
  }

  // Then check if there's a matching answer in the knowledge base.
  const knowledgeBaseMatch = findMatchingAnswer(args.userText);
  if (knowledgeBaseMatch) {
    return knowledgeBaseMatch.answer;
  }

  const geminiFallback = await getGeminiAnswer({
    userText: args.userText,
    history: args.history,
    grounded: false,
  });
  if (geminiFallback) {
    return geminiFallback;
  }

  // If no knowledge base match, fall back to LLM
  const model = getProviderModel(args.provider, args.model);
  const historyText = args.history
    .map((turn) => `${turn.role}: ${turn.content}`)
    .join("\n");

  const result = await generateText({
    model,
    system: DEFAULT_SYSTEM_PROMPT,
    prompt: `Language: ${args.language}\nConversation so far:\n${historyText}\n\nUser: ${args.userText}`,
    maxOutputTokens: 800,
  });

  return result.text;
}
