
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Get webhook URL from environment variable for security
const WEBHOOK_URL = Deno.env.get('WEBHOOK_URL')

interface NotificationPayload {
  productName: string
  quantity: number
  newStock: number
  email: string
  phone?: string
  category: string
  location?: string
  entryDate: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://id-preview--42f2b575-395a-4307-973b-102e344a58a4.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify JWT token for authentication
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401 
      }
    )
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401 
      }
    )
  }

  try {
    // Validate webhook URL is configured
    if (!WEBHOOK_URL) {
      throw new Error('WEBHOOK_URL environment variable not configured')
    }

    const payload: NotificationPayload = await req.json()
    
    // Input validation
    if (!payload.productName || !payload.email || payload.quantity === undefined) {
      throw new Error('Missing required fields: productName, email, or quantity')
    }

    // Formatar data para o formato brasileiro
    const formattedDate = new Date(payload.entryDate).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    // Preparar dados para envio ao webhook
    const webhookData = {
      event: 'product_entry',
      timestamp: new Date().toISOString(),
      product: {
        name: payload.productName,
        quantity: payload.quantity,
        newStock: payload.newStock,
        category: payload.category,
        location: payload.location || 'Não especificada',
        entryDate: payload.entryDate,
        formattedDate: formattedDate
      },
      notification: {
        email: payload.email,
        phone: payload.phone
      },
      message: `Entrada de produto registrada:

- Nome: ${payload.productName}
- Categoria: ${payload.category}
- Quantidade: ${payload.quantity}
- Data/Hora de Entrada: ${formattedDate}
- Localização no Estoque: ${payload.location || 'Não especificada'}`
    }

    // Enviar para o webhook
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Failed to send webhook: ${error}`)
    }

    const data = await res.text()

    return new Response(
      JSON.stringify({ success: true, webhookResponse: data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error sending notification:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
