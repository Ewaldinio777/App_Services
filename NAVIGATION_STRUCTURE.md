# App Services - Estructura de Navegación

## Diagrama de Navegación

```
┌─────────────────────────────────────────────────────────────────┐
│                        AUTH STACK                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Auth (Login)                                           │  │
│  │ • Register                                               │  │
│  │ • VerifyOTP                                              │  │
│  │ • ResetPassword                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    (Usuario autenticado)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       MAIN ROOT STACK                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    MAIN TABS (4 tabs)                     │ │
│  │                                                           │ │
│  │  ┌──────────┬──────────┬──────────┬──────────┐          │ │
│  │  │ Servicios│  Chats   │ Órdenes  │  Perfil  │          │ │
│  │  │  🔍      │   💬     │   📋     │   👤     │          │ │
│  │  └──────────┴──────────┴──────────┴──────────┘          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Stack Screens:                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ • ServiciosPlomeria        (Filtro: plomería)            │ │
│  │ • ServiciosElectricidad    (Filtro: electricidad)        │ │
│  │ • ServiciosLimpieza        (Filtro: limpieza)            │ │
│  │ • ProviderDetail           (Detalle del proveedor)       │ │
│  │ • BecomeProvider           (Formulario de registro)      │ │
│  │ • Notificaciones           (Lista de notificaciones)     │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flujos de Navegación

### 1. Servicios → Categoría → Proveedor
```
Servicios 🔍
  ├─ Click en "Plomería" → ServiciosPlomeria
  │   └─ Click en proveedor → ProviderDetail
  │       └─ Botón "Contactar"
  │
  ├─ Click en "Electricidad" → ServiciosElectricidad
  │   └─ Click en proveedor → ProviderDetail
  │
  └─ Click en "Limpieza" → ServiciosLimpieza
      └─ Click en proveedor → ProviderDetail
```

### 2. Servicios → Convertirse en Proveedor
```
Servicios 🔍
  └─ Click en "Ser Proveedor" → BecomeProvider
      └─ Llenar formulario → Éxito
          └─ Regresa a Servicios (ahora es proveedor)
```

### 3. Servicios → Notificaciones
```
Servicios 🔍
  └─ Click en 🔔 (Badge: 5) → Notificaciones
      ├─ Click en notif. tipo "order" → MainTabs (Órdenes)
      ├─ Click en notif. tipo "message" → MainTabs (Chats)
      └─ Click en notif. tipo "service" → ProviderDetail
```

### 4. Chats
```
Chats 💬
  └─ Lista de conversaciones
      └─ Click en chat → (Futuro: ChatDetail)
```

### 5. Órdenes
```
Órdenes 📋
  ├─ Filtro: "Todas"
  ├─ Filtro: "Como Cliente"
  └─ Filtro: "Como Proveedor"
      └─ Click en orden → (Futuro: OrderDetail)
```

### 6. Perfil
```
Perfil 👤
  ├─ Ver información
  ├─ Editar nombre
  └─ Cerrar sesión → Auth Stack
```

---

## Interacciones con Supabase

### Servicios
- **Lee:** profiles (is_provider), providers, notifications
- **Escribe:** -
- **Realtime:** notifications (badge actualizado en vivo)

### BecomeProvider
- **Lee:** -
- **Escribe:** profiles (is_provider), providers (nuevo registro)
- **Realtime:** -

### Notificaciones
- **Lee:** notifications
- **Escribe:** notifications (marcar como leída)
- **Realtime:** -

### ProviderDetail
- **Lee:** providers, profiles, reviews
- **Escribe:** -
- **Realtime:** -

### Chats
- **Lee:** chats, messages, profiles
- **Escribe:** -
- **Realtime:** messages (contador actualizado)

### Órdenes
- **Lee:** orders, profiles, services
- **Escribe:** -
- **Realtime:** orders (lista actualizada)

### Perfil
- **Lee:** profiles
- **Escribe:** profiles (full_name)
- **Realtime:** -

---

## Tablas de Supabase

```
┌─────────────────────────────────────────────────────────┐
│                   SUPABASE DATABASE                     │
│                                                         │
│  auth.users (Supabase Auth)                            │
│       ↓                                                 │
│  profiles (is_provider, full_name, email, ...)         │
│       ├─→ providers (especialización, descripción, ...) │
│       │       ├─→ services (título, categoría, ...)    │
│       │       └─→ reviews (rating, comentario, ...)    │
│       │                                                 │
│       ├─→ orders (estado, precio, ...)                 │
│       │                                                 │
│       ├─→ chats (último mensaje, ...)                  │
│       │       └─→ messages (contenido, is_read, ...)   │
│       │                                                 │
│       └─→ notifications (tipo, mensaje, is_read, ...)  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Componentes por Pantalla

