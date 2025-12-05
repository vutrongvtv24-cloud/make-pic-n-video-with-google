import React, { useState } from 'react';
import { X, ArrowRight, BookOpen, Loader2, Wand2, Film } from 'lucide-react';

interface ScriptAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (script: string) => Promise<string[]>;
  onConfirmPrompts: (prompts: string[]) => void;
}

const ScriptAnalysisModal: React.FC<ScriptAnalysisModalProps> = ({
  isOpen,
  onClose,
  onAnalyze,
  onConfirmPrompts
}) => {
  const [script, setScript] = useState('');
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAnalyzeClick = async () => {
    if (!script.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const results = await onAnalyze(script);
      if (results && results.length > 0) {
        setGeneratedPrompts(results);
        setStep('review');
      } else {
        setError("Không thể phân tích nội dung. Vui lòng thử lại với nội dung rõ ràng hơn.");
      }
    } catch (err) {
      setError("Đã xảy ra lỗi khi kết nối với AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...generatedPrompts];
    newPrompts[index] = value;
    setGeneratedPrompts(newPrompts);
  };

  const handleConfirm = () => {
    onConfirmPrompts(generatedPrompts);
    // Reset and close
    setStep('input');
    setScript('');
    setGeneratedPrompts([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-[#1e1e1e] w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col h-[85vh] animate-in zoom-in-95 duration-200 border border-white/10">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
              <Film size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Storyboard AI</h2>
              <p className="text-gray-400 text-xs">Biến kịch bản thành hình ảnh minh họa</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-6 relative">
          
          {step === 'input' ? (
            <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Nhập kịch bản video hoặc câu chuyện của bạn</label>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="flex-1 w-full bg-black/30 border border-white/10 rounded-xl p-6 text-white text-base leading-relaxed focus:outline-none focus:border-purple-500/50 transition-colors resize-none placeholder-gray-600 font-mono"
                placeholder="Ví dụ: Cảnh 1: Một người đàn ông đi bộ trong rừng mưa nhiệt đới vào buổi sáng sớm, ánh nắng xuyên qua tán lá..."
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          ) : (
            <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex justify-between items-end">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    AI đã tìm thấy {generatedPrompts.length} phân cảnh
                  </label>
                  <button 
                    onClick={() => setStep('input')}
                    className="text-xs text-gray-500 hover:text-white underline"
                  >
                    Quay lại chỉnh sửa kịch bản
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {generatedPrompts.map((p, idx) => (
                    <div key={idx} className="bg-black/40 rounded-xl p-4 border border-white/5 hover:border-purple-500/30 transition-colors group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-purple-400 uppercase">Cảnh {idx + 1}</span>
                        <Wand2 size={14} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                      </div>
                      <textarea
                        value={p}
                        onChange={(e) => handlePromptChange(idx, e.target.value)}
                        className="w-full bg-transparent text-gray-200 text-sm focus:outline-none resize-none min-h-[60px]"
                        rows={3}
                      />
                    </div>
                  ))}
               </div>
            </div>
          )}
        
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end">
          {step === 'input' ? (
             <button
                onClick={handleAnalyzeClick}
                disabled={isAnalyzing || !script.trim()}
                className={`
                  flex items-center gap-2 px-8 py-3 rounded-full font-bold text-sm transition-all
                  ${isAnalyzing || !script.trim()
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 hover:scale-105 active:scale-95'}
                `}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>ĐANG PHÂN TÍCH...</span>
                  </>
                ) : (
                  <>
                    <BookOpen size={18} />
                    <span>PHÂN TÍCH KỊCH BẢN</span>
                  </>
                )}
              </button>
          ) : (
             <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-sm bg-[#FCD34D] hover:bg-[#fbbf24] text-black shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                <span>TẠO {generatedPrompts.length} HÌNH ẢNH</span>
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScriptAnalysisModal;