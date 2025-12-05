
import React from 'react';
import { PromptGroup as PromptGroupType, GeneratedMedia } from '../types';
import ImageCard from './ImageCard';
import VideoCard from './VideoCard';

interface PromptGroupProps {
  group: PromptGroupType;
  onRemix?: (item: GeneratedMedia) => void;
}

const PromptGroup: React.FC<PromptGroupProps> = ({ group, onRemix }) => {
  return (
    <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full items-start">
        {group.items.map((item, idx) => (
           item.type === 'video' ? (
             <VideoCard key={item.id} video={item} />
           ) : (
             <ImageCard key={item.id} image={item} index={idx} onRemix={onRemix} />
           )
        ))}
      </div>
    </div>
  );
};

export default PromptGroup;
