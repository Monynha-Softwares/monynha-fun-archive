-- Insert sample videos for demonstration
INSERT INTO public.videos (
  title, 
  description, 
  embed_url, 
  platform, 
  platform_id,
  language, 
  status, 
  votes_count
) VALUES 
(
  'Como fazer sabão caseiro - Tutorial da Vovó',
  'Aprenda a fazer sabão artesanal com ingredientes simples. Uma receita tradicional que passou de geração em geração.',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'youtube',
  'dQw4w9WgXcQ',
  'pt',
  'approved',
  23
),
(
  'Gato pianista tocando Beethoven',
  'Um gatinho talentoso tocando piano de forma adorável. Viral desde 2019!',
  'https://www.youtube.com/watch?v=FtutLA63Cp8',
  'youtube', 
  'FtutLA63Cp8',
  'en',
  'approved',
  45
),
(
  'Dance do Créu - Clássico dos memes brasileiros',
  'O meme que marcou uma geração! Dance do Créu original que viralizou no início dos anos 2000.',
  'https://www.youtube.com/watch?v=VFr_zlBBa_k',
  'youtube',
  'VFr_zlBBa_k', 
  'pt',
  'approved',
  67
),
(
  'Tutorial: Como consertar impressora (método científico)',
  'O tutorial mais honesto sobre como consertar impressoras que você vai encontrar.',
  'https://www.youtube.com/watch?v=N9wsjroVlu8',
  'youtube',
  'N9wsjroVlu8',
  'pt',
  'approved',
  34
),
(
  'Cachorro cantando parabéns',
  'Um golden retriever talentoso cantando parabéns para seu dono. Muito fofo!',
  'https://www.youtube.com/watch?v=12345abcde',
  'youtube',
  '12345abcde',
  'pt',
  'pending',
  7
),
(
  'Receita de brigadeiro da titia',
  'Como fazer o brigadeiro perfeito com dicas secretas da família.',
  'https://www.youtube.com/watch?v=67890fghij',
  'youtube',
  '67890fghij',
  'pt', 
  'pending',
  3
);

-- Get the video IDs for tagging
DO $$
DECLARE
    video_sabao_id UUID;
    video_gato_id UUID;
    video_creu_id UUID;
    video_impressora_id UUID;
    video_cachorro_id UUID;
    video_brigadeiro_id UUID;
    tag_tutorial_id UUID;
    tag_viral_id UUID;
    tag_classico_id UUID;
    tag_engracado_id UUID;
    tag_biscoito_id UUID;
    category_educacao_id UUID;
    category_memes_id UUID;
    category_receitas_id UUID;
    category_tecnologia_id UUID;
BEGIN
    -- Get video IDs
    SELECT id INTO video_sabao_id FROM public.videos WHERE title = 'Como fazer sabão caseiro - Tutorial da Vovó';
    SELECT id INTO video_gato_id FROM public.videos WHERE title = 'Gato pianista tocando Beethoven';
    SELECT id INTO video_creu_id FROM public.videos WHERE title = 'Dance do Créu - Clássico dos memes brasileiros';
    SELECT id INTO video_impressora_id FROM public.videos WHERE title = 'Tutorial: Como consertar impressora (método científico)';
    SELECT id INTO video_cachorro_id FROM public.videos WHERE title = 'Cachorro cantando parabéns';
    SELECT id INTO video_brigadeiro_id FROM public.videos WHERE title = 'Receita de brigadeiro da titia';
    
    -- Get tag IDs
    SELECT id INTO tag_tutorial_id FROM public.tags WHERE name = 'tutorial';
    SELECT id INTO tag_viral_id FROM public.tags WHERE name = 'viral';
    SELECT id INTO tag_classico_id FROM public.tags WHERE name = 'classico';
    SELECT id INTO tag_engracado_id FROM public.tags WHERE name = 'engraçado';
    SELECT id INTO tag_biscoito_id FROM public.tags WHERE name = 'biscoito';
    
    -- Get category IDs
    SELECT id INTO category_educacao_id FROM public.categories WHERE slug = 'educacao';
    SELECT id INTO category_memes_id FROM public.categories WHERE slug = 'memes';
    SELECT id INTO category_receitas_id FROM public.categories WHERE slug = 'receitas';
    SELECT id INTO category_tecnologia_id FROM public.categories WHERE slug = 'tecnologia';
    
    -- Tag videos
    INSERT INTO public.video_tags (video_id, tag_id) VALUES
        (video_sabao_id, tag_tutorial_id),
        (video_gato_id, tag_viral_id),
        (video_gato_id, tag_engracado_id),
        (video_creu_id, tag_classico_id),
        (video_creu_id, tag_viral_id),
        (video_creu_id, tag_biscoito_id),
        (video_impressora_id, tag_tutorial_id),
        (video_impressora_id, tag_engracado_id),
        (video_cachorro_id, tag_engracado_id),
        (video_brigadeiro_id, tag_tutorial_id);
    
    -- Categorize videos
    INSERT INTO public.video_categories (video_id, category_id) VALUES
        (video_sabao_id, category_educacao_id),
        (video_sabao_id, category_receitas_id),
        (video_gato_id, category_memes_id),
        (video_creu_id, category_memes_id),
        (video_impressora_id, category_tecnologia_id),
        (video_impressora_id, category_educacao_id),
        (video_cachorro_id, category_memes_id),
        (video_brigadeiro_id, category_receitas_id);  -- Added missing category_id for brigadeiro video
END $$;