### Servicios
- TouchableOpacity (Notificaciones con badge)
- TouchableOpacity (Ser Proveedor)
- Fab x3 (Categorías)
- FlatList (Proveedores destacados)

### Categorías (Plomería/Electricidad/Limpieza)
- Text (Título)
- FlatList (Proveedores filtrados)
  - TouchableOpacity (Tarjeta de proveedor)

### ProviderDetail
- Avatar grande
- Rating con estrellas
- Secciones de información
- FlatList (Reseñas)
- TouchableOpacity (Botón contactar)

### BecomeProvider
- TextInput x5 (Formulario)
- TouchableOpacity (Botón submit)

### Notificaciones
- ScrollView con RefreshControl
- FlatList (Lista de notificaciones)
  - TouchableOpacity (Item de notificación)
    - Badge (punto rojo si no leída)

### Chats
- ScrollView con RefreshControl
- FlatList (Lista de chats)
  - TouchableOpacity (Item de chat)
    - Badge (mensajes no leídos)

### Órdenes
- ScrollView con RefreshControl
- View (Filtros)
  - TouchableOpacity x3 (Botones de filtro)
- FlatList (Lista de órdenes)
  - TouchableOpacity (Item de orden)
    - Badge (Estado con color)

### Perfil
- View (Header con avatar)
- View (Campos de información)
- TextInput (Editar nombre)
- TouchableOpacity (Botones de acción)

---

## Estados de la UI

### Loading States
- ✅ Servicios: Cargando proveedores
- ✅ Categorías: Cargando proveedores filtrados
- ✅ ProviderDetail: Cargando detalles
- ✅ Notificaciones: Cargando lista
- ✅ Chats: Cargando conversaciones
- ✅ Órdenes: Cargando órdenes
- ✅ Perfil: Cargando datos

### Empty States
- ✅ Servicios: "No hay proveedores"
- ✅ Categorías: "No hay proveedores de [categoría]"
- ✅ Notificaciones: "No tienes notificaciones"
- ✅ Chats: "No tienes conversaciones"
- ✅ Órdenes: "No tienes órdenes"

### Error States
- ✅ Manejo con console.error
- ✅ Alerts para operaciones críticas

---

## Resumen de Características

| Pantalla            | Supabase | Realtime | Pull-to-Refresh | Navegación |
|---------------------|----------|----------|-----------------|------------|
| Servicios           | ✅       | ✅       | ❌              | ✅         |
| Categorías          | ✅       | ❌       | ❌              | ✅         |
| ProviderDetail      | ✅       | ❌       | ❌              | ❌         |
| BecomeProvider      | ✅       | ❌       | ❌              | ✅         |
| Notificaciones      | ✅       | ❌       | ✅              | ✅         |
| Chats               | ✅       | ✅       | ✅              | ✅         |
| Órdenes             | ✅       | ✅       | ✅              | ✅         |
| Perfil              | ✅       | ❌       | ❌              | ✅         |

---

## Próximas Mejoras Sugeridas

1. **ChatDetail Screen**
   - Lista de mensajes
   - Input para enviar mensajes
   - Scroll automático

2. **OrderDetail Screen**
   - Acciones según estado
   - Timeline de eventos
   - Chat integrado

3. **Service Creation**
   - Formulario para proveedores
   - Carga de imágenes
   - Gestión de precios

4. **Advanced Search**
   - Búsqueda por texto
   - Filtros múltiples
   - Geolocalización

5. **Reviews System**
   - Dejar reseñas
   - Editar reseñas
   - Sistema de reportes

---

**Última Actualización:** 23 de Enero, 2026
