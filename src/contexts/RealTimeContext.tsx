import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealTimeState {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastActivity: Date | null;
  retryCount: number;
}

interface RealTimeContextType {
  state: RealTimeState;
  subscribeToMessages: (conversationId: string, callback: (message: any) => void) => () => void;
  subscribeToConversationReads: (conversationId: string, callback: (read: any) => void) => () => void;
  subscribeToNotifications: (callback: (notification: any) => void) => () => void;
  subscribeToOrders: (callback: (order: any) => void) => () => void;
  subscribeToProducts: (callback: (product: any) => void) => () => void;
  subscribeToPresence: (conversationId: string, callback: (presence: any) => void) => () => void;
  optimisticUpdate: (type: string, data: any) => void;
  broadcastPresence: (conversationId: string, data: any) => void;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

export const useRealTime = () => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within RealTimeProvider');
  }
  return context;
};

export const RealTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState<RealTimeState>({
    isConnected: false,
    connectionStatus: 'disconnected',
    lastActivity: null,
    retryCount: 0
  });

  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  // Connection management
  const initializeConnection = useCallback(async () => {
    if (!user) return;

    setState(prev => ({ ...prev, connectionStatus: 'connecting' }));

    try {
      // Test connection
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      
      if (error) throw error;

      setState(prev => ({
        ...prev,
        isConnected: true,
        connectionStatus: 'connected',
        lastActivity: new Date(),
        retryCount: 0
      }));

      // Start heartbeat
      startHeartbeat();

    } catch (error) {
      console.error('Real-time connection failed:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionStatus: 'error',
        retryCount: prev.retryCount + 1
      }));
      
      // Retry with exponential backoff
      const retryDelay = Math.min(1000 * Math.pow(2, state.retryCount), 30000);
      reconnectTimeoutRef.current = setTimeout(initializeConnection, retryDelay);
    }
  }, [user, state.retryCount]);

  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(async () => {
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) throw error;
        
        setState(prev => ({ ...prev, lastActivity: new Date() }));
      } catch (error) {
        setState(prev => ({ ...prev, isConnected: false, connectionStatus: 'error' }));
        initializeConnection();
      }
    }, 30000); // 30 second heartbeat
  }, [initializeConnection]);

  // Subscription management
  const createChannel = useCallback((channelName: string) => {
    const existingChannel = channelsRef.current.get(channelName);
    if (existingChannel) {
      existingChannel.unsubscribe();
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: user?.id || 'anonymous' }
      }
    });

    channelsRef.current.set(channelName, channel);
    return channel;
  }, [user?.id]);

  const subscribeToMessages = useCallback((conversationId: string, callback: (message: any) => void) => {
    if (!user) return () => {};

    const channelName = `messages_${conversationId}`;
    const channel = createChannel(channelName);

    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        callback(payload.new);
        setState(prev => ({ ...prev, lastActivity: new Date() }));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        callback({ ...payload.new, _isUpdate: true });
        setState(prev => ({ ...prev, lastActivity: new Date() }));
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      channelsRef.current.delete(channelName);
    };
  }, [user, createChannel]);

  const subscribeToConversationReads = useCallback((conversationId: string, callback: (read: any) => void) => {
    if (!user) return () => {};

    const channelName = `reads_${conversationId}`;
    const channel = createChannel(channelName);

    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_reads',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        callback(payload.new);
        setState(prev => ({ ...prev, lastActivity: new Date() }));
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      channelsRef.current.delete(channelName);
    };
  }, [user, createChannel]);

  const subscribeToNotifications = useCallback((callback: (notification: any) => void) => {
    if (!user) return () => {};

    const channelName = `notifications_${user.id}`;
    const channel = createChannel(channelName);

    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        callback(payload.new);
        setState(prev => ({ ...prev, lastActivity: new Date() }));
        
        // Trigger global notification event
        window.dispatchEvent(new CustomEvent('notificationReceived', { 
          detail: payload.new 
        }));
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      channelsRef.current.delete(channelName);
    };
  }, [user, createChannel]);

  const subscribeToOrders = useCallback((callback: (order: any) => void) => {
    if (!user) return () => {};

    const channelName = `orders_${user.id}`;
    const channel = createChannel(channelName);

    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        callback(payload);
        setState(prev => ({ ...prev, lastActivity: new Date() }));
        
        // Trigger global order update event
        window.dispatchEvent(new CustomEvent('orderUpdated', { 
          detail: payload 
        }));
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      channelsRef.current.delete(channelName);
    };
  }, [user, createChannel]);

  const subscribeToProducts = useCallback((callback: (product: any) => void) => {
    if (!user) return () => {};

    const channelName = `products_global`;
    const channel = createChannel(channelName);

    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products'
      }, (payload) => {
        callback(payload);
        setState(prev => ({ ...prev, lastActivity: new Date() }));
        
        // Trigger global product update event
        window.dispatchEvent(new CustomEvent('productUpdated', { 
          detail: payload 
        }));
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      channelsRef.current.delete(channelName);
    };
  }, [user, createChannel]);

  const optimisticUpdate = useCallback((type: string, data: any) => {
    // Dispatch optimistic update event
    window.dispatchEvent(new CustomEvent('optimisticUpdate', {
      detail: { type, data, timestamp: Date.now() }
    }));
  }, []);

  const subscribeToPresence = useCallback((conversationId: string, callback: (presence: any) => void) => {
    if (!user) return () => {};

    // Scoped per-conversation instead of one global 'presence' channel —
    // the old shared channel meant any component calling this tore down
    // and replaced the app's single presence subscription, and typing
    // broadcasts from one conversation had no way to avoid leaking into
    // another if two chats were ever open in the same session.
    const channelName = `presence_${conversationId}`;
    const channel = createChannel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id !== user.id) {
              callback(presence);
            }
          });
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.user_id !== user.id) {
            callback(presence);
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          if (presence.user_id !== user.id) {
            callback({ ...presence, _left: true });
          }
        });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      channelsRef.current.delete(channelName);
    };
  }, [user, createChannel]);

  const broadcastPresence = useCallback(async (conversationId: string, data: any) => {
    if (!user) return;

    const channelName = `presence_${conversationId}`;
    let channel = channelsRef.current.get(channelName);
    if (!channel) {
      channel = createChannel(channelName);
      await channel.subscribe();
    }

    try {
      await channel.track({ user_id: user.id, ...data });
    } catch (error) {
      console.error('Failed to broadcast presence:', error);
    }
  }, [user, createChannel]);

  // Initialize connection on mount
  useEffect(() => {
    if (user) {
      initializeConnection();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      // Cleanup all channels
      channelsRef.current.forEach(channel => channel.unsubscribe());
      channelsRef.current.clear();
    };
  }, [user, initializeConnection]);

  // Handle visibility change for connection management
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, reduce activity
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      } else {
        // Page is visible, resume activity
        if (state.isConnected) {
          startHeartbeat();
        } else {
          initializeConnection();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isConnected, startHeartbeat, initializeConnection]);

  const contextValue: RealTimeContextType = {
    state,
    subscribeToMessages,
    subscribeToConversationReads,
    subscribeToNotifications,
    subscribeToOrders,
    subscribeToProducts,
    subscribeToPresence,
    optimisticUpdate,
    broadcastPresence
  };

  return (
    <RealTimeContext.Provider value={contextValue}>
      {children}
    </RealTimeContext.Provider>
  );
};