// One-shot: cria bucket público `cover-presets` e faz upload das imagens
// dos presets do banner (baixando de URLs informadas no body).
//
// POST body: { presets: [{ file: string; sourceUrl: string }] }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'cover-presets';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function contentTypeFor(file: string): string {
  const f = file.toLowerCase();
  if (f.endsWith('.webp')) return 'image/webp';
  if (f.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const presets: { file: string; sourceUrl: string }[] = body.presets ?? [];
    if (!presets.length) {
      return new Response(JSON.stringify({ error: 'missing presets payload [{file,sourceUrl}]' }), {
        status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) Ensure bucket exists (public)
    const { data: bucket } = await admin.storage.getBucket(BUCKET);
    if (!bucket) {
      const { error: cErr } = await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
      });
      if (cErr) throw new Error(`createBucket: ${cErr.message}`);
    } else if (!bucket.public) {
      await admin.storage.updateBucket(BUCKET, { public: true });
    }

    const results: any[] = [];
    for (const p of presets) {
      try {
        const r = await fetch(p.sourceUrl);
        if (!r.ok) {
          results.push({ file: p.file, ok: false, error: `fetch ${r.status}` });
          continue;
        }
        const buf = new Uint8Array(await r.arrayBuffer());
        const ct = contentTypeFor(p.file);
        const { error: upErr } = await admin.storage.from(BUCKET).upload(p.file, buf, {
          contentType: ct, upsert: true, cacheControl: '31536000',
        });
        if (upErr) {
          results.push({ file: p.file, ok: false, error: upErr.message });
          continue;
        }
        const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(p.file);
        results.push({ file: p.file, ok: true, url: pub.publicUrl, size: buf.length });
      } catch (e) {
        results.push({ file: p.file, ok: false, error: String((e as any)?.message ?? e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, bucket: BUCKET, results }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});
