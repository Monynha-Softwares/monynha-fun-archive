-- Create categories table for video classification
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title_pt TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create videos table - core content table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  embed_url TEXT NOT NULL,
  platform TEXT NOT NULL, -- youtube, vimeo, tiktok, instagram
  platform_id TEXT NOT NULL, -- video ID from the platform
  language TEXT NOT NULL DEFAULT 'pt', -- pt, en, es, fr
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  storage_mode TEXT NOT NULL DEFAULT 'embed', -- embed, hosted
  votes_count INTEGER NOT NULL DEFAULT 0,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tags table for free-form tagging
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_special BOOLEAN DEFAULT FALSE, -- for special tags like "biscoito"
  color TEXT, -- hex color for tag display
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video_tags junction table (many-to-many)
CREATE TABLE public.video_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, tag_id)
);

-- Create video_categories junction table (many-to-many)
CREATE TABLE public.video_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, category_id)
);

-- Create suggestions table for community voting
CREATE TABLE public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote INTEGER NOT NULL DEFAULT 1, -- 1 for upvote, -1 for downvote
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- user, moderator, admin
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories (public read)
CREATE POLICY "Categories are viewable by everyone" 
ON public.categories FOR SELECT USING (true);

CREATE POLICY "Only admins can manage categories" 
ON public.categories FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- RLS Policies for videos
CREATE POLICY "Approved videos are viewable by everyone" 
ON public.videos FOR SELECT 
USING (status = 'approved');

CREATE POLICY "Users can view their own submitted videos" 
ON public.videos FOR SELECT 
USING (submitted_by = auth.uid());

CREATE POLICY "Moderators and admins can view all videos" 
ON public.videos FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')
));

CREATE POLICY "Authenticated users can submit videos" 
ON public.videos FOR INSERT 
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update their own pending videos" 
ON public.videos FOR UPDATE 
USING (submitted_by = auth.uid() AND status = 'pending');

CREATE POLICY "Moderators and admins can update any video" 
ON public.videos FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')
));

-- RLS Policies for tags (public read, admin write)
CREATE POLICY "Tags are viewable by everyone" 
ON public.tags FOR SELECT USING (true);

CREATE POLICY "Only admins can manage tags" 
ON public.tags FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- RLS Policies for video_tags
CREATE POLICY "Video tags are viewable by everyone" 
ON public.video_tags FOR SELECT USING (true);

CREATE POLICY "Users can tag their videos" 
ON public.video_tags FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.videos 
  WHERE id = video_id AND submitted_by = auth.uid()
));

-- RLS Policies for suggestions (voting)
CREATE POLICY "Users can view all suggestions" 
ON public.suggestions FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can vote on videos" 
ON public.suggestions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" 
ON public.suggestions FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update votes count
CREATE OR REPLACE FUNCTION update_video_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos 
    SET votes_count = votes_count + NEW.vote 
    WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.videos 
    SET votes_count = votes_count + (NEW.vote - OLD.vote) 
    WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos 
    SET votes_count = votes_count - OLD.vote 
    WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic vote counting
CREATE TRIGGER update_video_votes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION update_video_votes();

-- Create function to automatically approve videos with enough votes
CREATE OR REPLACE FUNCTION auto_approve_videos()
RETURNS TRIGGER AS $$
DECLARE
  approval_threshold INTEGER := 10; -- 10 votes needed for auto-approval
BEGIN
  IF NEW.votes_count >= approval_threshold AND OLD.status = 'pending' THEN
    UPDATE public.videos 
    SET status = 'approved', approved_at = now() 
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-approval
CREATE TRIGGER auto_approve_videos_trigger
  AFTER UPDATE OF votes_count ON public.videos
  FOR EACH ROW EXECUTE FUNCTION auto_approve_videos();

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert default categories
INSERT INTO public.categories (slug, title_pt, title_en, title_es, title_fr, description) VALUES
  ('educacao', 'Educação', 'Education', 'Educación', 'Éducation', 'Vídeos educacionais e tutoriais'),
  ('memes', 'Memes', 'Memes', 'Memes', 'Mèmes', 'Conteúdo humorístico e viral'),
  ('cultura', 'Cultura', 'Culture', 'Cultura', 'Culture', 'Vídeos culturais e históricos'),
  ('receitas', 'Receitas', 'Recipes', 'Recetas', 'Recettes', 'Receitas e culinária'),
  ('musica', 'Música', 'Music', 'Música', 'Musique', 'Vídeos musicais e performances'),
  ('tecnologia', 'Tecnologia', 'Technology', 'Tecnología', 'Technologie', 'Conteúdo sobre tecnologia');

-- Insert special tags
INSERT INTO public.tags (name, is_special, color) VALUES
  ('biscoito', true, '#FF6B35'),
  ('viral', false, '#FF00FF'),
  ('classico', false, '#00FFFF'),
  ('nostalgico', false, '#9B59B6'),
  ('tutorial', false, '#2ECC71'),
  ('engraçado', false, '#F39C12');