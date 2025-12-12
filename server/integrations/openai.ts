import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user

// Lazy initialization of OpenAI client to allow app to start without API key
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. Please add your OpenAI API key to generate content.");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

interface GenerateContentParams {
  activityType: string;
  activityTitle: string;
  activityDescription: string;
  metadata?: any;
  tone: string;
  style: string;
  keywords?: string[];
  avoidWords?: string[];
  examples?: string[];
}

export async function generateBuildInPublicContent(params: GenerateContentParams): Promise<string> {
  const {
    activityType,
    activityTitle,
    activityDescription,
    metadata,
    tone,
    style,
    keywords = [],
    avoidWords = [],
    examples = [],
  } = params;

  const toneDescriptions: Record<string, string> = {
    professional: "polished, business-focused, and authoritative",
    casual: "friendly, conversational, and approachable",
    technical: "detailed, precise, and educational",
    storytelling: "narrative-driven, engaging, and personal",
  };

  const styleDescriptions: Record<string, string> = {
    builder: "Focus on the process of building, shipping features, and making progress. Celebrate small wins and share the journey.",
    contrarian: "Challenge conventional wisdom and share unique perspectives. Be thought-provoking and bold.",
    "data-focused": "Use numbers, metrics, and concrete results. Be analytical and evidence-based.",
    humble: "Be authentic, acknowledge struggles, and share lessons learned. Show vulnerability and growth.",
  };

  const examplesSection = examples.length > 0
    ? `\n\nHere are examples of posts I like (match this style):\n${examples.map((e, i) => `Example ${i + 1}: "${e}"`).join('\n')}`
    : "";

  const keywordsSection = keywords.length > 0
    ? `\n\nTry to naturally incorporate these keywords/phrases: ${keywords.join(', ')}`
    : "";

  const avoidSection = avoidWords.length > 0
    ? `\n\nAvoid using these words/phrases: ${avoidWords.join(', ')}`
    : "";

  const prompt = `You are a content writer specializing in "Building in Public" content for LinkedIn. Your job is to transform developer/builder activities into engaging social media posts.

Activity to transform:
- Type: ${activityType}
- Title: ${activityTitle}
- Description: ${activityDescription}
${metadata ? `- Additional context: ${JSON.stringify(metadata)}` : ""}

Writing style requirements:
- Tone: ${toneDescriptions[tone] || "professional and engaging"}
- Style: ${styleDescriptions[style] || "Focus on the building journey"}
${examplesSection}
${keywordsSection}
${avoidSection}

Guidelines:
1. Write a LinkedIn post (150-300 words) that transforms this technical activity into an engaging story
2. Start with a hook that grabs attention
3. Share the context/challenge
4. Explain what was done and why it matters
5. End with a takeaway or question for engagement
6. Use appropriate line breaks for readability
7. Do NOT use hashtags or emojis
8. Do NOT sound like generic AI content - be authentic and specific
9. Focus on the human element and lessons learned

Write the post now:`;

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 1024,
  });

  return response.choices[0].message.content || "";
}
