import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { AudioGenerator } from '@/utils/audioGenerator';

interface GameMusicProps {
  gameType: string;
  isPlaying: boolean;
  volume?: number;
  showControls?: boolean;
}

export const GameMusic = ({ gameType, isPlaying, volume = 0.5, showControls = true }: GameMusicProps) => {
  const audioGeneratorRef = useRef<AudioGenerator | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    audioGeneratorRef.current = new AudioGenerator();
    return () => {
      if (audioGeneratorRef.current) {
        audioGeneratorRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!audioGeneratorRef.current) return;

    if (isPlaying && !isMuted) {
      audioGeneratorRef.current.setVolume(volume);
      
      switch (gameType) {
        case 'quiz':
          audioGeneratorRef.current.playQuizMusic();
          break;
        case 'memory':
          audioGeneratorRef.current.playMemoryMusic();
          break;
        case 'tap':
          audioGeneratorRef.current.playTapMusic();
          break;
        case 'word':
          audioGeneratorRef.current.playWordMusic();
          break;
        case 'math':
          audioGeneratorRef.current.playMathMusic();
          break;
        case 'color':
          audioGeneratorRef.current.playColorMusic();
          break;
        case 'reaction':
          audioGeneratorRef.current.playReactionMusic();
          break;
        case 'crossword':
          audioGeneratorRef.current.playCrosswordMusic();
          break;
        case 'fillword':
          audioGeneratorRef.current.playFillwordMusic();
          break;
      }
    } else {
      audioGeneratorRef.current.stop();
    }
  }, [gameType, isPlaying, isMuted, volume]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioGeneratorRef.current) {
      if (isMuted) {
        audioGeneratorRef.current.setVolume(volume);
      } else {
        audioGeneratorRef.current.stop();
      }
    }
  };

  if (!showControls) return null;

  return (
    <div className="absolute top-2 right-2 z-10">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleMute}
        className="bg-white/90 backdrop-blur-sm shadow-lg"
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>
    </div>
  );
};