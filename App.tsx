import React, { useState, useCallback } from 'react';
import { GeneratedMedia, GenerationState, GenerationConfig, PromptGroup as PromptGroupType } from './types';
import { generateSingleImage, generateVideo, analyzeScriptToPrompts } from './services/geminiService';
import ControlBar from './components/ControlBar';
import PromptGroup from './components/PromptGroup';
import EditModal from './components/EditModal';
import ScriptAnalysisModal from './components/ScriptAnalysisModal';
import { Aperture, Info, Sparkles, Download, Loader2, Check } from 'lucide-react';
import JSZip from 'jszip';

export default function App() {
  const [promptGroups, setPromptGroups] = useState<PromptGroupType[]>([]);
  
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    currentPromptIndex: 0,
    totalPrompts: 0,
    statusMessage: ''
  });
  
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const [editingImage, setEditingImage] = useState<GeneratedMedia | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // ------------------------------------------
  // CORE GENERATION LOGIC
  // ------------------------------------------
  const handleGenerate = useCallback(async (prompts: string[], config: GenerationConfig) => {
    setError(null);
    setIsFinished(false); 
    
    setGenerationState({
      isGenerating: true,
      currentPromptIndex: 0,
      totalPrompts: prompts.length,
      statusMessage: 'Starting...'
    });

    for (let i = 0; i < prompts.length; i++) {
      const promptText = prompts[i];
      
      setGenerationState(prev => ({
        ...prev,
        currentPromptIndex: i + 1,
        statusMessage: config.mediaType === 'video' ? `Đang tạo video ${i+1}/${prompts.length} (có thể mất vài phút)...` : `Đang tạo ảnh ${i+1}/${prompts.length}...`
      }));

      // Delay between prompts
      if (i > 0) await delay(config.mediaType === 'video' ? 5000 : 2000); 

      const promises = Array.from({ length: config.batchSize }).map(async (_, idx) => {
        const id = `${Date.now()}-${i}-${idx}`;
        const instanceSeed = config.seed + idx + (i * 100); 

        // Stagger
        await delay(idx * 500); 

        try {
          if (config.mediaType === 'video') {
             // VIDEO GENERATION
             return await generateVideo(promptText, id, {
                apiKey: config.token,
                videoResolution: config.videoResolution,
                seed: instanceSeed,
                referenceImageUrl: config.referenceImage,
                aspectRatio: config.aspectRatio
             });
          } else {
             // IMAGE GENERATION
             return await generateSingleImage(promptText, id, {
                aspectRatio: config.aspectRatio,
                seed: instanceSeed,
                resolution: config.resolution,
                apiKey: config.token
             });
          }
        } catch (e: any) {
          console.error(`Failed to generate item ${idx} for prompt ${i}`, e);
          return null;
        }
      });

      const results = await Promise.all(promises);
      const validItems = results.filter((item): item is GeneratedMedia => item !== null);

      if (validItems.length > 0) {
        const newGroup: PromptGroupType = {
          id: `group-${Date.now()}-${i}`,
          originalPrompt: promptText,
          items: validItems,
          timestamp: Date.now(),
          type: config.mediaType
        };
        setPromptGroups(prev => [newGroup, ...prev]);
      } else {
         if (config.mediaType === 'video') setError("Video creation timed out or failed. Please check Quota or try again.");
      }
    }

    setGenerationState({
      isGenerating: false,
      currentPromptIndex: 0,
      totalPrompts: 0,
      statusMessage: ''
    });
    setIsFinished(true);
  }, []);

  // ------------------------------------------
  // REMIX / EDIT LOGIC
  // ------------------------------------------
  const openRemixModal = (image: GeneratedMedia) => {
    if (image.type === 'video') return; // Cannot remix video yet
    setEditingImage(image);
    setIsEditModalOpen(true);
  };

  const handleRemixGenerate = async (newPrompt: string, seed: number, isSeedLocked: boolean) => {
    if (!editingImage) return;

    setGenerationState(prev => ({ ...prev, isGenerating: true, statusMessage: 'Remixing...' }));
    setIsFinished(false);
    
    // Use default env token (undefined passed)
    const BATCH_SIZE_REMIX = 2;
    
    try {
        const promises = Array.from({ length: BATCH_SIZE_REMIX }).map(async (_, idx) => {
            const id = `remix-${Date.now()}-${idx}`;
            const instanceSeed = isSeedLocked ? seed : (seed + idx * 100);
            await delay(idx * 500);

            try {
                return await generateSingleImage(newPrompt, id, {
                    aspectRatio: editingImage.aspectRatio || '1:1',
                    seed: instanceSeed,
                    referenceImageUrl: editingImage.url, 
                    resolution: editingImage.resolution || '1K',
                    // apiKey undefined means it uses env var
                });
            } catch (e) {
                return null;
            }
        });

        const results = await Promise.all(promises);
        const validItems = results.filter((img): img is GeneratedMedia => img !== null);

        if (validItems.length > 0) {
             const newGroup: PromptGroupType = {
                id: `remix-group-${Date.now()}`,
                originalPrompt: newPrompt,
                styleTitle: "REMIXED RESULT",
                items: validItems,
                timestamp: Date.now(),
                type: 'image'
             };
             setPromptGroups(prev => [newGroup, ...prev]);
        } else {
          setError("Remix thất bại.");
        }

        setIsEditModalOpen(false); 
        setIsFinished(true);

    } catch (e) {
        setError("Lỗi Remix.");
    } finally {
        setGenerationState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  // ------------------------------------------
  // SCRIPT / STORYBOARD
  // ------------------------------------------
  const handleScriptPrompts = (prompts: string[]) => {
    // No manual token passed
    handleGenerate(prompts, {
      aspectRatio: '16:9', 
      seed: Math.floor(Math.random() * 1000000),
      isSeedLocked: false,
      batchSize: 1, 
      token: undefined, // Use integrated key
      resolution: '1K',
      mediaType: 'image', // Storyboard defaults to images
      videoResolution: '720p'
    });
  };

  const handleAnalyzeScript = async (script: string) => {
    // No manual token passed
    return await analyzeScriptToPrompts(script);
  };

  // ------------------------------------------
  // DOWNLOAD ALL
  // ------------------------------------------
  const handleDownloadAll = async () => {
    if (promptGroups.length === 0) return;
    setIsZipping(true);
    try {
        const zip = new JSZip();
        let count = 0;
        
        for (const group of promptGroups) {
            for (const item of group.items) {
                // Fetch blob if needed (especially for videos)
                const response = await fetch(item.url);
                const blob = await response.blob();
                const ext = item.type === 'video' ? 'mp4' : 'png';
                const fileName = `google-gen-${item.id}.${ext}`;
                zip.file(fileName, blob);
                count++;
            }
        }

        if (count > 0) {
            const content = await zip.generateAsync({type: "blob"});
            const url = URL.createObjectURL(content);
            const a = document.createElement("a");
            a.href = url;
            a.download = `google-batch-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (e) {
        console.error("Zip failed", e);
        setError("Không thể nén file. Vui lòng thử tải từng file.");
    } finally {
        setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
      
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col min-h-screen">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <Aperture className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Make Pic/Video with Google</h1>
              <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">Powered by Gemini & Veo</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                <span className="text-xs font-bold text-gray-400">AI</span>
             </div>
          </div>
        </header>

        {/* Control Bar */}
        <ControlBar 
          onGenerate={handleGenerate} 
          isGenerating={generationState.isGenerating}
          onOpenScriptAnalysis={() => setIsScriptModalOpen(true)}
        />

        {/* Status */}
        {generationState.statusMessage && generationState.isGenerating && (
           <div className="max-w-4xl mx-auto mb-4 text-center">
             <span className="text-purple-400 text-sm font-mono animate-pulse">{generationState.statusMessage}</span>
           </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-4xl mx-auto mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center text-sm">
            {error}
          </div>
        )}
        
        {/* Progress Bar */}
        {(generationState.isGenerating || isFinished) && (
          <div className="max-w-4xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 bg-surface/30 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">
                  <span className={isFinished ? "text-green-400" : "text-[#FCD34D]"}>
                    {isFinished ? 'Hoàn tất xử lý' : 'Đang xử lý...'}
                  </span>
                  {!isFinished && (
                    <span>{generationState.currentPromptIndex} / {generationState.totalPrompts || 1}</span>
                  )}
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ease-out rounded-full ${isFinished ? 'bg-green-500' : 'bg-[#FCD34D]'}`}
                    style={{ width: isFinished ? '100%' : `${(generationState.currentPromptIndex / (generationState.totalPrompts || 1)) * 100}%` }}
                  />
                </div>
              </div>
              <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-black/20 rounded-full">
                 {isFinished ? (
                    <div className="text-green-500 animate-in zoom-in duration-300">
                      <Check size={24} strokeWidth={3} />
                    </div>
                 ) : (
                    <div className="text-[#FCD34D] animate-spin">
                      <Loader2 size={24} />
                    </div>
                 )}
              </div>
            </div>
          </div>
        )}

        {/* Gallery */}
        <div className="flex-1 max-w-[1800px] mx-auto w-full pb-32">
          {promptGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 mt-12">
              <Sparkles className="opacity-20 mb-4" size={32} />
              <p className="text-lg">Sẵn sàng sáng tạo.</p>
            </div>
          ) : (
            <div className="space-y-8 w-full">
              {promptGroups.map((group) => (
                <PromptGroup 
                    key={group.id} 
                    group={group} 
                    onRemix={openRemixModal} 
                />
              ))}
            </div>
          )}
        </div>

        {/* Download All */}
        {promptGroups.length > 0 && (
          <button 
            onClick={handleDownloadAll}
            disabled={isZipping || generationState.isGenerating}
            className="fixed bottom-8 right-8 z-50 bg-[#FCD34D] hover:bg-[#fbbf24] text-black px-6 py-4 rounded-full font-bold shadow-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed group"
          >
            {isZipping ? <Loader2 className="animate-spin" size={24} /> : <Download size={24} className="group-hover:translate-y-[2px]" />}
            <span className="uppercase tracking-wider">{isZipping ? "ĐANG NÉN..." : "TẢI TẤT CẢ"}</span>
          </button>
        )}

        {/* Modals */}
        <EditModal 
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            originalImage={editingImage}
            onGenerate={handleRemixGenerate}
            isGenerating={generationState.isGenerating}
        />

        <ScriptAnalysisModal 
          isOpen={isScriptModalOpen}
          onClose={() => setIsScriptModalOpen(false)}
          onAnalyze={handleAnalyzeScript}
          onConfirmPrompts={handleScriptPrompts}
        />

        <footer className="py-6 text-center text-xs text-gray-600 border-t border-white/5 mt-auto">
          <p>&copy; {new Date().getFullYear()} Make Pic/Video with Google. Powered by Google Gemini & Veo.</p>
        </footer>
      </div>
    </div>
  );
}