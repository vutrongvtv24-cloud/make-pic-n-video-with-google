import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Lock, Unlock, Sparkles } from 'lucide-react';
import { GeneratedMedia } from '../types';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalImage: GeneratedMedia | null;
  onGenerate: (newPrompt: string, seed: number, isSeedLocked: boolean) => void;
  isGenerating: boolean;
}

const EditModal: React.FC<EditModalProps> = ({ 
  isOpen, 
  onClose, 
  originalImage, 
  onGenerate,
  isGenerating 
}) => {
  const [prompt, setPrompt] = useState('');
  const [seed, setSeed] = useState<number>(0);
  const [isSeedLocked, setIsSeedLocked] = useState(false);

  // Reset state when image changes
  useEffect(() => {
    if (originalImage) {
      setPrompt(originalImage.prompt);
      setSeed(Math.floor(Math.random() * 1000000));
    }
  }, [originalImage]);

  if (!isOpen || !originalImage) return null;

  const handleGenerateClick = () => {
    onGenerate(prompt, seed, isSeedLocked);
  };

  const toggleSeedLock = () => setIsSeedLocked(!isSeedLocked);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-[#1e1e1e] w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-200 border border-white/10">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-md"
        >
          <X size={20} />
        </button>

        {/* Left: Image Preview */}
        <div className="w-full md:w-1/2 bg-black/50 p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-white/5 relative">
          <div className="relative w-full h-full flex items-center justify-center">
             <img 
               src={originalImage.url} 
               alt="Original Reference" 
               className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg"
             />
             <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider backdrop-blur-sm">
                Ảnh tham chiếu
             </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="w-full md:w-1/2 p-6 flex flex-col">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="text-[#FCD34D]" />
              Remix Image
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Chỉnh sửa prompt để tạo ra các biến thể mới dựa trên ảnh này.
            </p>
          </div>

          <div className="flex-1 space-y-6">
            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Prompt mới</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-base focus:outline-none focus:border-[#FCD34D]/50 transition-colors h-32 resize-none"
                placeholder="Nhập thay đổi bạn muốn..."
              />
            </div>

            {/* Seed Control */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cài đặt</label>
              <div className="bg-black/30 rounded-xl border border-white/10 overflow-hidden flex items-center p-1">
                <div className="flex flex-col px-3 py-1 flex-1">
                  <span className="text-[10px] text-gray-500 font-medium">Số ngẫu nhiên</span>
                  <input 
                    type="number" 
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                    className="font-mono text-lg font-bold outline-none text-white w-full bg-transparent"
                    readOnly={!isSeedLocked}
                  />
                </div>
                <button 
                  onClick={toggleSeedLock}
                  className="p-3 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  {isSeedLocked ? <Lock size={20} /> : <Unlock size={20} />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleGenerateClick}
              disabled={isGenerating || !prompt.trim()}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all
                ${isGenerating || !prompt.trim()
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-[#FCD34D] hover:bg-[#fbbf24] text-black shadow-lg hover:scale-105 active:scale-95'}
              `}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>ĐANG XỬ LÝ...</span>
                </>
              ) : (
                <>
                  <span>TẠO BẢN REMIX</span>
                  <ArrowRight size={18} strokeWidth={2.5} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditModal;