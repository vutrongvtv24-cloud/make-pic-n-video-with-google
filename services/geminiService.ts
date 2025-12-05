
import { GoogleGenAI } from "@google/genai";
import { GeneratedMedia, AspectRatio, ImageResolution, VideoResolution, MediaType } from "../types";

// Helper function to safely retrieve the API Key from different environments
const getApiKey = (): string => {
  try {
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
  } catch (e) {}

  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

// Helper for delay
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper for API calls
async function retryOperation<T>(operation: () => Promise<T>, retries = 5, delay = 4000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Check for rate limit errors (429)
    if (retries > 0 && (error?.status === 429 || error?.code === 429 || error?.message?.includes('429') || error?.message?.includes('quota'))) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
      await wait(delay);
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

interface GenerateOptions {
  aspectRatio: AspectRatio;
  seed?: number;
  referenceImageUrl?: string; // Can be used for remix or image-to-video
  resolution?: ImageResolution;
  videoResolution?: VideoResolution;
  apiKey?: string; 
  mediaType?: MediaType;
}

/**
 * Generates a single image based on the prompt and configuration.
 */
export const generateSingleImage = async (
  prompt: string, 
  id: string,
  options: GenerateOptions
): Promise<GeneratedMedia> => {
  try {
    const apiKey = options.apiKey && options.apiKey.trim() !== '' ? options.apiKey : getApiKey();
    if (!apiKey) throw new Error("API Key is missing.");

    const client = new GoogleGenAI({ apiKey });
    const parts: any[] = [];

    if (options.referenceImageUrl) {
      const base64Data = options.referenceImageUrl.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64Data
        }
      });
    }

    parts.push({ text: prompt });

    let model = 'gemini-2.5-flash-image';
    let imageSize: string | undefined = undefined;

    if (options.resolution === '2K' || options.resolution === '4K') {
      model = 'gemini-3-pro-image-preview';
      imageSize = options.resolution;
    }

    const response = await retryOperation(async () => {
      return await client.models.generateContent({
        model: model,
        contents: { parts: parts },
        config: {
          seed: options.seed,
          imageConfig: {
             aspectRatio: options.aspectRatio,
             ...(imageSize ? { imageSize } : {})
          }
        }
      });
    });

    let imageUrl = '';
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) throw new Error("No image data found in response");

    return {
      id,
      url: imageUrl,
      prompt,
      createdAt: Date.now(),
      type: 'image',
      aspectRatio: options.aspectRatio,
      seed: options.seed,
      resolution: options.resolution
    };

  } catch (error: any) {
    console.error("Error generating image:", error);
    if (error?.status === 429) {
      throw new Error("Hệ thống quá tải (429). Đang thử lại...");
    }
    throw error;
  }
};

/**
 * Generates a VIDEO using Veo model
 */
export const generateVideo = async (
  prompt: string,
  id: string,
  options: GenerateOptions
): Promise<GeneratedMedia> => {
  try {
    const apiKey = options.apiKey && options.apiKey.trim() !== '' ? options.apiKey : getApiKey();
    if (!apiKey) throw new Error("API Key is missing.");

    const client = new GoogleGenAI({ apiKey });
    const model = 'veo-3.1-fast-generate-preview'; // Use fast model for better response time

    // Prepare inputs
    let imageInput = undefined;
    if (options.referenceImageUrl) {
        const base64Data = options.referenceImageUrl.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        imageInput = {
            imageBytes: base64Data,
            mimeType: 'image/png'
        };
    }

    // 1. Start Operation
    let operation = await retryOperation(async () => {
        return await client.models.generateVideos({
            model: model,
            prompt: prompt,
            image: imageInput,
            config: {
                numberOfVideos: 1,
                resolution: options.videoResolution || '720p',
                // Veo specific aspect ratio handling if needed, usually defaults or infers
            }
        });
    });

    // 2. Poll for completion
    console.log("Video operation started...", operation);
    
    let retryCount = 0;
    const MAX_POLL_RETRIES = 60; // 60 * 5s = 5 minutes max wait

    while (!operation.done && retryCount < MAX_POLL_RETRIES) {
        await wait(5000); // Wait 5 seconds between checks
        operation = await client.operations.getVideosOperation({ operation: operation });
        retryCount++;
        console.log("Polling video status:", retryCount);
    }

    if (!operation.done) {
        throw new Error("Video generation timed out.");
    }

    // 3. Retrieve Result
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
        throw new Error("No video URI returned.");
    }

    // 4. Download Video Content (Important: Append API Key)
    const downloadUrl = `${videoUri}&key=${apiKey}`;
    const vidResponse = await fetch(downloadUrl);
    const vidBlob = await vidResponse.blob();
    const localUrl = URL.createObjectURL(vidBlob);

    return {
        id,
        url: localUrl,
        prompt,
        createdAt: Date.now(),
        type: 'video',
        videoResolution: options.videoResolution || '720p',
        seed: options.seed
    };

  } catch (error: any) {
    console.error("Error generating video:", error);
    throw error;
  }
};

/**
 * Analyzes a script text and breaks it down into image generation prompts.
 */
export const analyzeScriptToPrompts = async (script: string, apiKey?: string): Promise<string[]> => {
  try {
    const key = apiKey && apiKey.trim() !== '' ? apiKey : getApiKey();
    const client = new GoogleGenAI({ apiKey: key });

    const prompt = `
      You are an expert visual director and storyboard artist.
      Your task is to analyze the provided video script/story and break it down into distinct visual scenes.
      
      For each scene:
      1. Visualize what is happening.
      2. Write a highly detailed, high-quality image generation prompt (suitable for models like Midjourney or Gemini Image).
      3. Describe the subject, action, lighting, camera angle, style, and mood.
      
      SCRIPT:
      "${script}"
      
      OUTPUT REQUIREMENT:
      - Return ONLY a raw JSON array of strings.
      - Do not include markdown formatting (like \`\`\`json).
      - Example format: ["Prompt for scene 1...", "Prompt for scene 2..."]
    `;

    const response = await retryOperation(async () => {
        return await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
    });

    const text = response.text || "[]";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const prompts = JSON.parse(cleanText);
      if (Array.isArray(prompts)) return prompts.map(p => String(p));
      return [];
    } catch (e) {
      return [];
    }

  } catch (error) {
    console.error("Error analyzing script:", error);
    throw error;
  }
};
