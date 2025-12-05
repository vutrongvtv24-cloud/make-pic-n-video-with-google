
import React, { useState } from 'react';
import { Download, Play, Pause } from 'lucide-react';
import { GeneratedMedia } from '../types';

interface VideoCardProps {
  video: GeneratedMedia;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = video.url;
    link.download = `whisk-video-${video.id}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden bg-surface w-full aspect-video border border-white/5 shadow-lg">
      <video
        ref={videoRef}
        src={video.url}
        className="w-full h-full object-cover"
        loop
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Play/Pause Overlay (Visible on hover or when paused) */}
      <div 
        className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
        onClick={togglePlay}
      >
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-white/30 transition-transform hover:scale-110">
          {isPlaying ? <Pause className="text-white fill-current" /> : <Play className="text-white fill-current ml-1" />}
        </div>
      </div>

      {/* Controls Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p className="text-white/80 text-xs line-clamp-1 mb-2 font-medium">{video.prompt}</p>
        <div className="flex items-center justify-between">
           <span className="text-[10px] bg-[#FCD34D] text-black px-2 py-0.5 rounded font-bold uppercase">
             {video.videoResolution || '720p'}
           </span>
           <button 
             onClick={handleDownload}
             className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
           >
             <Download size={16} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
