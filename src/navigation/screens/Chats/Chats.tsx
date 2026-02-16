import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Image, Platform } from "react-native";
import { Text } from "@/src/components/ui/text";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { Chat, Profile, Provider, Message } from "@/src/types/database.types";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { MainTabParamList, RootStackParamList } from "../../types";

interface ChatWithDetails extends Chat {
  other_participant?: Profile;
  other_participant_provider?: Provider | null;
  last_message?: string;
  last_message_at?: string;
  last_message_sender_id?: string;
  last_message_is_read?: boolean;
}

const Chats: React.FC = () => {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, "Chats">>();
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"Todos" | "Plomería" | "Electricidad" | "Limpieza">("Todos");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Estados para el modo proveedor/cliente
  const [isCurrentUserProvider, setIsCurrentUserProvider] = useState(false);
  const [viewMode, setViewMode] = useState<"provider" | "client">("provider");
  
  // Usamos una referencia para acceder al estado actual dentro de la suscripción
  const chatsRef = useRef<ChatWithDetails[]>([]);

  const categories: Array<"Todos" | "Plomería" | "Electricidad" | "Limpieza"> = [
    "Todos",
    "Plomería",
    "Electricidad",
    "Limpieza",
  ];

  // Mantener la referencia actualizada
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  // Verificar si el usuario actual es proveedor y suscribirse a cambios
  useEffect(() => {
    const checkProviderStatus = async () => {
      if (!session?.user?.id) return;
      
      // Initial check
      const { data: providerById } = await supabase
        .from('providers')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (providerById) {
        setIsCurrentUserProvider(true);
      } else {
         const { data: providerByProfile } = await supabase
          .from('providers')
          .select('id')
          .eq('profile_id', session.user.id)
          .maybeSingle();

        if (providerByProfile) {
          setIsCurrentUserProvider(true);
        }
      }
    };
    
    checkProviderStatus();

    // Subscribe to changes in profiles table to detect when is_provider changes
    if (session?.user?.id) {
        const profileSubscription = supabase
            .channel(`public:profiles:${session.user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${session.user.id}`,
                },
                (payload) => {
                    const newProfile = payload.new as Profile;
                    if (newProfile.is_provider) {
                        setIsCurrentUserProvider(true);
                    }
                }
            )
            .subscribe();
            
        // Subscribe to providers table just in case
        const providerSubscription = supabase
            .channel(`public:providers:${session.user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'providers',
                    filter: `id=eq.${session.user.id}`,
                },
                () => {
                    setIsCurrentUserProvider(true);
                }
            )
            .subscribe();

        return () => {
             supabase.removeChannel(profileSubscription);
             supabase.removeChannel(providerSubscription);
        }
    }

  }, [session?.user?.id]);

  // Función para mostrar fecha relativa
  const formatRelativeTime = (utcTimeString?: string) => {
    if (!utcTimeString) return "";
    try {
      const date = new Date(utcTimeString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours < 24) {
        return date.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          hour12: true,
        });
      } else if (diffHours < 48) {
        const timeStr = date.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          hour12: true,
        });
        return `Ayer ${timeStr}`;
      } else if (diffHours < 168) {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return `${days[date.getDay()]} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
      } else {
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      return "";
    }
  };

  // Carga inicial de chats
  const loadChats = useCallback(async (showLoading = true) => {
    try {
      if (!session?.user) return;
      if (showLoading) setLoading(true);

      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .or(`participant_1_id.eq.${session.user.id},participant_2_id.eq.${session.user.id}`);

      if (chatsError) throw chatsError;

      const chatsWithDetails = await Promise.all(
        (chatsData || []).map(async (chat) => {
          // Lógica para obtener el otro participante
          const otherParticipantId =
            chat.participant_1_id && chat.participant_2_id
              ? chat.participant_1_id === session.user.id
                ? chat.participant_2_id
                : chat.participant_1_id
              : undefined;

          // Fetch profile directly
          const { data: profileData } = otherParticipantId
            ? await supabase.from('profiles').select('*').eq('id', otherParticipantId).single()
            : { data: null };

          let providerData: Provider | null = null;
          if (otherParticipantId) {
             // ... existing provider fetch logic ...
             const { data: providerById } = await supabase.from('providers').select('*').eq('id', otherParticipantId).maybeSingle();
             providerData = providerById || null;
             if (!providerData) {
                const { data: providerByProfile } = await supabase.from('providers').select('*').eq('profile_id', otherParticipantId).maybeSingle();
                providerData = providerByProfile || null;
             }
          }

          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('content, created_at, sender_id, is_read')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...chat,
            other_participant: profileData || undefined,
            other_participant_provider: providerData || null,
            last_message: lastMessageData?.content || undefined,
            last_message_at: lastMessageData?.created_at || chat.created_at,
            last_message_sender_id: lastMessageData?.sender_id,
            last_message_is_read: lastMessageData?.is_read,
          };
        })
      );

      const sortedChats = (chatsWithDetails || [])
        .filter((chat): chat is ChatWithDetails => Boolean(chat))
        .sort((a, b) => {
          const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return timeB - timeA;
        });

      // Asegurar unicidad por si acaso
      const uniqueChats = Array.from(new Map(sortedChats.map(c => [c.id, c])).values());

      setChats(uniqueChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user]);

  useFocusEffect(
    useCallback(() => {
      // Recargar chats cada vez que la pantalla recibe el foco, pero sin loader intrusivo si ya hay chats
      loadChats(false);
    }, [loadChats])
  );


  // Función auxiliar para cargar un chat NUEVO que no existe en la lista
  const fetchAndAddNewChat = async (chatId: string) => {
    try {
      if (!session?.user) return;
      
      const { data: chatData, error } = await supabase.from('chats').select('*').eq('id', chatId).single();
      if (error || !chatData) return;

      const otherParticipantId = chatData.participant_1_id === session.user.id 
        ? chatData.participant_2_id 
        : chatData.participant_1_id;

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', otherParticipantId).single();
      
      // Obtener último mensaje
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at, sender_id, is_read')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newChatObj: ChatWithDetails = {
        ...chatData,
        other_participant: profileData || undefined,
        last_message: lastMsg?.content,
        last_message_at: lastMsg?.created_at || chatData.created_at,
        last_message_sender_id: lastMsg?.sender_id,
        last_message_is_read: lastMsg?.is_read,
      };

      setChats(prev => {
        if (prev.some(c => c.id === newChatObj.id)) return prev;
        return [newChatObj, ...prev];
      });
    } catch (e) {
      console.error("Error fetching new chat", e);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadChats(true);
    }
  }, [session?.user, loadChats]);

  // SUSCRIPCIÓN EN TIEMPO REAL
  useEffect(() => {
    if (!session?.user) return;

    // Suscripción a cambios en perfiles (para actualizar avatares en tiempo real)
    const profilesSubscription = supabase
      .channel('public:profiles_chats')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
           const updatedProfile = payload.new as Profile;
           setChats(prevChats => prevChats.map(chat => {
              if (chat.other_participant?.id === updatedProfile.id) {
                  return { 
                      ...chat, 
                      other_participant: { ...chat.other_participant, ...updatedProfile } 
                  };
              }
              return chat;
           }));
        }
      )
      .subscribe();

    // Canal para nuevos mensajes en los chats existentes
    const messagesSubscription = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;
          const chatIndex = chatsRef.current.findIndex(c => c.id === newMessage.chat_id);

          // Si el mensaje pertenece a un chat que ya está en la lista
          if (chatIndex !== -1) {
            setChats(prevChats => {
              const updatedChats = [...prevChats];
              const chatToUpdate = { ...updatedChats[chatIndex] };

              chatToUpdate.last_message = newMessage.content;
              chatToUpdate.last_message_at = newMessage.created_at;
              chatToUpdate.last_message_sender_id = newMessage.sender_id;
              chatToUpdate.last_message_is_read = newMessage.is_read || false;

              // Mover el chat actualizado al principio de la lista
              updatedChats.splice(chatIndex, 1);
              updatedChats.unshift(chatToUpdate);

              return updatedChats;
            });
          } else {
            // Si el chat no está en la lista (nuevo chat o no cargado), lo traemos
            fetchAndAddNewChat(newMessage.chat_id);
          }
        }
      )
      .subscribe();

    const messagesUpdateSubscription = supabase
      .channel('public:messages_update')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          const chatIndex = chatsRef.current.findIndex(c => c.id === updatedMessage.chat_id);
          
          if (chatIndex !== -1) {
             setChats(prevChats => {
               const chat = prevChats[chatIndex];
               // Update only if this matches the last known message timestamp or content, 
               // OR simplified: assume if an update happens in this chat, we might want to refresh.
               // But usually we just care if the LAST message was updated (e.g. read status).
               // We don't have message IDs for the last message in ChatWithDetails, strictly speaking,
               // but we can check if the time matches or just update it if it's the latest.
               
               // Better approach: Check if updated message IS the last message.
               if (updatedMessage.created_at === chat.last_message_at) { // rudimentary check
                  const updatedChats = [...prevChats];
                  updatedChats[chatIndex] = {
                      ...chat,
                      last_message_is_read: updatedMessage.is_read
                  };
                  return updatedChats;
               }
               
               // If it's not the same timestamp, maybe the last message changed? 
               // Unlikely for READ receipts, they usually apply to the recent messages.
               // We'll trust the rudimentary check for now or just force reload if needed.
               return prevChats;
             });
          }
        }
      )
      .subscribe();

    // Canal para nuevos chats creados para el usuario actual
    const chatsSubscription = supabase
      .channel('public:chats')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
        },
        (payload) => {
          const newChat = payload.new as Chat;
          // Validamos que el chat pertenezca al usuario actual
          const isMyChat = newChat.participant_1_id === session.user.id || newChat.participant_2_id === session.user.id;
          
          if (isMyChat && !chatsRef.current.some(c => c.id === newChat.id)) {
            fetchAndAddNewChat(newChat.id);
          }
        }
      )
      .subscribe();

    // Limpiar suscripciones al desmontar el componente
    return () => {
      supabase.removeChannel(messagesSubscription);
      supabase.removeChannel(messagesUpdateSubscription);
      supabase.removeChannel(chatsSubscription);
      profilesSubscription.unsubscribe();
    };
  }, [session?.user]);

  // Manejo de navegación desde params
  useEffect(() => {
    if (route.params?.chatId || route.params?.otherParticipantId) {
      tabNavigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate(
        "ChatDetail",
        { 
          chatId: route.params.chatId,
          otherParticipantId: route.params.otherParticipantId 
        }
      );
      tabNavigation.setParams({ chatId: undefined, otherParticipantId: undefined });
    }
  }, [route.params?.chatId, route.params?.otherParticipantId, tabNavigation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadChats();
  };

  const normalizeText = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const filteredChats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedCategory = normalizeText(selectedCategory);
    
    return chats.filter((chat) => {
      const fullName = chat.other_participant?.full_name || "";
      const matchesQuery = query.length === 0 ? true : fullName.toLowerCase().includes(query);

      const specializationValue = chat.other_participant_provider?.specialization as unknown;
      // Lógica de filtrado de categoría...
      const specializationList: string[] = Array.isArray(specializationValue)
        ? specializationValue
        : typeof specializationValue === 'string'
          ? specializationValue.split(',').map((value: string) => value.trim())
          : [];

      const normalizedSpecs = specializationList.map((value: string) => normalizeText(value));
      const matchesCategory =
        selectedCategory === "Todos"
          ? true
          : normalizedSpecs.some((value: string) => value.includes(normalizedCategory));

      // Lógica de modo proveedor/cliente
      let matchesMode = true;
      if (isCurrentUserProvider) {
        if (viewMode === 'provider') {
          // Si estoy en modo "Eres proveedor", quiero ver mis CLIENTES.
          // Asumimos que los clientes NO tienen other_participant_provider 
          // (o al menos no están actuando como tales en este chat).
          matchesMode = !chat.other_participant_provider;
        } else {
          // Si estoy en modo "Eres cliente", quiero ver PROVEEDORES.
          matchesMode = !!chat.other_participant_provider;
        }
      }

      return matchesQuery && matchesCategory && matchesMode;
    });
  }, [chats, searchQuery, selectedCategory, isCurrentUserProvider, viewMode]);

  if (!session) return <View style={styles.centerContainer}><Text>Error: Sesión no disponible.</Text></View>;
  if (loading && !refreshing) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#F97316" /></View>;

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header Area */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <Text style={styles.headerTitle}>Chat</Text>
        </View>
        
        {/* Search & Actions - Match Servicios logic */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Buscar"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

         
        </View>

        {/* Filter Row - Match Servicios Pills */}
        <View style={styles.filterRow}>
          {/* Provider Toggle Pill */}
          {isCurrentUserProvider && (
            <TouchableOpacity
              style={[
                styles.filterButton, 
                styles.providerToggleButton,
                viewMode === 'client' && styles.clientModeButton
              ]}
              activeOpacity={0.8}
              onPress={() => setViewMode(prev => prev === 'provider' ? 'client' : 'provider')}
            >
              <Text style={[styles.filterText, styles.activeFilterText]}>
                  {viewMode === 'provider' ? 'Modo Proveedor' : 'Modo Cliente'}
              </Text>
              <Ionicons name="swap-horizontal" size={14} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Category Filter Pill */}
          <TouchableOpacity
              style={[
                styles.filterButton,
                isFilterOpen && styles.activeFilterButton
              ]}
              activeOpacity={0.8}
              onPress={() => setIsFilterOpen((prev) => !prev)}
            >
              <Ionicons 
                name="grid-outline" 
                size={16} 
                color={isFilterOpen ? "#fff" : "#4B5563"} 
              />
              <Text 
                style={[
                  styles.filterText,
                  isFilterOpen && styles.activeFilterText
                ]}
              >
                {selectedCategory === "Todos" ? "Categoría" : selectedCategory}
              </Text>
              <Ionicons 
                name={isFilterOpen ? "chevron-up" : "chevron-down"} 
                size={12} 
                color={isFilterOpen ? "#fff" : "#4B5563"} 
              />
          </TouchableOpacity>
        </View>

        {/* Filter Options Dropdown */}
        {isFilterOpen && (
          <View style={styles.filterOptions}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.filterOption, selectedCategory === category && styles.filterOptionActive]}
                onPress={() => { setSelectedCategory(category); setIsFilterOpen(false); }}
              >
                <Text style={[styles.filterOptionText, selectedCategory === category && styles.filterOptionTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Chat List */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionHeader}>TODOS</Text>

          {filteredChats.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No hay conversaciones</Text>
            </View>
          ) : (
            filteredChats.map((chat) => {
              const otherUserInitial = chat.other_participant?.full_name?.substring(0,1) || "U";
              const isUnread = chat.last_message_sender_id !== session?.user.id && !chat.last_message_is_read;
              
              return (
              <TouchableOpacity
                key={chat.id}
                style={styles.chatItem}
                onPress={() => {
                  tabNavigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate(
                    "ChatDetail",
                    { chatId: chat.id, otherParticipantId: chat.other_participant?.id }
                  );
                }}
              >
                <View style={styles.avatarWrapper}>
                   {chat.other_participant?.avatar_url ? (
                       <Image source={{ uri: chat.other_participant.avatar_url }} style={styles.avatarImage} />
                   ) : (
                       <View style={styles.avatarCircle}>
                          <Text style={styles.avatarInitials}>{otherUserInitial}</Text>
                       </View>
                   )}
                </View>

                <View style={styles.chatContent}>
                  <View style={styles.chatHeader}>
                    <Text style={styles.chatName} numberOfLines={1}>
                      {chat.other_participant?.full_name || 'Usuario'}
                    </Text>
                    {chat.last_message_at && (
                      <Text style={[styles.chatTime, isUnread && styles.chatTimeUnread]}>
                        {formatRelativeTime(chat.last_message_at)}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.chatFooter}>
                    <Text 
                      style={[
                        styles.chatLastMessage, 
                        isUnread && styles.chatLastMessageUnread
                      ]} 
                      numberOfLines={1} 
                      ellipsizeMode="tail"
                    >
                      {chat.last_message || 'Inicia una conversación...'}
                    </Text>
                    
                    {isUnread && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>1</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )})
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20, 
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    lineHeight: 36, // Apply globally for better rendering on Android too
    paddingVertical: 5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12, // Increased spacing
    gap: 15,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff', // White background
    height: 44,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F97316', // Orange border (Match Servicios)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#111827',
  },
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  // New Filters Row Styles
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE', // Light blue/gray for inactive
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20, // Pill
    gap: 8,
  },
  activeFilterButton: {
    backgroundColor: '#F97316', // Active Orange
  },
  providerToggleButton: {
      backgroundColor: '#F97316',
      elevation: 3,
      shadowColor: '#F97316',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
  },
  clientModeButton: {
      backgroundColor: '#4B5563', // Dark Gray for Client Mode to differentiate
      shadowColor: '#000',
  },
  filterText: {
    fontSize: 14, // Slightly larger
    fontWeight: '600',
    color: '#4B5563',
  },
  activeFilterText: {
    color: '#fff',
  },
  // Legacy toggle styles (now removed from JSX but might be referenced if I didn't clean everything?)
  roleToggleButton: {
    // keeping for safety if needed, but not used in new JSX
  },
  // ...
  filterOptions: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  filterOptionActive: {
    backgroundColor: '#F97316',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  listContainer: {
    marginTop: 10,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF', 
    marginBottom: 10,
    letterSpacing: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14, // Comfy padding
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FCE7D6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F97316',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  chatTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  chatTimeUnread: {
    color: '#F97316',
    fontWeight: '600',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatLastMessage: {
    fontSize: 14,
    color: '#6B7280', 
    flex: 1,
    marginRight: 10,
  },
  chatLastMessageUnread: {
    color: '#111827',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default Chats;
