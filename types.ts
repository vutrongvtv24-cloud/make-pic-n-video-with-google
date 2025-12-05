
export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageResolution = '1K' | '2K' | '4K';
export type MediaType = 'image' | 'video';
export type VideoResolution = '720p' | '1080p';

export interface GeneratedMedia {
  id: string;
  url: string;
  prompt: string;
  createdAt: number;
  type: MediaType;
  // Image specific
  aspectRatio?: AspectRatio;
  resolution?: ImageResolution;
  // Video specific
  videoResolution?: VideoResolution;
  seed?: number;
}

export interface PromptGroup {
  id: string;
  originalPrompt: string; 
  styleTitle?: string; 
  items: GeneratedMedia[]; // Renamed from images to items to support both
  timestamp: number;
  type: MediaType;
}

export interface GenerationState {
  isGenerating: boolean;
  currentPromptIndex: number;
  totalPrompts: number;
  statusMessage?: string; // Add detailed status for video polling
}

export interface GenerationConfig {
  aspectRatio: AspectRatio;
  seed: number;
  isSeedLocked: boolean;
  batchSize: number;
  token?: string; 
  resolution: ImageResolution;
  // Video config
  mediaType: MediaType;
  videoResolution: VideoResolution;
  referenceImage?: string; // Base64 for image-to-video
}

export interface RemixOptions {
  originalImage: GeneratedMedia;
  newPrompt: string;
  seed: number;
  isSeedLocked: boolean;
}

export interface ControlBarProps {
  onGenerate: (prompts: string[], config: GenerationConfig) => void;
  isGenerating: boolean;
  onOpenScriptAnalysis: () => void;
}
