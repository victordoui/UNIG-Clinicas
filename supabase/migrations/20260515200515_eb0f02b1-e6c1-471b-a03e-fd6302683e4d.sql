UPDATE public.council_members SET nome_exibicao = v.nome, foto_url = v.foto FROM (VALUES
 ('baf2cc34-daca-4906-8a35-85973366e4ad'::uuid, 'João Silva', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces'),
 ('a7f898f2-6dc8-419c-95dc-676c6579163b'::uuid, 'Maria Oliveira', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces'),
 ('869200f9-d76b-439a-84cf-4d63f9267f18'::uuid, 'Pedro Santos', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces'),
 ('85cc7167-92ec-48bd-a510-e089b3eb5820'::uuid, 'Ana Costa', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces'),
 ('aa7c87e2-7275-46b5-9571-82b2dd96af1b'::uuid, 'Ricardo Almeida', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=faces')
) AS v(uid, nome, foto) WHERE council_members.user_id = v.uid;