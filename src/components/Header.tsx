import { useState } from "react";
import { Search, Menu, Plus, Zap, User, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  onMenuToggle?: () => void;
  onSearch?: (query: string) => void;
  onSubmitVideo?: () => void;
  totalVotes?: number;
}

export function Header({ onMenuToggle, onSearch, onSubmitVideo, totalVotes = 0 }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const formattedVotes = new Intl.NumberFormat("pt-BR").format(totalVotes);

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Menu */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuToggle}
              className="md:hidden"
            >
              <Menu className="w-6 h-6" />
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold bg-gradient-rainbow bg-clip-text text-transparent animate-neon-pulse">
                Monynha Fun
              </div>
              <Badge variant="outline" className="hidden sm:flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Beta
              </Badge>
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar vídeos, tags, biscoitos..."
                value={searchQuery}
                onChange={(e) => updateSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-primary/20 focus:border-primary"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Vote counter */}
            <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-muted rounded-full">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{formattedVotes}</span>
            </div>

            {/* Submit video */}
            <Button variant="neon" size="sm" className="gap-2" onClick={onSubmitVideo}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Submeter</span>
            </Button>

            {/* User */}
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={handleSearch} className="md:hidden mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar vídeos..."
              value={searchQuery}
              onChange={(e) => updateSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>
      </div>
    </header>
  );
}