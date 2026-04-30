'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { PostIdea } from '@/lib/ideas-data';

async function getModel(genAI: GoogleGenerativeAI) {
  const baseNames = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro'];
  // We try each name both with and without the "models/" prefix
  const variants: string[] = [];
  baseNames.forEach(name => {
    variants.push(name);
    variants.push(`models/${name}`);
  });
  
  for (const modelName of variants) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      await model.generateContent('test'); 
      return model;
    } catch (e) {
      continue;
    }
  }

  throw new Error('All Gemini model variants returned 404. Please confirm you are using an API Key (AIza...) and not a Client ID (AQ...). Also, ensure the "Generative Language API" is enabled in your Google Cloud Console.');
}

export async function generateAIRecommendations(trends: string[], news: string[]): Promise<PostIdea[]> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('API Key Missing: Please add GOOGLE_GENERATIVE_AI_API_KEY to your .env.local file.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const model = await getModel(genAI);

    const prompt = `
      You are a Senior Software Architect. Generate 10 unique, high-impact blog topic ideas.
      Categories: SDLC, Security, Development, Tools, Tips & Tricks, or Controversial.
      Return ONLY a JSON array of objects following this interface:
      {
        "id": string,
        "title": string,
        "description": string,
        "category": string,
        "impact": "High" | "Medium" | "Low",
        "insight": string,
        "conventionalAngle": string,
        "controversialAngle": string
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI returned invalid format');
    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    console.error('Gemini Generation Error:', error);
    throw new Error(error.message || 'Failed to generate ideas.');
  }
}

export async function generateDraftContent(title: string, insight: string, conventionalAngle: string, controversialAngle: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('API Key Missing: Please add GOOGLE_GENERATIVE_AI_API_KEY to your .env.local file.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = await getModel(genAI);

    const prompt = `
      Write a high-quality blog post draft.
      TOPIC: ${title}
      CORE INSIGHT: ${insight}
      CONVENTIONAL VIEW: ${conventionalAngle}
      CONTROVERSIAL ANGLE: ${controversialAngle}

      GUIDELINES:
      - Use Markdown.
      - Elaborate on the conventional view, then pivot to the controversial angle.
      - Provide 3-4 key takeaways.
      - Length: ~600 words.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error('Gemini Draft Error:', error);
    throw new Error(error.message || 'Failed to generate draft.');
  }
}
