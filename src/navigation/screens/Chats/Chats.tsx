import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from "react-native";
import { Text } from "@/src/components/ui/text";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { Chat, Profile, Provider, Message } from "@/src/types/database.types";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { MainTabParamList, RootStackParamList } from "../../types";

interface ChatWithDetails extends Chat {
  other_participant?: Profile;
  other_participant_provider?: Provider | null;
  last_message?: string;
  last_message_at?: string;
}

const Chats: React.FC = () => {
  const { session } = useAuth();
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

  // Verificar si el usuario actual es proveedor
  useEffect(() => {
    const checkProviderStatus = async () => {
      if (!session?.user?.id) return;
      
      const { data: providerById } = await supabase
        .from('providers')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (providerById) {
        setIsCurrentUserProvider(true);
        return;
      }

      const { data: providerByProfile } = await supabase
        .from('providers')
        .select('id')
        .eq('profile_id', session.user.id)
        .maybeSingle();

      if (providerByProfile) {
        setIsCurrentUserProvider(true);
      }
    };
    
    checkProviderStatus();
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
        });
      } else if (diffHours < 48) {
        const timeStr = date.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        return `Ayer ${timeStr}`;
      } else if (diffHours < 168) {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return `${days[date.getDay()]} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
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

          const { data: profileData } = otherParticipantId
            ? await supabase.from('profiles').select('*').eq('id', otherParticipantId).single()
            : { data: null };

          let providerData: Provider | null = null;
          if (otherParticipantId) {
            const { data: providerById } = await supabase.from('providers').select('*').eq('id', otherParticipantId).maybeSingle();
            providerData = providerById || null;
            if (!providerData) {
              const { data: providerByProfile } = await supabase.from('providers').select('*').eq('profile_id', otherParticipantId).maybeSingle();
              providerData = providerByProfile || null;
            }
          }

          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('content, created_at')
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

      setChats(sortedChats);
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
        .select('content, created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newChatObj: ChatWithDetails = {
        ...chatData,
        other_participant: profileData || undefined,
        last_message: lastMsg?.content,
        last_message_at: lastMsg?.created_at || chatData.created_at
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
      supabase.removeChannel(chatsSubscription);
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
  if (loading && !refreshing) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}><Text style={styles.headerTitle}>Chat</Text></View>
        
        {/* Search Bar y Filtros (Igual que antes) */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color="#9AA0A6" />
            <TextInput
              placeholder="Buscar proveedor"
              placeholderTextColor="#9AA0A6"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
             {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color="#9AA0A6" />
              </TouchableOpacity>
            )}
          </View>

          {isCurrentUserProvider && (
            <TouchableOpacity
              style={[
                styles.roleToggleButton,
                viewMode === 'client' ? styles.roleToggleButtonClient : styles.roleToggleButtonProvider
              ]}
              onPress={() => setViewMode(prev => prev === 'provider' ? 'client' : 'provider')}
            >
              <Text style={styles.roleToggleButtonText}>
                {viewMode === 'provider' ? 'Eres proveedor' : 'Eres cliente'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.plusButton} onPress={() => setIsFilterOpen((prev) => !prev)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

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

        {filteredChats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No hay conversaciones</Text>
          </View>
        ) : (
          filteredChats.map((chat) => (
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
              <View style={styles.avatarContainer}>
                <Ionicons name="person-circle" size={54} color="#007AFF" />
              </View>
              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName}>{chat.other_participant?.full_name || 'Usuario'}</Text>
                  {chat.last_message_at && (
                    <Text style={styles.chatTime}>{formatRelativeTime(chat.last_message_at)}</Text>
                  )}
                </View>
                <View style={styles.chatFooter}>
                  <Text style={styles.chatLastMessage} numberOfLines={1} ellipsizeMode="tail">
                    {chat.last_message || 'Inicia una conversación'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... (Tus estilos existentes se mantienen igual)
  container: { flex: 1, backgroundColor: '#f7f7f9' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, backgroundColor: '#f7f7f9' },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#111827' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 8 },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F4F7', height: 36, paddingHorizontal: 12, borderRadius: 18 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#111827' },
  clearButton: { marginLeft: 6 },
  plusButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF6A3D', alignItems: 'center', justifyContent: 'center' },
  filterOptions: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#F2F4F7' },
  filterOptionActive: { backgroundColor: '#E8F0FE' },
  filterOptionText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  filterOptionTextActive: { color: '#007AFF' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#999' },
  chatItem: { flexDirection: 'row', padding: 14, marginHorizontal: 16, marginVertical: 6, backgroundColor: '#fff', borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  avatarContainer: { marginRight: 12 },
  chatContent: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  chatTime: { fontSize: 12, color: '#999' },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatLastMessage: { fontSize: 14, color: '#666', flex: 1 },
  roleToggleButton: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleToggleButtonProvider: {
    backgroundColor: '#111827', // Dark color like in the screenshot
  },
  roleToggleButtonClient: {
    backgroundColor: '#007AFF', // Blue or different color
  },
  roleToggleButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Chats;