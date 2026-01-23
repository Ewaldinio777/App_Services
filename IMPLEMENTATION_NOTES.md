# App Services - Actualización de Navegación y Base de Datos

## Cambios Implementados

### 1. Navegación
- ✅ **Eliminada** la pestaña "Publicar" del Tab Navigator
- ✅ **Movido** el flujo "Convertirse en proveedor" a la pantalla Servicios
- ✅ **Creada** nueva pantalla de Notificaciones con navegación accionable
- ✅ **Actualizados** tipos de navegación (RootStackParamList, MainTabParamList)

### 2. Pantalla Servicios
- ✅ Icono de campana con badge de notificaciones no leídas
- ✅ Botón "Ser Proveedor" visible solo para no-proveedores
- ✅ Lista de proveedores destacados
- ✅ Navegación a categorías (Plomería, Electricidad, Limpieza)

### 3. Pantallas de Categorías
- ✅ ServiciosPlomeria: Lista de proveedores filtrados por "plomería"
- ✅ ServiciosElectricidad: Lista de proveedores filtrados por "electricidad"
- ✅ ServiciosLimpieza: Lista de proveedores filtrados por "limpieza"
- ✅ Cada tarjeta de proveedor muestra: nombre, especialización, rating, teléfono
- ✅ Navegación al detalle del proveedor

### 4. Nuevas Pantallas

#### Notificaciones
- Lista de notificaciones del usuario autenticado
- Marcado de notificaciones como leídas
- Navegación accionable según tipo (órdenes, chats, servicios)
- Badge visual para notificaciones no leídas
- Refresh pull-to-reload

#### BecomeProvider
- Formulario para convertirse en proveedor
- Actualiza `profiles.is_provider = true`
- Crea registro en tabla `providers` con:
  - id_number (cédula/RIF)
  - specialization
  - description
  - experience
  - phone

#### ProviderDetail
- Detalle completo del proveedor
- Información de contacto
- Lista de reseñas
- Rating promedio
- Botón de contacto

### 5. Pantallas Actualizadas

#### Chats
- Conectada a Supabase (tablas `chats` y `messages`)
- Lista de conversaciones ordenadas por última actividad
- Muestra nombre del otro participante
- Badge de mensajes no leídos
- Subscripción en tiempo real a cambios

#### Órdenes
- Conectada a Supabase (tabla `orders`)
- Filtros: Todas / Como Cliente / Como Proveedor
- Muestra estado con colores (Pendiente, Aceptada, En Progreso, Completada, Cancelada)
- Información completa: servicio, participantes, precio, descripción
- Subscripción en tiempo real a cambios

#### Perfil
- Conectada a Supabase (tabla `profiles`)
- Muestra información del usuario
- Edición de nombre completo
- Badge de tipo de cuenta (Cliente/Proveedor)
- Botón de cerrar sesión

### 6. Base de Datos

#### Tipos TypeScript Creados
`src/types/database.types.ts`:
- Profile
- Provider
- Service
- Order
- Chat
- Message
- Review
- Notification

#### Esquema SQL
`supabase_schema.sql` contiene:
- Definición de todas las tablas
- Índices para optimización
- Triggers para actualización automática
- Row Level Security (RLS) policies
- Funciones auxiliares

### 7. Estructura del Proyecto

```
src/
├── types/
│   └── database.types.ts       # Tipos TypeScript para BD
├── navigation/
│   ├── types.ts                # Tipos de navegación
│   ├── MainTabNavigator.tsx    # Tab navigator (sin Publicar)
│   └── screens/
│       ├── Servicios.tsx       # ✅ Actualizada
│       ├── Chats.tsx           # ✅ Actualizada  
│       ├── Ordenes.tsx         # ✅ Actualizada
│       ├── Perfil.tsx          # ✅ Actualizada
│       ├── ServiciosPlomeria.tsx    # ✅ Actualizada
│       ├── ServiciosElectricidad.tsx # ✅ Actualizada
│       ├── ServiciosLimpieza.tsx    # ✅ Actualizada
│       ├── Notificaciones.tsx       # ✅ Nueva
│       ├── BecomeProvider.tsx       # ✅ Nueva
│       └── ProviderDetail.tsx       # ✅ Nueva
└── lib/
    └── supabase-client.ts      # Cliente Supabase
```

