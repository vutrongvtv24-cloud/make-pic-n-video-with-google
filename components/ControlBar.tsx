import React, { useState, KeyboardEvent, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  Settings2, 
  Ratio, 
  Square, 
  Smartphone, 
  Monitor, 
  Lock, 
  Unlock, 
  Info,
  Plus,
  Layers,
  BookOpen,
  Image as ImageIcon,
  Video,
  Upload,
  X
} from 'lucide-react';
import { AspectRatio, GenerationConfig, ImageResolution, ControlBarProps, MediaType, VideoResolution } from '../types';

const ControlBar: React.FC<ControlBarProps> = ({ onGenerate, isGenerating, onOpenScriptAnalysis }) => {
  const [prompt, setPrompt] = useState('');
  
  // Modes
  const [mediaType, setMediaType] = useState<MediaType>('image');

  // Image Config
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [imageResolution, setImageResolution] = useState<ImageResolution>('1K');
  
  // Video Config
  const [videoResolution, setVideoResolution] = useState<VideoResolution>('720p');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Common Config
  const [seed, setSeed] = useState<number>(Math.floor(Math.random() * 1000000));
  const [isSeedLocked, setIsSeedLocked] = useState(false);
  
  // Menus
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [detectedPrompts, setDetectedPrompts] = useState<string[]>([]);

  // Refs
  const ratioRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BATCH_SIZE_IMAGE = 2;
  const BATCH_SIZE_VIDEO = 1; // Always 1 for video

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ratioRef.current && !ratioRef.current.contains(event.target as Node)) {
        setShowRatioMenu(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (mediaType === 'image') {
       const extracted = extractPrompts(prompt);
       setDetectedPrompts(extracted);
    } else {
       // Video usually handles single prompt better for now, but keeping compatible
       setDetectedPrompts([prompt.trim()]);
    }
  }, [prompt, mediaType]);

  const extractPrompts = (input: string): string[] => {
    if (!input.trim()) return [];
    if (input.includes("Google Whisk prompt:")) {
      const parts = input.split(/Google Whisk prompt:/i);
      const prompts = parts.slice(1).map(part => {
        let clean = part.trim();
        clean = clean.replace(/\n[A-Z\s]+STYLE\s*$/, '');
        clean = clean.replace(/}\s*$/, '');
        return clean.trim();
      });
      return prompts.filter(p => p.length > 0);
    }
    return [input.trim()];
  };

  const handleGenerateClick = () => {
    if (!prompt.trim() || isGenerating) return;
    
    const activeSeed = isSeedLocked ? seed : Math.floor(Math.random() * 1000000);
    if (!isSeedLocked) setSeed(activeSeed);

    const promptsToUse = mediaType === 'image' ? detectedPrompts : [prompt];

    onGenerate(promptsToUse, {
      aspectRatio,
      seed: activeSeed,
      isSeedLocked,
      batchSize: mediaType === 'image' ? BATCH_SIZE_IMAGE : BATCH_SIZE_VIDEO,
      token: undefined, // Token integrated via Env Vars in Service
      resolution: imageResolution,
      mediaType: mediaType,
      videoResolution: videoResolution,
      referenceImage: uploadedImage || undefined
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerateClick();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-10 relative z-50">
      
      {/* Main Control Card */}
      <div className="bg-white rounded-[32px] p-1 shadow-xl shadow-black/20 relative">
        
        {/* Mode Switcher Tabs */}
        <div className="flex bg-gray-100 rounded-[28px] p-1 mb-2 mx-1 mt-1">
          <button 
            onClick={() => setMediaType('image')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[24px] text-sm font-bold transition-all duration-300 ${mediaType === 'image' ? 'bg-white shadow-md text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <ImageIcon size={18} />
            IMAGE
          </button>
          <button 
            onClick={() => setMediaType('video')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[24px] text-sm font-bold transition-all duration-300 ${mediaType === 'video' ? 'bg-black text-[#FCD34D] shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Video size={18} />
            VIDEO (VEO)
          </button>
        </div>

        <div className="p-3">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mediaType === 'image' ? "Mô tả trí tưởng tượng của bạn..." : "Mô tả video bạn muốn tạo (Video prompt)..."}
              className="w-full bg-transparent text-gray-900 text-lg placeholder-gray-400 p-2 min-h-[80px] focus:outline-none resize-none"
              disabled={isGenerating}
            />
            
            {/* Badges */}
            {mediaType === 'image' && detectedPrompts.length > 1 && (
               <div className="absolute top-0 right-0 m-2 pointer-events-none">
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 border border-purple-200">
                     <Layers size={12} />
                     {detectedPrompts.length} PROMPTS
                  </span>
               </div>
            )}
          </div>

          {/* Uploaded Image Preview (Video Mode) */}
          {mediaType === 'video' && uploadedImage && (
            <div className="flex items-center gap-3 bg-gray-100 p-2 rounded-xl mb-2 max-w-fit pr-4 animate-in zoom-in duration-200">
               <img src={uploadedImage} alt="Ref" className="w-10 h-10 object-cover rounded-lg border border-gray-300" />
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Ảnh tham chiếu</span>
                  <span className="text-xs font-bold text-black truncate max-w-[150px]">Đã tải lên</span>
               </div>
               <button onClick={() => setUploadedImage(null)} className="p-1 bg-gray-200 rounded-full hover:bg-gray-300">
                  <X size={14} className="text-gray-600" />
               </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
                {mediaType === 'image' ? (
                   <>
                     <button className="flex items-center gap-2 bg-[#FCD34D] hover:bg-[#fbbf24] text-black px-4 py-2 rounded-full font-bold text-sm transition-colors shadow-sm">
                       <Plus size={16} strokeWidth={3} />
                       <span className="uppercase tracking-wider text-[11px] md:text-xs">Thêm hình ảnh</span>
                     </button>
                     <button 
                       onClick={onOpenScriptAnalysis}
                       className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full font-bold text-sm transition-colors shadow-sm"
                     >
                       <BookOpen size={16} strokeWidth={2.5} className="text-purple-600" />
                       <span className="uppercase tracking-wider text-[11px] md:text-xs text-purple-700">Storyboard</span>
                     </button>
                   </>
                ) : (
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full font-bold text-sm transition-colors shadow-sm"
                      >
                         <Upload size={16} />
                         <span className="uppercase tracking-wider text-[11px] md:text-xs">Upload ảnh</span>
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                      />
                   </div>
                )}
            </div>

            <div className="flex items-center gap-2">
              
              {/* Aspect Ratio (Only for Image) */}
              {mediaType === 'image' && (
                <div className="relative" ref={ratioRef}>
                  <button 
                    onClick={() => setShowRatioMenu(!showRatioMenu)}
                    className={`p-3 rounded-xl transition-all ${showRatioMenu ? 'bg-gray-100 text-black' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
                  >
                    <Ratio size={24} />
                  </button>

                  {showRatioMenu && (
                    <div className="absolute bottom-full right-0 mb-4 p-4 bg-[#E5E5E5] rounded-[24px] shadow-2xl min-w-[280px] flex flex-col gap-4 z-50">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Tỷ lệ khung hình</span>
                      <div className="flex justify-between gap-2">
                        {[
                          { id: '1:1', icon: Square, label: 'VUÔNG (1:1)' },
                          { id: '9:16', icon: Smartphone, label: 'DỌC (9:16)' },
                          { id: '16:9', icon: Monitor, label: 'NGANG (16:9)' }
                        ].map((ratio) => (
                          <button
                            key={ratio.id}
                            onClick={() => { setAspectRatio(ratio.id as AspectRatio); setShowRatioMenu(false); }}
                            className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all flex-1 group ${aspectRatio === ratio.id ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
                          >
                            <div className={`p-2 rounded-lg border-2 ${aspectRatio === ratio.id ? 'border-black' : 'border-gray-400 group-hover:border-gray-600'}`}>
                              <ratio.icon size={24} className={aspectRatio === ratio.id ? 'text-black' : 'text-gray-500'} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase ${aspectRatio === ratio.id ? 'text-black' : 'text-gray-500'}`}>{ratio.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Settings */}
              <div className="relative" ref={settingsRef}>
                <button 
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className={`p-3 rounded-xl transition-all ${showSettingsMenu ? 'bg-gray-100 text-black' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
                >
                  <Settings2 size={24} />
                </button>

                {showSettingsMenu && (
                  <div className="absolute bottom-full right-0 mb-4 p-5 bg-[#E5E5E5] rounded-[24px] shadow-2xl w-[320px] flex flex-col gap-5 text-black z-50">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Cài đặt</span>
                    
                    {/* Seed */}
                    <div className="bg-white rounded-xl border-2 border-black overflow-hidden flex items-center p-1">
                      <div className="flex flex-col px-3 py-1 flex-1">
                        <span className="text-[10px] text-gray-500 font-medium">Số ngẫu nhiên</span>
                        <input 
                          type="number" 
                          value={seed}
                          onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                          className="font-mono text-lg font-bold outline-none text-gray-700 w-full bg-transparent"
                          readOnly={!isSeedLocked}
                        />
                      </div>
                      <button onClick={() => setIsSeedLocked(!isSeedLocked)} className="p-3 hover:bg-gray-100 rounded-lg">
                        {isSeedLocked ? <Lock size={20} /> : <Unlock size={20} />}
                      </button>
                    </div>

                    <div className="h-px bg-gray-300 w-full" />

                    {/* Resolution Config */}
                    <div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 block mb-2">
                         {mediaType === 'image' ? 'Chất lượng hình ảnh' : 'Chất lượng Video'}
                      </span>
                      <div className="flex gap-2 p-1 bg-white rounded-xl border border-gray-300">
                        {mediaType === 'image' ? (
                           ['1K', '2K', '4K'].map((res) => (
                              <button
                                key={res}
                                onClick={() => setImageResolution(res as ImageResolution)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${imageResolution === res ? 'bg-black text-[#FCD34D]' : 'text-gray-500 hover:bg-gray-100'}`}
                              >
                                {res}
                              </button>
                           ))
                        ) : (
                           ['720p', '1080p'].map((res) => (
                              <button
                                key={res}
                                onClick={() => setVideoResolution(res as VideoResolution)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${videoResolution === res ? 'bg-black text-[#FCD34D]' : 'text-gray-500 hover:bg-gray-100'}`}
                              >
                                {res}
                              </button>
                           ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateClick}
                disabled={isGenerating || !prompt.trim()}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                  ${isGenerating || !prompt.trim() 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : mediaType === 'image' ? 'bg-[#1e1e1e] text-[#FCD34D] hover:scale-105 shadow-lg' : 'bg-[#FCD34D] text-black hover:scale-105 shadow-lg'}
                `}
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight size={24} strokeWidth={3} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlBar;