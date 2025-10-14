import { VideoCard } from "./VideoCard";

interface Video {
  id: string;
  title: string;
  description?: string;
  embed_url: string;
  platform: string;
  language: string;
  status: string;
  votes_count: number;
  created_at: string;
  tags?: Array<{
    name: string;
    is_special: boolean;
    color?: string;
  }>;
  hasVoted?: boolean;
}

interface VideoGridProps {
  videos: Video[];
  title?: string;
  showVoteButton?: boolean;
  onVote?: (videoId: string) => Promise<void> | void;
  loading?: boolean;
}

export function VideoGrid({ 
  videos, 
  title, 
  showVoteButton = false, 
  onVote,
  loading = false 
}: VideoGridProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        {title && (
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {title}
          </h2>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i}
              className="aspect-video bg-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="space-y-6">
        {title && (
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {title}
          </h2>
        )}
        <div className="text-center py-12">
          <div className="text-6xl mb-4 animate-float">🎬</div>
          <h3 className="text-xl font-semibold mb-2">
            Nenhum vídeo encontrado
          </h3>
          <p className="text-muted-foreground">
            {showVoteButton 
              ? "Não há vídeos pendentes para votação no momento."
              : "Seja o primeiro a submeter um vídeo incrível!"
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {title && (
        <div className="text-center">
          <h2 className="text-4xl font-bold bg-gradient-rainbow bg-clip-text text-transparent animate-neon-pulse">
            {title}
          </h2>
          <div className="w-24 h-1 bg-gradient-primary mx-auto mt-2 rounded-full" />
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            showVoteButton={showVoteButton}
            onVote={onVote}
          />
        ))}
      </div>
    </div>
  );
}