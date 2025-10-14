import { useState, useRef, useMemo, useCallback, type RefObject } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

const videoSelect = `
  *,
  video_tags (
    tags (name, is_special, color)
  ),
  video_categories (
    category: categories (slug)
  )
`;

type RawVideo = Tables<"videos"> & {
  video_tags?: Array<{
    tags?: {
      name: string;
      is_special: boolean | null;
      color?: string | null;
    } | null;
  }> | null;
  video_categories?: Array<{
    category?: {
      slug: string;
    } | null;
  }> | null;
};

const transformVideos = (data: RawVideo[], voteSet?: Set<string>): Video[] =>
  data.map((video) => {
    const tags =
      video.video_tags
        ?.map((vt) => vt.tags)
        .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
        .map((tag) => ({
          name: tag.name,
          is_special: Boolean(tag.is_special),
          color: tag.color ?? undefined,
        })) ?? [];

    const videoCategories =
      video.video_categories
        ?.map((vc) =>
          vc.category
            ? {
                category: {
                  slug: vc.category.slug,
                },
              }
            : undefined
        )
        .filter((category): category is { category: { slug: string } } => Boolean(category)) ?? [];

    return {
      ...video,
      votes_count: video.votes_count ?? 0,
      tags,
      video_categories: videoCategories,
      hasVoted: voteSet?.has(video.id) ?? false,
    };
  });

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"approved" | "pending">("approved");
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const approvedSectionRef = useRef<HTMLDivElement | null>(null);
  const pendingSectionRef = useRef<HTMLDivElement | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const approvedQueryKey = ["videos", "approved"] as const;
  const pendingQueryKey = ["videos", "pending", { userId }] as const;
  const categoriesQueryKey = ["categories"] as const;
  const tagsQueryKey = ["tags"] as const;

  const handleQueryError = useCallback((error: unknown) => {
    console.error("Error fetching data:", error);
    toast({
      title: "Erro ao carregar dados",
      description: "Não foi possível carregar os vídeos. Tente novamente.",
      variant: "destructive",
    });
  }, [toast]);

  const approvedQuery = useQuery({
    queryKey: approvedQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select(videoSelect)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return transformVideos((data as RawVideo[]) ?? []);
    },
    onError: handleQueryError,
  });

  const pendingQuery = useQuery({
    queryKey: pendingQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select(videoSelect)
        .eq("status", "pending")
        .order("votes_count", { ascending: false });

      if (error) throw error;

      const pendingData = (data as RawVideo[]) ?? [];

      if (!userId || pendingData.length === 0) {
        return transformVideos(pendingData);
      }

      const { data: userVotesData, error: userVotesError } = await supabase
        .from("suggestions")
        .select("video_id")
        .eq("user_id", userId)
        .in(
          "video_id",
          pendingData.map((video) => video.id)
        );

      if (userVotesError) throw userVotesError;

      const voteSet = new Set(userVotesData?.map((vote) => vote.video_id));

      return transformVideos(pendingData, voteSet);
    },
    onError: handleQueryError,
  });

  const categoriesQuery = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, title_pt, title_en, title_es, title_fr")
        .order("title_pt");

      if (error) throw error;

      return (data as Category[]) ?? [];
    },
    onError: handleQueryError,
  });

  const tagsQuery = useQuery({
    queryKey: tagsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, color, is_special")
        .order("name");

      if (error) throw error;

      return (data as Tag[]) ?? [];
    },
    onError: handleQueryError,
  });

  const videos = approvedQuery.data ?? [];
  const pendingVideos = pendingQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];

  const totalVotes = useMemo(() => {
    return [...videos, ...pendingVideos].reduce((sum, video) => {
      return sum + (video?.votes_count ?? 0);
    }, 0);
  }, [videos, pendingVideos]);

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

      await queryClient.invalidateQueries({ queryKey: ["videos", "pending"] });
      await queryClient.invalidateQueries({ queryKey: ["videos", "approved"] });
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
      votes_count: video.votes_count ?? 0,
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

    queryClient.setQueryData<Video[]>(pendingQueryKey, (prev = []) => [newVideo, ...prev]);
    void queryClient.invalidateQueries({ queryKey: ["videos", "pending"] });
    setActiveTab("pending");
    requestAnimationFrame(() => {
      pendingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const filteredVideos = useMemo(
    () =>
      filterVideos(
        videos,
        selectedCategory,
        selectedTags,
        searchQuery,
        selectedLanguage
      ),
    [videos, selectedCategory, selectedTags, searchQuery, selectedLanguage]
  );
  const filteredPendingVideos = useMemo(
    () =>
      filterVideos(
        pendingVideos,
        selectedCategory,
        selectedTags,
        searchQuery,
        selectedLanguage
      ),
    [pendingVideos, selectedCategory, selectedTags, searchQuery, selectedLanguage]
  );

  const renderErrorState = (message: string) => (
    <div className="space-y-6">
      <div className="text-center py-12 border rounded-lg">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold mb-2">{message}</h3>
        <p className="text-muted-foreground">Tente atualizar a página ou volte mais tarde.</p>
      </div>
    </div>
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
                  {approvedQuery.isError
                    ? renderErrorState("Não foi possível carregar os vídeos aprovados")
                    : (
                      <VideoGrid
                        videos={filteredVideos}
                        title="🏆 Pérolas Aprovadas pela Comunidade"
                        loading={approvedQuery.isLoading}
                      />
                    )}
                </div>
              </TabsContent>

              <TabsContent value="pending" className="space-y-8">
                <div ref={pendingSectionRef}>
                  {pendingQuery.isError
                    ? renderErrorState("Não foi possível carregar os vídeos pendentes")
                    : (
                      <VideoGrid
                        videos={filteredPendingVideos}
                        title="⏳ Vídeos Aguardando Aprovação"
                        showVoteButton={true}
                        onVote={handleVote}
                        loading={pendingQuery.isLoading}
                      />
                    )}
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
