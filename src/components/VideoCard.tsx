import { useState } from "react";
import { Heart, Play, Tag, Calendar, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  video: {
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
  };
  onVote?: (videoId: string) => Promise<void> | void;
  showVoteButton?: boolean;
}

export function VideoCard({ video, onVote, showVoteButton = false }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const thresholdFromEnv = Number(import.meta.env.VITE_VOTES_TO_PUBLISH ?? 10);
  const approvalThreshold = Number.isFinite(thresholdFromEnv) && thresholdFromEnv > 0
    ? thresholdFromEnv
    : 10;
  const votesCount = video.votes_count ?? 0;
  const hasUserVoted = Boolean(video.hasVoted);
  const votesRemaining = Math.max(approvalThreshold - votesCount, 0);
  const progressValue = approvalThreshold > 0
    ? Math.min((votesCount / approvalThreshold) * 100, 100)
    : 0;

  const handleVote = () => {
    if (onVote && !hasUserVoted) {
      void onVote(video.id);
    }
  };

  const getThumbnailUrl = (embedUrl: string, platform: string) => {
    if (platform === 'youtube') {
      const videoId = embedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
    }
    return null;
  };

  const thumbnailUrl = getThumbnailUrl(video.embed_url, video.platform);
  const hasBiscoitoTag = video.tags?.some(tag => tag.name === 'biscoito');

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 animate-fade-in",
        "hover:scale-105 hover:shadow-neon cursor-pointer",
        hasBiscoitoTag && "border-biscoito/50 shadow-glitch animate-rainbow-border"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-dark flex items-center justify-center">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Overlay on hover */}
        <div className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-300 flex items-center justify-center",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <Play className="w-16 h-16 text-white animate-neon-pulse" />
        </div>

        {/* Status badge */}
        {video.status === 'pending' && (
          <Badge variant="secondary" className="absolute top-2 left-2">
            Pendente
          </Badge>
        )}

        {/* Platform badge */}
        <Badge 
          variant="outline" 
          className="absolute top-2 right-2 bg-black/50 text-white border-white/20"
        >
          {video.platform}
        </Badge>

        {/* Biscoito indicator */}
        {hasBiscoitoTag && (
          <div className="absolute bottom-2 right-2 animate-float">
            <Cookie className="w-6 h-6 text-biscoito drop-shadow-lg" />
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>

        {/* Description */}
        {video.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {video.description}
          </p>
        )}

        {/* Tags */}
        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {video.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.name}
                variant={tag.is_special ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  tag.is_special && "bg-biscoito text-biscoito-foreground"
                )}
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag.name}
              </Badge>
            ))}
            {video.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{video.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {video.status === 'pending' && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {votesRemaining > 0
                  ? `${votesRemaining} voto${votesRemaining === 1 ? '' : 's'} para publicar`
                  : 'Pronto para aprovação!'}
              </span>
              <span className="font-medium text-foreground">
                {Math.min(votesCount, approvalThreshold)}/{approvalThreshold}
              </span>
            </div>
            <Progress value={progressValue} className="h-2" />
            {hasUserVoted && (
              <Badge variant="outline" className="text-xs border-primary/60 text-primary">
                Você já votou
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            {new Date(video.created_at).toLocaleDateString('pt-BR')}
          </div>

          <div className="flex items-center gap-2">
            {/* Vote count */}
            <div className="flex items-center gap-1 text-sm">
              <Heart className="w-4 h-4 text-primary" />
              <span className="font-medium">{votesCount}</span>
            </div>

            {/* Vote button for pending videos */}
            {showVoteButton && video.status === 'pending' && (
              <Button
                variant="vote"
                size="sm"
                onClick={handleVote}
                disabled={hasUserVoted}
                className={cn(
                  "ml-2 transition-all duration-200",
                  hasUserVoted && "opacity-50 cursor-not-allowed"
                )}
              >
                {hasUserVoted ? "Votado!" : "👍 Publicar"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}