import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Text } from "@/src/components/ui/text";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { Chat, Profile } from "@/src/types/database.types";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { MainTabParamList, RootStackParamList } from "../../types";

interface ChatWithDetails extends Chat {
  other_participant?: Profile;
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

  useEffect(() => {
    if (session?.user) {
      loadChats();

      // Subscribe to message changes
      const subscription = supabase
        .channel('messages_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          () => {
            loadChats();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [session]);

  useEffect(() => {
    if (route.params?.chatId) {
      tabNavigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate(
        "ChatDetail",
        { chatId: route.params.chatId }
      );
      tabNavigation.setParams({ chatId: undefined });
    }
  }, [route.params?.chatId, tabNavigation]);

  const loadChats = async () => {
    try {
      if (!session?.user) return;

      // Load chats where user is participant
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .or(`participant_1_id.eq.${session.user.id},participant_2_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });

      if (chatsError) throw chatsError;

      // Load details for each chat
      const chatsWithDetails = await Promise.all(
        (chatsData || []).map(async (chat) => {
          const otherParticipantId =
            chat.participant_1_id && chat.participant_2_id
              ? chat.participant_1_id === session.user.id
                ? chat.participant_2_id
                : chat.participant_1_id
              : undefined;

          const { data: profileData } = otherParticipantId
            ? await supabase
                .from('profiles')
                .select('*')
                .eq('id', otherParticipantId)
                .single()
            : { data: null };

          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...chat,
            other_participant: profileData || undefined,
            last_message: lastMessageData?.content || undefined,
            last_message_at: lastMessageData?.created_at || undefined,
          };
        })
      );

      setChats(chatsWithDetails);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadChats();
  };

  if (!session) {
    return (
      <View style={styles.centerContainer}>
        <Text>Error: Sesión no disponible.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>

      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No tienes conversaciones</Text>
        </View>
      ) : (
        chats.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            style={styles.chatItem}
            onPress={() => {
              tabNavigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate(
                "ChatDetail",
                {
                  chatId: chat.id,
                  otherParticipantId: chat.other_participant?.id,
                }
              );
            }}
          >
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={50} color="#007AFF" />
            </View>
            <View style={styles.chatContent}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>
                  {chat.other_participant?.full_name || 'Usuario'}
                </Text>
                {chat.last_message_at && (
                  <Text style={styles.chatTime}>
                    {new Date(chat.last_message_at).toLocaleDateString('es-ES')}
                  </Text>
                )}
              </View>
              <View style={styles.chatFooter}>
                <Text style={styles.chatLastMessage} numberOfLines={1}>
                  {chat.last_message || 'Sin mensajes'}
                </Text>
                
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    marginRight: 12,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatLastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default Chats;
