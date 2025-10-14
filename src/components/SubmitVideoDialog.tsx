import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface CategoryOption {
  id: string;
  slug: string;
  title_pt: string;
}

interface TagOption {
  id: string;
  name: string;
  color?: string | null;
  is_special?: boolean | null;
}

interface SubmitVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  tags: TagOption[];
  onSubmitted?: (payload: { video: Tables<"videos">; categoryIds: string[]; tagIds: string[] }) => void;
}

const formSchema = z.object({
  title: z.string().min(3, "Informe um título para o vídeo"),
  url: z.string().url("Insira uma URL válida"),
  description: z.string().optional(),
  language: z.string().min(2, "Selecione um idioma"),
  categories: z.array(z.string()).min(1, "Escolha pelo menos uma categoria"),
  tags: z.array(z.string()).default([]),
});

const defaultValues = {
  title: "",
  url: "",
  description: "",
  language: "pt",
  categories: [] as string[],
  tags: [] as string[],
};

const languageOptions = [
  { value: "pt", label: "Português" },
  { value: "en", label: "Inglês" },
  { value: "es", label: "Espanhol" },
  { value: "fr", label: "Francês" },
];

const parseVideoUrl = (url: string) => {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "");
      return {
        platform: "youtube",
        platformId: videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
      };
    }

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v") ?? parsed.pathname.split("/").pop();
      if (videoId) {
        return {
          platform: "youtube",
          platformId: videoId,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
        };
      }
    }

    return {
      platform: parsed.hostname,
      platformId: url,
      embedUrl: url,
    };
  } catch (error) {
    console.warn("Unable to parse URL", error);
    return {
      platform: "external",
      platformId: url,
      embedUrl: url,
    };
  }
};

export const SubmitVideoDialog = ({
  open,
  onOpenChange,
  categories,
  tags,
  onSubmitted,
}: SubmitVideoDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Faça login para continuar",
        description: "Você precisa estar autenticado para submeter um vídeo.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { platform, platformId, embedUrl } = parseVideoUrl(values.url);
      const { data, error } = await supabase
        .from("videos")
        .insert({
          title: values.title,
          description: values.description,
          embed_url: embedUrl,
          platform,
          platform_id: platformId,
          language: values.language,
          status: "pending",
          storage_mode: "remote",
          submitted_by: user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Não foi possível criar o vídeo. Tente novamente.");
      }

      if (values.categories.length > 0) {
        const categoryPayload = values.categories.map((categoryId) => ({
          video_id: data.id,
          category_id: categoryId,
        }));

        const { error: categoriesError } = await supabase.from("video_categories").insert(categoryPayload);
        if (categoriesError) {
          throw categoriesError;
        }
      }

      if (values.tags.length > 0) {
        const tagPayload = values.tags.map((tagId) => ({
          video_id: data.id,
          tag_id: tagId,
        }));

        const { error: tagsError } = await supabase.from("video_tags").insert(tagPayload);
        if (tagsError) {
          throw tagsError;
        }
      }

      toast({
        title: "Vídeo enviado!",
        description: "Seu vídeo foi enviado para aprovação. Obrigado por contribuir!",
      });

      onSubmitted?.({
        video: data,
        categoryIds: values.categories,
        tagIds: values.tags,
      });

      form.reset(defaultValues);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to submit video", error);
      toast({
        title: "Erro ao enviar",
        description: error.message ?? "Não foi possível submeter o vídeo agora.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submeter um novo vídeo</DialogTitle>
          <DialogDescription>
            Compartilhe um link incrível com a comunidade. Revisaremos rapidamente e liberaremos para a votação.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Como devemos chamar este vídeo?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do vídeo</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.youtube.com/watch?v=..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Conte um pouco sobre o vídeo ou deixe um recado." rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idioma principal</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o idioma" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languageOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <ScrollArea className="h-32 rounded-md border p-3">
                      <div className="space-y-2">
                        {tags.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tag disponível.</p>}
                        {tags.map((tag) => (
                          <div key={tag.id} className="flex items-center space-x-3">
                            <Checkbox
                              checked={field.value?.includes(tag.id)}
                              onCheckedChange={(checked) => {
                                const isChecked = Boolean(checked);
                                if (isChecked) {
                                  field.onChange([...(field.value ?? []), tag.id]);
                                } else {
                                  field.onChange((field.value ?? []).filter((value) => value !== tag.id));
                                }
                              }}
                            />
                            <FormLabel className="font-normal">
                              <Badge variant={tag.is_special ? "default" : "secondary"}>{tag.name}</Badge>
                            </FormLabel>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorias</FormLabel>
                  <ScrollArea className="h-40 rounded-md border p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-3">
                          <Checkbox
                            checked={field.value?.includes(category.id)}
                            onCheckedChange={(checked) => {
                              const isChecked = Boolean(checked);
                              if (isChecked) {
                                field.onChange([...(field.value ?? []), category.id]);
                              } else {
                                field.onChange((field.value ?? []).filter((value) => value !== category.id));
                              }
                            }}
                          />
                          <FormLabel className="font-normal">{category.title_pt}</FormLabel>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar vídeo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
