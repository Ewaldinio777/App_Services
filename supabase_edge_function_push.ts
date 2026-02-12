// Sigue esta guía para desplegar: https://supabase.com/docs/guides/functions
// O crea la función 'push-notification' desde el Dashboard de Supabase y pega este código.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface NotificationRecord {
  id: string
  user_id: string
  title: string
  body: string
  type: string
  related_id?: string
  created_at: string
}

interface WebhookPayload {
  type: 'INSERT'
  table: string
  record: NotificationRecord
  schema: string
  old_record: null | NotificationRecord
}

Deno.serve(async (req) => {
  const payload: WebhookPayload = await req.json()
  
  // Solo nos interesa cuando se CREA una nueva notificación
  if (payload.type !== 'INSERT') {
    return new Response('Not an INSERT event', { status: 200 })
  }

  const { record } = payload

  // 1. Inicializar cliente Supabase (Admin) para poder leer el token del usuario
  // Necesitas poner estas variables en tu archivo .env de la Edge Function o en los Secretos del Dashboard
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  // 2. Obtener el Push Token del usuario destino
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', record.user_id)
    .single()

  if (userError || !userData?.push_token) {
    console.log(`No push token found for user ${record.user_id}`)
    return new Response('No push token found', { status: 200 })
  }

  const pushToken = userData.push_token
  
  // Validar que sea un token de Expo válido
  if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
      console.log(`Invalid Expo Push Token: ${pushToken}`)
      return new Response('Invalid token', { status: 200 })
  }

  // 3. Preparar el mensaje para Expo
  const message = {
    to: pushToken,
    sound: 'default',
    title: record.title,
    body: record.body,
    data: { 
        // Pasamos datos extra para que la app sepa a dónde navegar
        type: record.type,
        related_id: record.related_id,
        notification_id: record.id
    },
  }

  // 4. Enviar a Expo Push API
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  const data = await res.json()
  console.log('Expo Push Response:', data)

  return new Response(JSON.stringify(data), { 
      headers: { 'Content-Type': 'application/json' },
      status: 200 
  })
})
