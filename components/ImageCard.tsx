import React, { useState } from 'react';
import { Download, Share2, Sparkles } from 'lucide-react';
import { GeneratedMedia, AspectRatio } from '../types';

interface ImageCardProps {
  image: GeneratedMedia;
  index: number;
  onRemix?: (image: GeneratedMedia) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, index, onRemix }) => {
  const [loaded, setLoaded] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `whisk-remix-${image.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAspectRatioStyle = (ratio: AspectRatio | undefined) => {
    switch(ratio) {
        case '1:1': return { aspectRatio: '1 / 1' };
        case '9:16': return { aspectRatio: '9 / 16' };
        case '16:9': return { aspectRatio: '16 / 9' };
        case '3:4': return { aspectRatio: '3 / 4' };
        case '4:3': return { aspectRatio: '4 / 3' };
        default: return { aspectRatio: '1 / 1' };
    }
  };

  return (
    <div 
      className={`relative group rounded-xl overflow-hidden bg-surface w-full transition-all duration-700 ease-out ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ 
        transitionDelay: `${index * 100}ms`,
        ...getAspectRatioStyle(image.aspectRatio)
      }}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 animate-pulse">
           <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      
      <img
        src={image.url}
        alt={image.prompt}
        onLoad={() => setLoaded(true)}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
        <p className="text-white/90 text-sm line-clamp-2 mb-3 font-medium drop-shadow-md">
          {image.prompt}
        </p>
        
        <div className="flex items-center gap-2">
          {/* Remix Button */}
          {onRemix && (
            <button 
              onClick={() => onRemix(image)}
              className="bg-[#FCD34D] hover:bg-[#fbbf24] text-black p-2 rounded-lg flex items-center justify-center transition-colors shadow-lg"
              title="Remix ảnh này"
            >
              <Sparkles size={18} strokeWidth={2.5} />
            </button>
          )}

          <button 
            onClick={handleDownload}
            className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors border border-white/10"
          >
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCard;