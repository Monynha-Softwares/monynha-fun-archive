import { useState, useEffect, useRef, type RefObject } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { VideoGrid } from "@/components/VideoGrid";
import { CategoryFilter } from "@/components/CategoryFilter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, TrendingUp, Clock, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { filterVideos, FilterableVideo } from "@/lib/video-filter";

interface Video extends FilterableVideo {
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
}

interface Category {
  slug: string;
  title_pt: string;
  title_en: string;
  title_es: string;
  title_fr: string;
}

const Index = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [pendingVideos, setPendingVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"approved" | "pending">("approved");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const approvedSectionRef = useRef<HTMLDivElement | null>(null);
  const pendingSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch approved videos
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select(`
          *,
          video_tags (
            tags (name, is_special, color)
          ),
          video_categories (
            category: categories (slug)
          )
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      // Fetch pending videos
      const { data: pendingData, error: pendingError } = await supabase
        .from('videos')
        .select(`
          *,
          video_tags (
            tags (name, is_special, color)
          ),
          video_categories (
            category: categories (slug)
          )
        `)
        .eq('status', 'pending')
        .order('votes_count', { ascending: false });

      if (pendingError) throw pendingError;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('title_pt');

      if (categoriesError) throw categoriesError;

      // Transform data
      const transformVideos = (data: any[]) => data.map(video => ({
        ...video,
        tags: video.video_tags?.map((vt: any) => vt.tags).filter(Boolean) || [],
        video_categories: video.video_categories?.map((vc: any) => ({
          category: vc.category,
        })).filter(Boolean) || [],
      }));

      setVideos(transformVideos(videosData || []));
      setPendingVideos(transformVideos(pendingData || []));
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os vídeos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleLanguageChange = (language: string | undefined) => {
    setSelectedLanguage(language);
  };

  const handleVote = async (videoId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Login necessário",
          description: "Você precisa estar logado para votar.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('suggestions')
        .insert({
          video_id: videoId,
          user_id: user.id,
          vote: 1
        });

      if (error) throw error;

      toast({
        title: "Voto registrado! 🎉",
        description: "Seu voto foi computado para publicação deste vídeo.",
      });

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: "Erro ao votar",
        description: "Não foi possível registrar seu voto. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const filteredVideos = filterVideos(
    videos,
    selectedCategory,
    selectedTags,
    searchQuery,
    selectedLanguage
  );
  const filteredPendingVideos = filterVideos(
    pendingVideos,
    selectedCategory,
    selectedTags,
    searchQuery,
    selectedLanguage
  );

  const scrollToSection = (
    sectionRef: RefObject<HTMLDivElement>,
    tabToActivate?: "approved" | "pending"
  ) => {
    if (tabToActivate) {
      setActiveTab(tabToActivate);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
      return;
    }

    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={handleSearch} />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark opacity-50" />
        <div className="container mx-auto text-center relative z-10">
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-rainbow bg-clip-text text-transparent animate-neon-pulse">
              Monynha Fun
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              A plataforma de curadoria coletiva das <span className="text-primary font-semibold">pérolas da internet</span> 🎬✨
            </p>
            <p className="text-lg text-muted-foreground">
              YouTube reverso: só vira público se a galera curtir! 🔥
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Button
                variant="neon"
                size="lg"
                className="gap-2"
                onClick={() => scrollToSection(approvedSectionRef, "approved")}
              >
                <Zap className="w-5 h-5" />
                Explorar Acervo
              </Button>
              <Button
                variant="cyber"
                size="lg"
                className="gap-2"
                onClick={() => scrollToSection(pendingSectionRef, "pending")}
              >
                <Crown className="w-5 h-5" />
                Votar em Pendentes
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                selectedTags={selectedTags}
                onTagChange={setSelectedTags}
                selectedLanguage={selectedLanguage}
                onLanguageChange={handleLanguageChange}
              />
            </Card>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <Tabs
              value={activeTab}
              onValueChange={value => setActiveTab(value as "approved" | "pending")}
              className="space-y-8"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="approved" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Acervo Aprovado
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Aguardando Votos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="approved" className="space-y-8">
                <div ref={approvedSectionRef}>
                  <VideoGrid
                    videos={filteredVideos}
                    title="🏆 Pérolas Aprovadas pela Comunidade"
                    loading={loading}
                  />
                </div>
              </TabsContent>

              <TabsContent value="pending" className="space-y-8">
                <div ref={pendingSectionRef}>
                  <VideoGrid
                    videos={filteredPendingVideos}
                    title="⏳ Vídeos Aguardando Aprovação"
                    showVoteButton={true}
                    onVote={handleVote}
                    loading={loading}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Index;
