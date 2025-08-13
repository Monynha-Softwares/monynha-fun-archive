import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, Sparkles, Cookie, Gamepad2, GraduationCap, Music, ChefHat, Cpu } from "lucide-react";

interface Category {
  slug: string;
  title_pt: string;
  title_en: string;
  title_es: string;
  title_fr: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory?: string;
  onCategoryChange: (category: string | undefined) => void;
  selectedTags: string[];
  onTagChange: (tags: string[]) => void;
}

const categoryIcons: Record<string, any> = {
  educacao: GraduationCap,
  memes: Sparkles,
  cultura: Gamepad2,
  receitas: ChefHat,
  musica: Music,
  tecnologia: Cpu,
};

const specialTags = [
  { name: 'biscoito', icon: Cookie, color: 'biscoito' },
  { name: 'viral', icon: Sparkles, color: 'primary' },
  { name: 'clássico', icon: Gamepad2, color: 'secondary' },
];

export function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedTags,
  onTagChange,
}: CategoryFilterProps) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Filtros</h3>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Categorias
        </h4>
        
        <div className="space-y-2">
          <Button
            variant={!selectedCategory ? "default" : "ghost"}
            className="w-full justify-start gap-3"
            onClick={() => onCategoryChange(undefined)}
          >
            <Sparkles className="w-4 h-4" />
            Todas
          </Button>
          
          {categories.map((category) => {
            const Icon = categoryIcons[category.slug] || Sparkles;
            const isSelected = selectedCategory === category.slug;
            
            return (
              <Button
                key={category.slug}
                variant={isSelected ? "neon" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => onCategoryChange(category.slug)}
              >
                <Icon className="w-4 h-4" />
                {category.title_pt}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Special Tags */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Tags Especiais
        </h4>
        
        <div className="flex flex-wrap gap-2">
          {specialTags.map((tag) => {
            const Icon = tag.icon;
            const isSelected = selectedTags.includes(tag.name);
            
            return (
              <Badge
                key={tag.name}
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                  isSelected && tag.color === 'biscoito' ? 'bg-biscoito text-biscoito-foreground' : ''
                }`}
                onClick={() => toggleTag(tag.name)}
              >
                <Icon className="w-3 h-3 mr-1" />
                {tag.name}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Idiomas
        </h4>
        
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm">🇧🇷 PT</Button>
          <Button variant="outline" size="sm">🇺🇸 EN</Button>
          <Button variant="outline" size="sm">🇪🇸 ES</Button>
          <Button variant="outline" size="sm">🇫🇷 FR</Button>
        </div>
      </div>

      {/* Clear Filters */}
      {(selectedCategory || selectedTags.length > 0) && (
        <Button 
          variant="destructive" 
          size="sm" 
          className="w-full"
          onClick={() => {
            onCategoryChange(undefined);
            onTagChange([]);
          }}
        >
          Limpar Filtros
        </Button>
      )}
    </div>
  );
}