# Implementación de Notificaciones Push (Android)

Se ha configurado la infraestructura básica para receber notificaciones Push en dispositivos Android mediante Expo Development Build.

### Pasos Requeridos:

1.  **Base de Datos**:
    - Ejecuta el script SQL `add_push_token_to_profiles.sql` en tu panel de Supabase para añadir la columna `push_token` a la tabla `profiles`.

2.  **Configuración de Firebase (FCM)**:
    - Asegúrate de haber configurado las credenciales de Firebase Cloud Messaging (FCM) en tu proyecto de Expo (Expo Dashboard > Credentials > Android).
    - Esto es necesario para que las notificaciones funcionen en Android.

3.  **Reconstruir Development Client**:
    - Dado que se han añadido librerías nativas (`expo-notifications`, `expo-device`) y permisos al `app.json`.
    - Ejecuta: `eas build --profile development --platform android`
    - Instala el nuevo APK en tu dispositivo.

4.  **Backend Trigger (Supabase)**:
    - Actualmente, la app registra el token del dispositivo en la tabla `profiles`.
    - Para **enviar** la notificación cuando ocurre un evento (ej. nueva orden), debes crear un **Database Webhook** o una **Edge Function** en Supabase que llame a la API de Expo Push (`https://exp.host/--/api/v2/push/send`) usando el `push_token` del usuario destinatario.
    - El payload de la notificación debe incluir `data` con la estructura: `{"type": "order", "related_id": "uuid"}` para que la app navegue a la pantalla correcta al tocar la notificación.

### Probando Notificaciones:
- Puedes probar el envío manual usando la herramienta de Expo: https://expo.dev/notifications
- Copia el `push_token` de tu usuario desde la tabla `profiles` y envíale un mensaje de prueba.
