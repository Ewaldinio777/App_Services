import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Text } from "@/src/components/ui/text";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "@/src/lib/supabase-client";
import { Order, Profile, Service } from "@/src/types/database.types";
import { Ionicons } from "@react-native-vector-icons/ionicons";

interface OrderWithDetails extends Order {
  client?: Profile;
  provider?: Profile;
  service?: Service;
}

const Ordenes: React.FC = () => {
  const { session } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'client' | 'provider'>('all');

  useEffect(() => {
    if (session?.user) {
      loadOrders();

      // Subscribe to order changes
      const subscription = supabase
        .channel('orders_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            loadOrders();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [session, filter]);

  const loadOrders = async () => {
    try {
      if (!session?.user) return;

      let query = supabase.from('orders').select('*');

      if (filter === 'client') {
        query = query.eq('client_id', session.user.id);
      } else if (filter === 'provider') {
        query = query.eq('provider_id', session.user.id);
      } else {
        query = query.or(`client_id.eq.${session.user.id},provider_id.eq.${session.user.id}`);
      }

      const { data: ordersData, error: ordersError } = await query
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Load details for each order
      const ordersWithDetails = await Promise.all(
        (ordersData || []).map(async (order) => {
          // Load client profile
          const { data: clientData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', order.client_id)
            .single();

          // Load provider profile
          const { data: providerData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', order.provider_id)
            .single();

          // Load service
          const { data: serviceData } = await supabase
            .from('services')
            .select('*')
            .eq('id', order.service_id)
            .single();

          return {
            ...order,
            client: clientData,
            provider: providerData,
            service: serviceData,
          };
        })
      );

      setOrders(ordersWithDetails);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'accepted': return '#007AFF';
      case 'in_progress': return '#007AFF';
      case 'completed': return '#34C759';
      case 'cancelled': return '#FF3B30';
      default: return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'accepted': return 'Aceptada';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
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
        <Text style={styles.headerTitle}>Órdenes</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'client' && styles.filterButtonActive]}
          onPress={() => setFilter('client')}
        >
          <Text style={[styles.filterText, filter === 'client' && styles.filterTextActive]}>
            Como Cliente
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'provider' && styles.filterButtonActive]}
          onPress={() => setFilter('provider')}
        >
          <Text style={[styles.filterText, filter === 'provider' && styles.filterTextActive]}>
            Como Proveedor
          </Text>
        </TouchableOpacity>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="list-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No tienes órdenes</Text>
        </View>
      ) : (
        orders.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderItem}
            onPress={() => {
              // TODO: Navigate to order detail screen
              console.log('Navigate to order:', order.id);
            }}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderTitle}>
                {order.service?.title || 'Servicio'}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
              </View>
            </View>

            <View style={styles.orderDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="person" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {order.client_id === session.user.id
                    ? `Proveedor: ${order.provider?.full_name || 'N/A'}`
                    : `Cliente: ${order.client?.full_name || 'N/A'}`
                  }
                </Text>
              </View>

              {order.description && (
                <Text style={styles.orderDescription} numberOfLines={2}>
                  {order.description}
                </Text>
              )}

              {order.total_price && (
                <View style={styles.detailRow}>
                  <Ionicons name="cash" size={16} color="#007AFF" />
                  <Text style={styles.priceText}>${order.total_price.toFixed(2)}</Text>
                </View>
              )}

              <Text style={styles.orderDate}>
                {new Date(order.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
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
  filterContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  orderItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  orderDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});

export default Ordenes;
