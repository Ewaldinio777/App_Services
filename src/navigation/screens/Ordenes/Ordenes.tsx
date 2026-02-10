import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Image, Modal, TextInput, Alert, Platform, Dimensions } from "react-native";
import { Text } from "@/src/components/ui/text";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { Order, Profile, Review } from "@/src/types/database.types";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import { LineChart } from "react-native-chart-kit";
import CustomDateTimePicker from "@/src/components/ui/CustomDateTimePicker";
import { format } from "date-fns"; // Assuming date-fns might be useful, or I can use native Date methods if not installed.
// checking package.json for date-fns. I didn't see it. I'll use native Date.

interface OrderWithDetails extends Order {
  client?: Profile;
  provider?: Profile;
  hasReview?: boolean;
  reviewDetails?: Review;
}

interface ReviewWithDetails extends Review {
    order?: Order;
    reviewer?: Profile;
}

// --- SUB-COMPONENTS ---

// 1. Client View (The one we built previously)
const ClientOrdersView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { session } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'activas' | 'historial'>('activas');

  // Rating Modal State
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Report Modal State
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      if (!session?.user) return;

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('client_id', session.user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewer_id', session.user.id);
        
      if (reviewsError) throw reviewsError;
      
      const reviewsMap = new Map(reviewsData?.map(r => [r.order_id, r]));

      const ordersWithDetails = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: providerData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', order.provider_id)
            .single();

          const review = reviewsMap.get(order.id);

          return {
            ...order,
            provider: providerData,
            hasReview: !!review,
            reviewDetails: review
          };
        })
      );

      setOrders(ordersWithDetails);
    } catch (error) {
      console.error('Error loading client orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useFocusEffect(
      useCallback(() => {
        loadOrders();
      }, [loadOrders])
  );

  useEffect(() => {
    if (!session?.user) return;
    
    // Suscripción a cambios en perfiles para actualizar avatares en tiempo real
    const profilesSubscription = supabase
      .channel('public:profiles_orders')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
           const updatedProfile = payload.new as Profile;
           setOrders(prevOrders => prevOrders.map(order => {
              // Actualizar provider si coincide
              if (order.provider?.id === updatedProfile.id) {
                return { ...order, provider: { ...order.provider, ...updatedProfile } };
              }
              // Actualizar client si coincide (si mostramos información del cliente)
              if (order.client?.id === updatedProfile.id) {
                 return { ...order, client: { ...order.client, ...updatedProfile } };
              }
              return order;
           }));
        }
      )
      .subscribe();

      return () => {
        profilesSubscription.unsubscribe();
      };
  }, [session?.user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleRateOrder = async () => {
    if (!selectedOrder || rating === 0) {
      Alert.alert("Error", "Por favor selecciona una calificación.");
      return;
    }

    if (!comment || comment.trim() === "") {
      Alert.alert("Error", "El comentario es obligatorio para realizar una calificación.");
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from('reviews').insert({
        order_id: selectedOrder.id,
        reviewer_id: session?.user.id,
        rating: rating,
        comment: comment,
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      // --- NOTIFICATION LOGIC ---
      // Notify Provider about Review/Confirmation
      const { data: clientProfile } = await supabase.from('profiles').select('full_name').eq('id', session?.user.id).single();
      const clientName = clientProfile?.full_name || "Un cliente";
      
      await supabase.from('notifications').insert({
          user_id: selectedOrder.provider_id,
          title: "¡Trabajo completado!",
          body: `${clientName} ha confirmado el servicio y te ha dejado una calificación.`,
          type: 'review',
          related_id: selectedOrder.id,
          is_read: false
      });
      // --------------------------

      Alert.alert("Éxito", "Gracias por tu calificación.");
      setRatingModalVisible(false);
      setRating(0);
      setComment("");
      setSelectedOrder(null);
      loadOrders(); 
    } catch (error) {
      console.error("Error submitting review:", error);
      Alert.alert("Error", "No se pudo enviar la calificación.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportOrder = async () => {
     if (!selectedOrder || !reportReason || !reportDescription) {
        Alert.alert("Error", "Por favor completa el motivo y la descripción.");
        return;
      }
  
      try {
        setSubmitting(true);
        const { error } = await supabase.from('reviews').insert({
          order_id: selectedOrder.id,
          reviewer_id: session?.user.id,
          rating: 1, 
          complaint: `${reportReason}: ${reportDescription}`,
          created_at: new Date().toISOString()
        });
  
        if (error) throw error;
  
        // --- NOTIFICATION LOGIC ---
        // Notify Provider about Complaint
        await supabase.from('notifications').insert({
            user_id: selectedOrder.provider_id,
            title: "Disputa Registrada",
            body: "Se ha registrado una queja en uno de tus servicios. Nuestro equipo la está revisando.",
            type: 'problem',
            related_id: selectedOrder.id,
            is_read: false
        });
        // --------------------------

        Alert.alert("Reporte Enviado", "Tu reporte está siendo revisado.");
        setReportModalVisible(false);
        setReportReason("");
        setReportDescription("");
        setSelectedOrder(null);
        loadOrders();
      } catch (error) {
        console.error("Error submitting report:", error);
        Alert.alert("Error", "No se pudo enviar el reporte.");
      } finally {
        setSubmitting(false);
      }
  };

  const openRatingModal = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setRating(0);
    setComment("");
    setRatingModalVisible(true);
  };

  const openReportModal = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setReportReason("");
    setReportDescription("");
    setReportModalVisible(true);
  };

  const filterOrders = () => {
    if (activeTab === 'activas') {
      // Includes pending (new API) or old API 'pending' status
      return orders.filter(o => 
        ['pendiente', 'pending', 'aceptado', 'en_proceso', 'pendiente_confirmacion_cliente'].includes(o.status) ||
        (o.status === 'completado' && !o.hasReview)
      );
    } else {
      return orders.filter(o => 
        o.status === 'cancelado' ||
        (o.status === 'completado' && o.hasReview)
      );
    }
  };

  const filteredOrders = filterOrders();

  const getStatusInfo = (status: string, review?: Review) => {
      if (status === 'pendiente' || status === 'pending') return { text: 'Pendiente', color: '#666' };
      if (status === 'aceptado' || status === 'en_proceso') return { text: 'En Proceso', color: '#F97316' };
      if (status === 'completado' && !review) return { text: 'Pendiente por Confirmar', color: '#F97316' };
      if (status === 'completado' && review) {
          if (review.complaint) return { text: 'Queja Registrada', color: '#FF3B30' };
          return { text: `Completado (★ ${review.rating})`, color: '#34C759' };
      }
      if (status === 'cancelado') return { text: 'Cancelado', color: '#FF3B30' };
      return { text: status, color: '#333' };
  };

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#F97316" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Mis Encargos (Cliente)</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity activeOpacity={1} style={[styles.tabButton, activeTab === 'activas' && styles.tabButtonActive]} onPress={() => setActiveTab('activas')}>
          <Text style={[styles.tabText, activeTab === 'activas' && styles.tabTextActive]}>Activas</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={1} style={[styles.tabButton, activeTab === 'historial' && styles.tabButtonActive]} onPress={() => setActiveTab('historial')}>
          <Text style={[styles.tabText, activeTab === 'historial' && styles.tabTextActive]}>Historial</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="documents-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No hay órdenes en esta sección</Text>
          </View>
        ) : (
            filteredOrders.map((order) => (
            <View key={order.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.providerInfo}>
                      {order.provider?.avatar_url ? (
                          <Image source={{ uri: order.provider.avatar_url }} style={styles.avatar} />
                      ) : (
                          <View style={[styles.avatar, { backgroundColor: '#ccc' }]} />
                      )}
                      <View>
                          <Text style={styles.providerName}>{order.provider?.full_name || 'Proveedor'}</Text>
                          <Text style={styles.serviceType}>
                            <Ionicons name="briefcase-outline" size={14} color="#666" /> {order.title || order.service_type || "Servicio"}
                          </Text>
                          {order.delivery_address && (
                            <Text style={styles.addressText}>
                                <Ionicons name="location-outline" size={14} color="#6B7280" /> {order.delivery_address}
                            </Text>
                          )}
                          <Text style={styles.dateText}>
                              <Ionicons name="calendar-outline" size={14} color="#999" /> {order.scheduled_date ? (
                                  `${order.scheduled_date.split('T')[0].split('-').reverse().join('/')} • ${order.scheduled_time?.substring(0,5) || '00:00'}`
                              ) : (
                                  `${new Date(order.created_at).toLocaleDateString()} • ${new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                              )}
                          </Text>
                      </View>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.cardBody}>
                    <Text style={styles.statusLabel}>Estado de la órden: </Text>
                    <Text style={[styles.statusValue, { color: getStatusInfo(order.status, order.reviewDetails).color }]}>
                        {getStatusInfo(order.status, order.reviewDetails).text}
                    </Text>
                </View>

                {order.status === 'completado' && !order.hasReview && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.confirmButton} onPress={() => openRatingModal(order)}>
                            <Text style={styles.confirmButtonText}>Confirmar y Calificar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.reportButton} onPress={() => openReportModal(order)}>
                            <Text style={styles.reportButtonText}>Reportar Problema</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
          ))
        )}
      </ScrollView>

      {/* RATING MODAL */}
      <Modal visible={ratingModalVisible} transparent={true} animationType="slide" onRequestClose={() => setRatingModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Calificar Servicio</Text>
                <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)}>
                            <Ionicons name={star <= rating ? "star" : "star-outline"} size={32} color={star <= rating ? "#FFD700" : "#ccc"} />
                        </TouchableOpacity>
                    ))}
                </View>
                <TextInput style={styles.commentInput} placeholder="Comentario..." multiline value={comment} onChangeText={setComment} />
                <TouchableOpacity style={styles.modalButton} onPress={handleRateOrder} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>Enviar</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeButton} onPress={() => setRatingModalVisible(false)}><Text>Cancelar</Text></TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* REPORT MODAL */}
      <Modal visible={reportModalVisible} transparent={true} animationType="slide" onRequestClose={() => setReportModalVisible(false)}>
        <View style={styles.modalOverlay}>
             <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Reportar Problema</Text>
                <TextInput 
                    style={styles.reasonSelect} 
                    placeholder="Título de la Queja" 
                    placeholderTextColor="#999"
                    value={reportReason} 
                    onChangeText={setReportReason} 
                />
                <TextInput style={styles.commentInput} placeholder="Descripción..." multiline value={reportDescription} onChangeText={setReportDescription} />
                <TouchableOpacity style={styles.modalButton} onPress={handleReportOrder} disabled={submitting}>
                     {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>Enviar Queja</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeButton} onPress={() => setReportModalVisible(false)}><Text>Cancelar</Text></TouchableOpacity>
             </View>
        </View>
      </Modal>
    </View>
  );
};


// 2. Provider Orders View
const ProviderOrdersView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { session } = useAuth();
    const navigation = useNavigation<any>();
    const [orders, setOrders] = useState<OrderWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'nuevas' | 'proceso' | 'historial'>('nuevas');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const loadProviderOrders = useCallback(async () => {
        try {
            setLoading(true);
            if (!session?.user) return;
            // Get orders where I am the provider
            const { data: ordersData, error: errorToken } = await supabase
                .from('orders')
                .select('*')
                .eq('provider_id', session.user.id)
                .order('created_at', { ascending: false });

            if (errorToken) throw errorToken;

            // Enrich with Client Profile
            const enrichedOrders = await Promise.all((ordersData || []).map(async (o) => {
                const { data: client } = await supabase.from('profiles').select('*').eq('id', o.client_id).single();
                return { ...o, client };
            }));

            setOrders(enrichedOrders);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useFocusEffect(useCallback(() => { loadProviderOrders(); }, [loadProviderOrders]));

    const handleChat = async (otherUserId: string) => {
        if (!session?.user) return;
        try {
            // Check for existing chat
             const { data: existingChats } = await supabase
              .from("chats")
              .select("id")
              .or(
                 `and(participant_1_id.eq.${session.user.id},participant_2_id.eq.${otherUserId}),and(participant_1_id.eq.${otherUserId},participant_2_id.eq.${session.user.id})`
              )
              .limit(1);

            if (existingChats && existingChats.length > 0) {
                navigation.navigate('ChatDetail', { chatId: existingChats[0].id, otherParticipantId: otherUserId });
            } else {
                 navigation.navigate('ChatDetail', { otherParticipantId: otherUserId });
            }
        } catch (error) {
            console.error(error);
             navigation.navigate('ChatDetail', { otherParticipantId: otherUserId });
        }
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        try {
            setProcessingId(orderId);
            const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
            if (error) throw error;
            
            // --- NOTIFICATION LOGIC ---
            try {
                // 1. Get current provider's name
                const { data: myProfile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', session.user.id)
                    .single();
                
                const providerName = myProfile?.full_name || "El proveedor";

                // 2. Fetch order details to get client_id
                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .select('client_id, service_type')
                    .eq('id', orderId)
                    .single();

                if (orderError) throw orderError;

                if (orderData && orderData.client_id) {
                     let notifTitle = "";
                     let notifBody = "";
     
                     if (newStatus === 'aceptado') {
                         notifTitle = "¡Solicitud Aceptada!";
                         notifBody = `¡Buenas noticias! ${providerName} ha aceptado tu solicitud de ${orderData.service_type || 'servicio'}.`;
                     } else if (newStatus === 'cancelado') { 
                          notifTitle = "Solicitud Rechazada/Cancelada"; 
                          notifBody = `Tu solicitud de ${orderData.service_type || 'servicio'} fue rechazada o cancelada por ${providerName}.`;
                     } else if (newStatus === 'completado') {
                         notifTitle = "Servicio Finalizado";
                         notifBody = `${providerName} ha finalizado el servicio. Por favor, confirma y califica el trabajo.`;
                     }
     
                     if (notifTitle) {
                         const { error: notifError } = await supabase.from('notifications').insert({
                             user_id: orderData.client_id, // Notify the client
                             title: notifTitle,
                             body: notifBody,
                             type: 'order',
                             related_id: orderId,
                             is_read: false
                         });
                         if (notifError) console.error("Error inserting notification:", notifError);
                     }
                }
            } catch (notifErr) {
                console.error("Error in notification logic:", notifErr);
            }
            // --------------------------

            Alert.alert("Éxito", "Estado actualizado correctamente.");
            loadProviderOrders();
        } catch (error) {
            Alert.alert("Error", "No se pudo actualizar el estado.");
        } finally {
            setProcessingId(null);
        }
    };

    const filterOrders = () => {
        if (activeTab === 'nuevas') return orders.filter(o => (o.status as string) === 'pendiente' || (o.status as string) === 'pending');
        if (activeTab === 'proceso') return orders.filter(o => o.status === 'aceptado' || o.status === 'en_proceso');
        if (activeTab === 'historial') return orders.filter(o => o.status === 'completado' || o.status === 'cancelado');
        return [];
    };

    const filtered = filterOrders();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Solicitudes de Servicio</Text>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity activeOpacity={1} style={[styles.tabButton, activeTab === 'nuevas' && styles.tabButtonActive]} onPress={() => setActiveTab('nuevas')}>
                    <Text style={[styles.tabText, activeTab === 'nuevas' && styles.tabTextActive]}>Nuevas ({orders.filter(o => (o.status as string) === 'pendiente' || (o.status as string) === 'pending').length})</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={1} style={[styles.tabButton, activeTab === 'proceso' && styles.tabButtonActive]} onPress={() => setActiveTab('proceso')}>
                    <Text style={[styles.tabText, activeTab === 'proceso' && styles.tabTextActive]}>
                        En Proceso ({orders.filter(o => o.status === 'aceptado' || o.status === 'en_proceso').length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={1} style={[styles.tabButton, activeTab === 'historial' && styles.tabButtonActive]} onPress={() => setActiveTab('historial')}>
                    <Text style={[styles.tabText, activeTab === 'historial' && styles.tabTextActive]}>Historial</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
                {loading ? <ActivityIndicator color="#F97316" /> : filtered.length === 0 ? (
                    <Text style={styles.emptyText}>No hay solicitudes en esta categoría.</Text>
                ) : (
                    filtered.map(order => (
                        <View key={order.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.providerInfo}>
                                    {order.client?.avatar_url ? (
                                        <Image source={{ uri: order.client.avatar_url }} style={[styles.avatar, { width: 60, height: 60, borderRadius: 30 }]} />
                                    ) : (
                                        <View style={[styles.avatar, { backgroundColor: '#ccc', width: 60, height: 60, borderRadius: 30 }]} />
                                    )}
                                    <View>
                                        <Text style={styles.providerName}>{order.client?.full_name}</Text>
                                        <Text style={styles.serviceType}>
                                            <Ionicons name="briefcase-outline" size={14} color="#666" /> {order.title || order.service_type}
                                        </Text>
                                        {order.delivery_address && (
                                            <Text style={styles.addressText}>
                                                <Ionicons name="location-outline" size={14} color="#6B7280" /> {order.delivery_address}
                                            </Text>
                                        )}
                                        <Text style={styles.dateText}>
                                            <Ionicons name="calendar-outline" size={14} color="#999" /> {order.scheduled_date ? (
                                                `${order.scheduled_date.split('T')[0].split('-').reverse().join('/')} • ${order.scheduled_time?.substring(0,5) || '00:00'}`
                                            ) : (
                                                `${new Date(order.created_at).toLocaleDateString()} • ${new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                                            )}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            
                            <View style={styles.divider}/>
                            
                            {activeTab === 'nuevas' && (
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#F97316', flex: 1}]} onPress={() => order.client_id && handleChat(order.client_id)}>
                                        <Text style={{color:'#fff', fontSize: 12, fontWeight: 'bold'}}>Chatear</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#FF3B30', flex: 1}]} onPress={() => updateStatus(order.id, 'cancelado')}>
                                        <Text style={{color:'#fff', fontSize: 12, fontWeight: 'bold'}}>Declinar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#34C759', flex: 1}]} onPress={() => updateStatus(order.id, 'aceptado')}>
                                        <Text style={{color:'#fff', fontSize: 12, fontWeight: 'bold'}}>Aceptar</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            
                            {activeTab === 'proceso' && (
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#F97316', flex: 1}]} onPress={() => order.client_id && handleChat(order.client_id)}>
                                        <Text style={{color:'#fff', fontSize: 12, fontWeight: 'bold'}}>Chatear</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#34C759', flex: 1}]} onPress={() => updateStatus(order.id, 'completado')}>
                                        <Text style={{color:'#fff', fontSize: 12, fontWeight: 'bold'}}>Finalizar Servicio</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                             {activeTab === 'historial' && (
                                <View>
                                    <Text style={{fontWeight: 'bold', color: order.status === 'completado' ? 'green' : 'red'}}>
                                        {order.status === 'completado' ? 'Completada' : 'Cancelada'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
};

// 3. Provider Performance View
const ProviderPerformanceView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { session } = useAuth();
    const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'estadisticas' | 'calificaciones' | 'quejas'>('estadisticas');
    const [chartFilter, setChartFilter] = useState<'day' | 'month' | 'year'>('day');
    
    // Date Picker State
    const [referenceDate, setReferenceDate] = useState(new Date());
    const [minDate, setMinDate] = useState<Date | undefined>(undefined);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
             if (!session?.user) return;
            setLoading(true);
            
            // 1. Get my orders (all fields)
            const { data: myOrders, error: orderError } = await supabase
                .from('orders')
                .select('*')
                .eq('provider_id', session.user.id)
                .order('created_at', { ascending: true }); // Order by oldest first to find minDate
            
            if (orderError) {
                console.error(orderError);
                setLoading(false);
                return;
            }

            setAllOrders(myOrders || []);

            if (myOrders && myOrders.length > 0) {
                 const firstDate = new Date(myOrders[0].created_at);
                 if (!isNaN(firstDate.getTime())) {
                    setMinDate(firstDate);
                 }
            }
            
            const myOrderIds = myOrders?.map(o => o.id) || [];
            
            if (myOrderIds.length > 0) {
                // 2. Get reviews for those orders
                const { data: reviewsData } = await supabase
                    .from('reviews')
                    .select('*')
                    .in('order_id', myOrderIds)
                    .order('created_at', { ascending: false });

                 // 3. Enrich
                 const enriched = await Promise.all((reviewsData || []).map(async (r) => {
                     const { data: user } = await supabase.from('profiles').select('*').eq('id', r.reviewer_id).single();
                     const order = myOrders?.find(o => o.id === r.order_id);
                     return { ...r, reviewer: user, order: order as Order };
                 }));
                 setReviews(enriched);
            } else {
                setReviews([]);
            }

             setLoading(false);
        };
        fetchData();
    }, [session]);

    const getChartData = () => {
        const labels: string[] = [];
        const requestData: number[] = [];
        const ratingData: number[] = [];
        const complaintData: number[] = [];

        const dataMap = new Map<string, { requests: number, ratings: number, complaints: number }>();
        
        // Helper to format map keys
        const getKey = (date: Date) => {
            if (isNaN(date.getTime())) return "Invalid";
            try {
                if (chartFilter === 'day') return date.toISOString().split('T')[0];
                if (chartFilter === 'month') return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}`;
                if (chartFilter === 'year') return `${date.getFullYear()}`;
                return date.toISOString().split('T')[0];
            } catch (e) {
                return "Invalid";
            }
        };

        const processDateStr = (dateStr: string) => {
            if (!dateStr) return "Invalid";
            const d = new Date(dateStr);
            return getKey(d);
        };

        // Populate Map with ACTUAL data
        allOrders.forEach(o => {
            const key = processDateStr(o.created_at);
            if (!dataMap.has(key)) dataMap.set(key, { requests: 0, ratings: 0, complaints: 0 });
            dataMap.get(key)!.requests++;
        });

        reviews.forEach(r => {
             const key = processDateStr(r.created_at);
             if (!dataMap.has(key)) dataMap.set(key, { requests: 0, ratings: 0, complaints: 0 });
             if (r.complaint) {
                dataMap.get(key)!.complaints++;
             } else {
                dataMap.get(key)!.ratings++;
             }
        });

        // Generate Time Range based on referenceDate
        const keysInRange: string[] = [];
        const displayLabels: string[] = [];
        const numPoints = 6; // Show last 6 points (including current)

        for (let i = numPoints - 1; i >= 0; i--) {
            const d = new Date(referenceDate);
            if (chartFilter === 'day') d.setDate(d.getDate() - i);
            else if (chartFilter === 'month') d.setMonth(d.getMonth() - i);
            else if (chartFilter === 'year') d.setFullYear(d.getFullYear() - i);
            
            const key = getKey(d);
            keysInRange.push(key);
            
            // Format label for display
             if (chartFilter === 'day') displayLabels.push(`${d.getDate()}/${d.getMonth()+1}`);
             else if (chartFilter === 'month') displayLabels.push(`${d.getMonth()+1}/${d.getFullYear().toString().slice(2)}`);
             else displayLabels.push(d.getFullYear().toString());
        }

        // Fill datasets
        keysInRange.forEach(key => {
            const counts = dataMap.get(key) || { requests: 0, ratings: 0, complaints: 0 };
            requestData.push(counts.requests);
            ratingData.push(counts.ratings);
            complaintData.push(counts.complaints);
        });

        return {
            labels: displayLabels,
            datasets: [
                { data: requestData, color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`, strokeWidth: 2 }, 
                { data: ratingData, color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`, strokeWidth: 2 }, 
                { data: complaintData, color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`, strokeWidth: 2 } 
            ],
            legend: ["Solicitudes", "Calificaciones", "Quejas"]
        };
    };

    const filtered = activeTab === 'calificaciones' 
        ? reviews.filter(r => (r.rating || 0) > 1 && !r.complaint) 
        : reviews.filter(r => r.complaint); 

    const chartConfig = {
      backgroundGradientFrom: "#fff",
      backgroundGradientTo: "#fff",
      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      strokeWidth: 2, 
      barPercentage: 0.5,
      useShadowColorFromDataset: false,
      decimalPlaces: 0,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    };

    return (
        <View style={styles.container}>
             <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mi Desempeño</Text>
            </View>
            
            <View style={styles.statsRow}>
                 <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Calificaciones (Total)</Text>
                    <Text style={[styles.statValue, {color: '#F97316'}]}>{reviews.filter(r => !r.complaint).length}</Text>
                </View>
                 <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Quejas (Total)</Text>
                    <Text style={[styles.statValue, {color: '#FF3B30'}]}>{reviews.filter(r => r.complaint).length}</Text>
                </View>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity activeOpacity={1} style={[styles.tabButton, activeTab === 'estadisticas' && styles.tabButtonActive]} onPress={() => setActiveTab('estadisticas')}>
                    <Text style={[styles.tabText, activeTab === 'estadisticas' && styles.tabTextActive]}>Estadísticas</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={1} style={[styles.tabButton, activeTab === 'calificaciones' && styles.tabButtonActive]} onPress={() => setActiveTab('calificaciones')}>
                    <Text style={[styles.tabText, activeTab === 'calificaciones' && styles.tabTextActive]}>Calificaciones</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={1} style={[styles.tabButton, activeTab === 'quejas' && styles.tabButtonActive]} onPress={() => setActiveTab('quejas')}>
                    <Text style={[styles.tabText, activeTab === 'quejas' && styles.tabTextActive]}>Quejas</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[styles.listContent, activeTab === 'estadisticas' && { flex: 1, paddingBottom: 0 }]}>
                {activeTab === 'estadisticas' ? (
                     <View style={{flex: 1}}>
                        <View style={{alignItems: 'center', marginBottom: 20}}>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                backgroundColor: '#FFF7ED', 
                                paddingHorizontal: 16, 
                                paddingVertical: 8, 
                                borderRadius: 20,
                                marginBottom: 12
                            }}>
                                <Ionicons name="calendar" size={20} color="#F97316" style={{marginRight: 8}}/>
                                <Text style={{color: '#F97316', fontWeight: 'bold'}}>
                                    Ver hasta: {referenceDate.toLocaleDateString()}
                                </Text>
                             </TouchableOpacity>

                            <View style={{flexDirection: 'row', gap: 10}}>
                                 <TouchableOpacity onPress={() => setChartFilter('day')} style={{backgroundColor: chartFilter === 'day' ? '#F97316' : '#eee', padding: 8, borderRadius: 8}}>
                                    <Text style={{color: chartFilter === 'day' ? '#fff' : '#000'}}>Día</Text>
                                 </TouchableOpacity>
                                 <TouchableOpacity onPress={() => setChartFilter('month')} style={{backgroundColor: chartFilter === 'month' ? '#F97316' : '#eee', padding: 8, borderRadius: 8}}>
                                    <Text style={{color: chartFilter === 'month' ? '#fff' : '#000'}}>Mes</Text>
                                 </TouchableOpacity>
                                 <TouchableOpacity onPress={() => setChartFilter('year')} style={{backgroundColor: chartFilter === 'year' ? '#F97316' : '#eee', padding: 8, borderRadius: 8}}>
                                    <Text style={{color: chartFilter === 'year' ? '#fff' : '#000'}}>Año</Text>
                                 </TouchableOpacity>
                            </View>
                        </View>
                        
                        <View style={{ alignItems: 'center' }}>
                            <LineChart
                                data={getChartData()}
                                width={Dimensions.get("window").width - 32} 
                                height={220}
                                chartConfig={chartConfig}
                                bezier
                                style={{
                                    marginVertical: 8,
                                    borderRadius: 16
                                }}
                            />
                        </View>
                        
                         <Text style={{textAlign:'center', color: '#666', marginTop: 10}}>
                            Solicitudes, Calificaciones y Quejas (Últimos 6 periodos)
                        </Text>
                     </View>
                ) : (
                    filtered.length === 0 ? <Text style={styles.emptyText}>No hay registros.</Text> : filtered.map(item => (
                    <View key={item.id} style={styles.card}>
                        <Text style={{fontWeight:'bold', fontSize: 16}}>{activeTab === 'calificaciones' ? `${item.rating}.0 ★` : 'Queja'}</Text>
                        <Text style={{color: '#666', marginTop: 4}}>{item.reviewer?.full_name || 'Usuario'}</Text>
                        <Text style={{fontStyle:'italic', marginTop: 8}}>"{item.comment || item.complaint}"</Text>
                        <Text style={{fontSize: 12, color:'#999', marginTop: 8}}>{item.order?.title || 'Servicio'}</Text>
                    </View>
                )))
                }
            </ScrollView>
            
            <CustomDateTimePicker 
                visible={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                onSelect={(date) => {
                    if (date && !isNaN(date.getTime())) {
                        setReferenceDate(date);
                    }
                    setShowDatePicker(false);
                }}
                initialDate={referenceDate}
                minDate={minDate}
                maxDate={new Date()}
                mode="date"
            />
        </View>
    );
};

// 4. Provider Menu (Main Dispatcher)
const ProviderMenuView: React.FC<{ 
    userName: string;
    onSelectOrders: () => void;
    onSelectClient: () => void;
    onSelectPerformance: () => void;
}> = ({ userName, onSelectOrders, onSelectClient, onSelectPerformance }) => {
    return (
        <ScrollView contentContainerStyle={styles.menuContainer}>
            <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Hola, {userName}!</Text>
            </View>

            <TouchableOpacity style={styles.menuCard} onPress={onSelectOrders}>
                <Ionicons name="briefcase-outline" size={32} color="#000" style={{marginBottom: 10}} />
                <Text style={styles.menuCardTitle}>Solicitudes de Servicio</Text>
                <Text style={styles.menuCardDesc}>Gestiona tus trabajos y clientes.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} onPress={onSelectClient}>
                <Ionicons name="person-outline" size={32} color="#000" style={{marginBottom: 10}} />
                <Text style={styles.menuCardTitle}>Soy Cliente</Text>
                <Text style={styles.menuCardDesc}>Deseo ver/gestionar mis encargos.</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuCard} onPress={onSelectPerformance}>
                <Ionicons name="stats-chart-outline" size={32} color="#000" style={{marginBottom: 10}} />
                <Text style={styles.menuCardTitle}>Mi Desempeño</Text>
                <Text style={styles.menuCardDesc}>Revisa tus ganancias y calificaciones.</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

// --- MAIN COMPONENT ---

const Ordenes: React.FC = () => {
    const { session } = useAuth();
    const route = useRoute<any>(); // Add useRoute
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [viewMode, setViewMode] = useState<'loading' | 'menu' | 'client_orders' | 'provider_orders' | 'provider_performance'>('loading');

    // Handle params for direct navigation
    const initialView = route.params?.initialView;

    useEffect(() => {
        const checkUser = async () => {
            if (!session?.user) return;
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            setProfile(data);
            
            if (initialView === 'provider_orders' && data?.is_provider) {
                setViewMode('provider_orders');
            } else if (data?.is_provider) {
                setViewMode('menu');
            } else {
                setViewMode('client_orders');
            }
            setLoading(false);
        };
        checkUser();
    }, [session, initialView]); // Add initialView dependency

    // Also update viewMode if we receive new params while mounted (e.g. from notification)
    useFocusEffect(
        useCallback(() => {
             if (route.params?.initialView === 'provider_orders' && profile?.is_provider) {
                 setViewMode('provider_orders');
                 // clear params? maybe not needed
             }
        }, [route.params?.initialView, profile])
    );

    if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#F97316"/></View>;

    if (viewMode === 'client_orders') {
        // If user is NOT provider, show client view directly (no back button to menu)
        // If user IS provider, show back button
        const showBack = profile?.is_provider;
        return <ClientOrdersView onBack={showBack ? () => setViewMode('menu') : undefined} />;
    }

    if (viewMode === 'provider_orders') return <ProviderOrdersView onBack={() => setViewMode('menu')} />;
    if (viewMode === 'provider_performance') return <ProviderPerformanceView onBack={() => setViewMode('menu')} />;

    // Default to menu for providers
    return <ProviderMenuView 
        userName={profile?.full_name || 'Proveedor'}
        onSelectOrders={() => setViewMode('provider_orders')}
        onSelectClient={() => setViewMode('client_orders')}
        onSelectPerformance={() => setViewMode('provider_performance')}
    />;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  
  // Tab Styles
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  tabButtonActive: { backgroundColor: '#F97316' },
  tabText: { fontSize: 16, color: '#666' },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },
  
  listContent: { padding: 16, backgroundColor: '#f5f5f5', minHeight: '100%' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 16, color: '#999', fontSize: 16, textAlign: 'center' },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  providerInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  providerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  serviceType: { fontSize: 14, color: '#666' },
  addressText: { fontSize: 12, color: '#6B7280', marginTop: 2, marginBottom: 2 },
  dateText: { fontSize: 12, color: '#999', marginTop: 4 },
  
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8 },
  cardBody: { marginBottom: 2 },
  statusLabel: { fontSize: 14, color: '#666' },
  statusValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  
  actionButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionButton: { padding: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  confirmButton: { backgroundColor: '#000', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, flex: 1, alignItems: 'center' },
  confirmButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  reportButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#000', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, flex: 1, alignItems: 'center' },
  reportButtonText: { color: '#000', fontSize: 12, fontWeight: 'bold' },

  // Menu Styles
  menuContainer: { padding: 20, flexGrow: 1, backgroundColor: '#f9f9f9' },
  menuHeader: { marginBottom: 30, marginTop: 40 },
  menuTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  menuCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  menuCardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  menuCardDesc: { fontSize: 14, color: '#666' },

  // Stats Styles
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 20, backgroundColor: '#fff' },
  statBox: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#666' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#F97316' },

  /* Modal Styles */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, color: '#333' },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  commentInput: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12, height: 100, textAlignVertical: 'top', marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
  reasonSelect: { padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 16 },
  modalButton: { backgroundColor: '#000', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  modalButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  closeButton: { alignItems: 'center', padding: 12 },
});

export default Ordenes;
