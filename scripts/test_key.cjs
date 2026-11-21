const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const match = env.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
const key = match ? match[1].trim() : '';

const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: key });

async function test() {
  const models = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
  for (const model of models) {
    try {
      console.log('Tentando modelo:', model);
      const res = await ai.models.generateContent({
        model,
        contents: 'Responda apenas: OK'
      });
      console.log(`SUCESSO com ${model}:`, res.text ? res.text.trim() : 'OK');
      return;
    } catch (err) {
      console.error(`Falha com ${model}:`, err.message || err);
    }
  }
}
test();
