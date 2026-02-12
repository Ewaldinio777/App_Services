// Documentación: https://supabase.com/docs/guides/functions
// Esta función espera recibir un payload de webhook por un "Database Webhook"
// que se configura en el panel de Supabase.

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
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: NotificationRecord
  schema: string
  old_record: null | NotificationRecord
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json()
    console.log('Webhook recibida:', payload)

    // Solo procesamos INSERT de notificaciones
    if (payload.type !== 'INSERT') {
      return new Response('Evento ignorado (no es INSERT)', { status: 200 })
    }

    const { record } = payload

    if (!record.user_id) {
        return new Response('No user_id found in record', { status: 400 })
    }

    // 1. Inicializar cliente Supabase (usamos variables de entorno que provee Supabase Functions)
    // SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son inyectadas automáticamente.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Necesitamos el Service Role para leer push_token de otro usuario sin restricciones RLS
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 2. Obtener el Push Token del usuario destinatario
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', record.user_id)
      .maybeSingle()

    if (userError) {
        console.error('Error fetching user profile:', userError)
        return new Response('Error fetching user', { status: 500 })
    }

    if (!userData?.push_token) {
      console.log(`Usuario ${record.user_id} no tiene push_token. Omitiendo notificación.`)
      return new Response('No push token found', { status: 200 })
    }

    const pushToken = userData.push_token

    // Validar formato básico de token Expo
    if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
        console.log(`Token inválido: ${pushToken}`)
        // Podríamos intentar borrarlo de la BD si es inválido
        return new Response('Invalid token format', { status: 200 })
    }

    // 3. Enviar a Expo Push API
    // https://docs.expo.dev/push-notifications/sending-notifications/
    const message = {
      to: pushToken,
      sound: 'default',
      title: record.title,
      body: record.body,
      data: { 
          // Pasamos datos para que la app navegue correctamente
          type: record.type,
          related_id: record.related_id,
          notification_id: record.id
      },
    }

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
    console.log('Expo API Response:', data)

    return new Response(JSON.stringify(data), { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
    })

  } catch (error) {
    console.error('Error procesando webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