## Configuración de Base de Datos

### Paso 1: Ejecutar el Schema SQL
1. Ir al panel de Supabase
2. SQL Editor
3. Ejecutar el contenido de `supabase_schema.sql`

### Paso 2: Verificar Tablas Creadas
- profiles
- providers
- services
- orders
- chats
- messages
- reviews
- notifications

### Paso 3: Verificar RLS
Todas las tablas tienen Row Level Security habilitada con políticas apropiadas.

## Funcionalidades Implementadas

### Notificaciones
- ✅ Lectura de notificaciones desde Supabase
- ✅ Contador de notificaciones no leídas
- ✅ Badge en icono de campana
- ✅ Marcar como leída al abrir
- ✅ Navegación accionable
- ✅ Subscripción en tiempo real

### Proveedores
- ✅ Lista de proveedores en Servicios
- ✅ Filtrado por especialización en categorías
- ✅ Detalle de proveedor con reviews
- ✅ Proceso de convertirse en proveedor
- ✅ Actualización automática de rating

### Chats
- ✅ Lista de conversaciones
- ✅ Información del otro participante
- ✅ Último mensaje
- ✅ Contador de mensajes no leídos
- ✅ Subscripción en tiempo real

### Órdenes
- ✅ Lista de órdenes del usuario
- ✅ Filtros por rol (cliente/proveedor)
- ✅ Estados visuales con colores
- ✅ Información completa
- ✅ Subscripción en tiempo real

### Perfil
- ✅ Visualización de datos
- ✅ Edición de información
- ✅ Indicador de tipo de cuenta
- ✅ Cerrar sesión

## Navegación

### Tabs Principales (4)
1. **Servicios** - Buscar y explorar servicios/proveedores
2. **Chats** - Conversaciones
3. **Órdenes** - Trabajos/solicitudes
4. **Perfil** - Información del usuario

### Stack Screens
- ServiciosPlomeria
- ServiciosElectricidad
- ServiciosLimpieza
- ProviderDetail
- BecomeProvider
- Notificaciones

## Próximos Pasos

### Funcionalidades Pendientes
- [ ] Pantalla de detalle de chat con mensajes
- [ ] Pantalla de detalle de orden
- [ ] Creación de nuevas órdenes
- [ ] Sistema de búsqueda de proveedores
- [ ] Filtros avanzados en categorías
- [ ] Carga de imágenes de perfil
- [ ] Carga de imágenes de servicios
- [ ] Sistema de pagos

### Mejoras Sugeridas
- [ ] Paginación en listas largas
- [ ] Caché de datos con react-query
- [ ] Optimistic updates
- [ ] Manejo de errores mejorado
- [ ] Animaciones de transición
- [ ] Testing unitario
- [ ] Testing de integración

## Notas Técnicas

### Dependencias Principales
- React Navigation v7
- Supabase JS v2
- React Native
- Expo
- TypeScript

### Convenciones de Código
- Componentes funcionales con hooks
- TypeScript strict mode
- Estilos con StyleSheet
- Subscripciones con cleanup en useEffect

### Supabase Realtime
Las siguientes tablas tienen subscripciones en tiempo real:
- notifications (en Servicios)
- messages (en Chats)
- orders (en Órdenes)

## Troubleshooting

### Problema: No se muestran proveedores
**Solución**: Verificar que existan registros en la tabla `providers` y que el campo `specialization` coincida con las búsquedas.

### Problema: Notificaciones no aparecen
**Solución**: Verificar RLS policies y que `user_id` coincida con el usuario autenticado.

### Problema: Error de navegación
**Solución**: Verificar que todos los screens estén registrados en App.tsx con los tipos correctos.

## Contacto y Soporte

Para preguntas o problemas, abrir un issue en el repositorio.
