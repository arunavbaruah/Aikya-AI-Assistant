import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } from "@google/generative-ai";
  
  const MODEL_NAME = "models/gemini-1.5-pro-002";


  
  // Paste Your API KEY Below
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  async function runChat(prompt) {
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      console.log("Loaded API Key:", API_KEY);
  
      const generationConfig = {
        temperature: 0.75,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      };
  
      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ];
  
      const chat = model.startChat({
        generationConfig,
        safetySettings,
        history: [],
      });
  
      const result = await chat.sendMessage(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error("Gemini API error:", error);
      return "Error occurred while generating response.";
    }
  }
  
  
  export default runChat;