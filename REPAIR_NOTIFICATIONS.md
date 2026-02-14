# Guía para Reparar las Notificaciones

Si dejaste de recibir notificaciones, es probable que se deba a dos razones principales:

1.  **Falta de Permisos:** La aplicación intenta crear la notificación "buena" (con foto y detalles), pero la base de datos la bloquea.
2.  **Webhook Desconectado:** La Base de Datos no sabe que debe avisar a la Edge Function cuando llega una nueva notificación.

## Paso 1: Aplicar Permisos de Base de Datos
1.  Ve al **SQL Editor** en tu Dashboard de Supabase.
2.  Abre el archivo `fix_permissions.sql` que acabo de crear en tu proyecto (o copia su contenido).
3.  Ejecútalo. Esto permitirá que la App inserte las notificaciones en la tabla `notifications`.

## Paso 2: Configurar el Webhook (Conexión DB -> Edge Function)
El mensaje "antiguo" que borraste venía de un trigger automático. Ahora debemos activar el nuevo.

La forma más fácil y segura es desde el Dashboard de Supabase:
1.  Ve a **Database** -> **Webhooks**.
2.  Haz clic en **"Create a new webhook"**.
3.  **Name:** `send-push-notification`
4.  **Conditions:**
    *   Table: `public.notifications`
    *   Events: `INSERT` (Marcar solo INSERT)
5.  **Webhook Configuration:**
    *   **Method:** `POST`
    *   **URL:** `https://<TU_PROJECT_REF>.supabase.co/functions/v1/push-notification`
        *(Reemplaza `<TU_PROJECT_REF>` por el ID de tu proyecto, ej: `abcdefghijklm`)*
    *   **Timeout:** 1000 ms (o default)
6.  **HTTP Headers:**
    *   Add new header: `Authorization`
    *   Value: `Bearer <TU_ANON_KEY>`
        *(Tu clave pública `anon` que está en Project Settings > API)*
7.  Haz clic en **Confirm**.

## Resumen del Flujo Correcto:
1.  Usuario A realiza acción en la App.
2.  App inserta fila en tabla `notifications` (Gracias al Paso 1).
3.  Supabase detecta el INSERT y dispara el Webhook (Gracias al Paso 2).
4.  El Webhook llama a la Edge Function (`push-notification`).
5.  Edge Function lee el `push_token` del usuario destino y envía a Expo.
6.  Llega la notificación al celular con el texto correcto ("Illia solicita...").
