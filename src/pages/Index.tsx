import { useState, useEffect, useRef, useCallback, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Header } from "@/components/Header";
import { VideoGrid } from "@/components/VideoGrid";
import { CategoryFilter } from "@/components/CategoryFilter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, TrendingUp, Clock, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { filterVideos, FilterableVideo } from "@/lib/video-filter";
import { SubmitVideoDialog } from "@/components/SubmitVideoDialog";
import { useAuth } from "@/hooks/use-auth";

interface Video extends FilterableVideo {
  id: string;
  title: string;
  description?: string;
  embed_url: string;
  platform: string;
  language: string;
  status: string;
  votes_count: number;
  hasVoted?: boolean;
  created_at: string;
  tags?: Array<{
    name: string;
    is_special: boolean;
    color?: string;
  }>;
}

interface Category {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string;
  title_es: string;
  title_fr: string;
}

interface Tag {
  id: string;
  name: string;
  is_special: boolean | null;
  color?: string | null;
}

const Index = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [pendingVideos, setPendingVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"approved" | "pending">("approved");
  const [loading, setLoading] = useState(true);
  const [totalVotes, setTotalVotes] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const approvedSectionRef = useRef<HTMLDivElement | null>(null);
  const pendingSectionRef = useRef<HTMLDivElement | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      const [approvedResponse, pendingResponse, categoriesResponse, tagsResponse] = await Promise.all([
        supabase
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
          .order('created_at', { ascending: false }),
        supabase
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
          .order('votes_count', { ascending: false }),
        supabase
          .from('categories')
          .select('id, slug, title_pt, title_en, title_es, title_fr')
          .order('title_pt'),
        supabase
          .from('tags')
          .select('id, name, color, is_special')
          .order('name'),
      ]);

      if (approvedResponse.error) throw approvedResponse.error;
      if (pendingResponse.error) throw pendingResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;
      if (tagsResponse.error) throw tagsResponse.error;

      const approvedData = approvedResponse.data ?? [];
      const pendingData = pendingResponse.data ?? [];
      const categoriesData = categoriesResponse.data ?? [];
      const tagsData = tagsResponse.data ?? [];

      let userVotes = new Set<string>();

      if (user?.id && pendingData.length > 0) {
        const { data: userVotesData, error: userVotesError } = await supabase
          .from('suggestions')
          .select('video_id')
          .eq('user_id', user.id)
          .in('video_id', pendingData.map(video => video.id));

        if (userVotesError) throw userVotesError;

        userVotes = new Set(userVotesData?.map(vote => vote.video_id));
      }

      const transformVideos = (data: any[], voteSet?: Set<string>) => data.map(video => ({
        ...video,
        tags: video.video_tags?.map((vt: any) => vt.tags).filter(Boolean) || [],
        video_categories: video.video_categories?.map((vc: any) => ({
          category: vc.category,
        })).filter(Boolean) || [],
        hasVoted: voteSet?.has(video.id) ?? false,
      }));

      setVideos(transformVideos(approvedData));
      setPendingVideos(transformVideos(pendingData, userVotes));
      setCategories(categoriesData);
      setTags(tagsData);

      const aggregatedVotes = [...approvedData, ...pendingData].reduce((sum, video) => {
        return sum + (video?.votes_count ?? 0);
      }, 0);

      setTotalVotes(aggregatedVotes);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os vídeos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [toast, user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

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
      await fetchData(false);
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: "Erro ao votar",
        description: "Não foi possível registrar seu voto. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitVideo = () => {
    if (!user) {
      toast({
        title: "Faça login para submeter",
        description: "Crie uma conta ou entre para compartilhar vídeos com a comunidade.",
      });
      navigate("/login");
      return;
    }

    setIsSubmitOpen(true);
  };

  const handleVideoSubmitted = ({
    video,
    categoryIds,
    tagIds,
  }: {
    video: Tables<'videos'>;
    categoryIds: string[];
    tagIds: string[];
  }) => {
    const categoryLookup = new Map(categories.map((category) => [category.id, category]));
    const tagLookup = new Map(tags.map((tag) => [tag.id, tag]));

    const newVideo: Video = {
      ...video,
      tags: tagIds
        .map((tagId) => tagLookup.get(tagId))
        .filter((tag): tag is Tag => Boolean(tag))
        .map((tag) => ({
          name: tag.name,
          is_special: Boolean(tag.is_special),
          color: tag.color ?? undefined,
        })),
      video_categories: categoryIds
        .map((categoryId) => categoryLookup.get(categoryId))
        .filter((category): category is Category => Boolean(category))
        .map((category) => ({
          category: {
            slug: category.slug,
          },
        })),
      hasVoted: false,
    };

    setPendingVideos((prev) => [newVideo, ...prev]);
    setTotalVotes((prev) => prev + (video.votes_count ?? 0));
    setActiveTab("pending");
    requestAnimationFrame(() => {
      pendingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
    <>
      <SubmitVideoDialog
        open={isSubmitOpen}
        onOpenChange={setIsSubmitOpen}
        categories={categories}
        tags={tags}
        onSubmitted={handleVideoSubmitted}
      />
      <div className="min-h-screen bg-background">
        <Header onSearch={handleSearch} onSubmitVideo={handleSubmitVideo} totalVotes={totalVotes} />
      
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
    </>
  );
};

export default Index;
