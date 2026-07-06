
-- 1) Limpa prefixos [TESTE] / [DEMO]
UPDATE public.council_proposals
SET titulo = regexp_replace(titulo, '^\[(TESTE|DEMO)\]\s*', '')
WHERE titulo ~ '^\[(TESTE|DEMO)\]';

-- 2) Adiciona imagens temáticas nas propostas sem foto
UPDATE public.council_proposals SET imagem_url = 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80'
  WHERE id = '60ad6503-51c3-4e5f-9cb2-3590274c4da1'; -- Cadeiras Herman Miller
UPDATE public.council_proposals SET imagem_url = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80'
  WHERE id = '9b442b61-7a51-4409-a489-fce2f09ce9f8'; -- Servidor Dell PowerEdge R760
UPDATE public.council_proposals SET imagem_url = 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=1200&q=80'
  WHERE id = '0180b24e-d614-4fac-84ac-caebdb6e64a3'; -- Refeitório
UPDATE public.council_proposals SET imagem_url = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=80'
  WHERE id = 'e2f7a7c8-afbb-47fb-a8d0-68542d6b8fec'; -- Notebooks Lenovo
UPDATE public.council_proposals SET imagem_url = 'https://images.unsplash.com/photo-1586768035401-cca7644dc12a?w=1200&q=80'
  WHERE id = '7a50afde-a3bd-4e67-982b-ee13f7af5cdb'; -- Van Fiat Ducato
UPDATE public.council_proposals SET imagem_url = 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=1200&q=80'
  WHERE id = '06ca8713-9d3d-4ffb-a1f2-c0b3718b6863'; -- Contrato Alpha Suprimentos
UPDATE public.council_proposals SET imagem_url = 'https://images.unsplash.com/photo-1572177812156-58036aae439c?w=1200&q=80'
  WHERE id = '133b8b0a-5770-4cf0-a6c9-0234f672bc2a'; -- CFTV
UPDATE public.council_proposals SET imagem_url = 'https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=1200&q=80'
  WHERE id = '9f159ad5-a732-4ddd-aac6-455ca1e26f37'; -- Microsoft 365
UPDATE public.council_proposals SET imagem_url = 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80'
  WHERE id = '38b55293-9275-4bed-94b0-9f21a9c2a967'; -- NR-35
UPDATE public.council_proposals SET imagem_url = 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=1200&q=80'
  WHERE id = '6e8dd927-83a5-4ca6-b858-10fde58c4e2f'; -- Equipamentos de áudio

-- 3) Preenche comentários faltantes nos votos
UPDATE public.council_votes SET comentario = CASE voto
  WHEN 'aprovado'  THEN 'Proposta bem fundamentada e alinhada às prioridades do conselho. Aprovo.'
  WHEN 'rejeitado' THEN 'Justificativa insuficiente para o investimento neste momento. Reprovo.'
  WHEN 'abstencao' THEN 'Sem informações técnicas suficientes para tomar posição. Abstenho-me.'
END
WHERE comentario IS NULL OR btrim(comentario) = '';
