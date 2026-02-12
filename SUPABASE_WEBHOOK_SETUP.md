# Configuración de Webhook para Notificaciones Push Automáticas

Para automatizar el envío de notificaciones cuando se crea un registro en la tabla `notifications`, seguiremos estos pasos:

## 1. Desplegar la Edge Function

He creado el código de la función en `supabase/functions/push-notification/index.ts`. Esta función:
1. Escucha cambios en la base de datos (Insert de notificaciones).
2. Busca el `push_token` del usuario destinatario en la tabla `profiles`.
3. Envía la notificación a los servidores de Expo.

### Pasos para desplegar:

1.  Asegúrate de tener instalada la CLI de Supabase y haber iniciado sesión:
    ```bash
    npx supabase login
    ```

2.  Vincula tu proyecto local con tu proyecto en la nube (necesitas el ID de tu proyecto, ej: `abcdefghijklm`):
    ```bash
    npx supabase link --project-ref TU_PROYECTO_ID
    ```

3.  Despliega la función:
    ```bash
    npx supabase functions deploy push-notification
    ```
    *(Nota: Al desplegar, se te dará una URL de la función, guárdala, aunque la configuraremos automáticamente desde el Dashboard).*

## 2. Configurar el Database Webhook (Desde el Dashboard)

La forma más sencilla de conectar la tabla `notifications` con tu nueva función es a través del panel de control de Supabase.

1.  Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2.  Navega a **Database** (icono de base de datos en la barra lateral) -> **Webhooks**.
3.  Haz clic en **"Create a new webhook"**.
4.  Configura los campos así:
    *   **Name**: `enviar-notificacion-push`
    *   **Table**: `notifications`
    *   **Events**: Marca únicamente **INSERT**.
    *   **Type**: Selecciona **Supabase Edge Functions**.
    *   **Edge Function**: Selecciona `push-notification` (debería aparecer si ya la desplegaste en el paso 1).
    *   **Method**: `POST`
    *   **HTTP Headers**: Deja los valores por defecto (`Content-type: application/json`, etc.).
5.  Haz clic en **Confirm** o **Create**.

¡Listo! A partir de ahora, cada vez que se inserte una fila en `notifications` (ya sea desde el backend, o desde algún trigger de base de datos), Supabase invocará tu función y enviará la notificación al usuario correspondiente.

## 3. Probar la integración

1.  Abre tu app en el celular (asegúrate de haber iniciado sesión para que tu `push_token` esté guardado).
2.  Ve al **SQL Editor** en Supabase y ejecuta una inserción de prueba para tu usuario:

```sql
-- Reemplaza 'TU_USER_ID' con el ID real de tu usuario (puedes verlo en la tabla auth.users o profiles)
INSERT INTO public.notifications (user_id, title, body, type, related_id)
VALUES 
('TU_USER_ID', 'Prueba de Webhook', '¡Si ves esto, la automatización funciona!', 'system', null);
```

Si todo es correcto, deberías recibir la notificación en tu celular en unos segundos.
