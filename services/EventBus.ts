import { EventEmitter } from 'events';

/**
 * Event types for the realtime system
 */
export interface RealtimeEvent {
  // Chat events
  NEW_MESSAGE: {
    chatRoomId: string;
    message: {
      message_id: number;
      sender_id: string;
      sender_name: string;
      content: string;
      message_type: string;
      created_at: string;
      is_own: boolean;
    };
  };
  MESSAGE_READ: {
    chatRoomId: string;
    messageId: number;
    readBy: string;
  };
  TYPING_START: {
    chatRoomId: string;
    userId: string;
    userName: string;
  };
  TYPING_END: {
    chatRoomId: string;
    userId: string;
  };

  // Invitation events
  NEW_INVITATION: {
    groupId: string;
    groupName: string;
    invitedBy: string;
    invitedByName: string;
  };
  INVITATION_ACCEPTED: {
    groupId: string;
    acceptedBy: string;
  };
  INVITATION_DECLINED: {
    groupId: string;
    declinedBy: string;
  };

  // Match events
  NEW_LIKE: {
    fromGroupId: string;
    fromGroupName: string;
    toGroupId: string;
  };
  NEW_MATCH: {
    matchId: string;
    chatRoomId: string;
    groupName: string;
  };

  // Group events
  GROUP_UPDATED: {
    groupId: string;
    status: string;
  };
  GROUP_MEMBER_JOINED: {
    groupId: string;
    userId: string;
    userName: string;
  };
  GROUP_MEMBER_LEFT: {
    groupId: string;
    userId: string;
  };

  // Connection events
  CONNECTION_STATUS: {
    status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
    error?: string;
  };

  // UI refresh events
  REFRESH_MESSAGES_COUNT: {};
  REFRESH_LIKES_COUNT: {};
  REFRESH_INVITATIONS: {};
}

export type EventType = keyof RealtimeEvent;
export type EventPayload<T extends EventType> = RealtimeEvent[T];

/**
 * Centralized EventBus for managing realtime events across the app
 */
class EventBusService extends EventEmitter {
  private static instance: EventBusService;

  constructor() {
    super();
    this.setMaxListeners(50); // Allow many listeners for global events
  }

  static getInstance(): EventBusService {
    if (!EventBusService.instance) {
      EventBusService.instance = new EventBusService();
    }
    return EventBusService.instance;
  }

  /**
   * Emit a typed event with payload
   */
  emitEvent<T extends EventType>(event: T, payload: EventPayload<T>): void {
    console.log(`[EventBus] Emitting event: ${event}`, payload);
    this.emit(event, payload);
  }

  /**
   * Subscribe to a typed event
   */
  onEvent<T extends EventType>(
    event: T,
    listener: (payload: EventPayload<T>) => void
  ): () => void {
    console.log(`[EventBus] Adding listener for: ${event}`);
    this.on(event, listener);
    
    // Return unsubscribe function
    return () => {
      console.log(`[EventBus] Removing listener for: ${event}`);
      this.off(event, listener);
    };
  }

  /**
   * Subscribe to a typed event (once only)
   */
  onceEvent<T extends EventType>(
    event: T,
    listener: (payload: EventPayload<T>) => void
  ): void {
    console.log(`[EventBus] Adding one-time listener for: ${event}`);
    this.once(event, listener);
  }

  /**
   * Get the number of listeners for an event
   */
  getListenerCount(event: EventType): number {
    return this.listenerCount(event);
  }

  /**
   * Remove all listeners for a specific event
   */
  removeAllListenersForEvent(event: EventType): void {
    console.log(`[EventBus] Removing all listeners for: ${event}`);
    this.removeAllListeners(event);
  }

  /**
   * Get debug info about current listeners
   */
  getDebugInfo(): { [key: string]: number } {
    const info: { [key: string]: number } = {};
    const events = this.eventNames() as EventType[];
    
    events.forEach(event => {
      info[event] = this.listenerCount(event);
    });

    return info;
  }
}

// Export singleton instance
export const EventBus = EventBusService.getInstance();

// Convenience functions for common events
export const emitNewMessage = (chatRoomId: string, message: EventPayload<'NEW_MESSAGE'>['message']) => {
  EventBus.emitEvent('NEW_MESSAGE', { chatRoomId, message });
};

export const emitNewInvitation = (groupId: string, groupName: string, invitedBy: string, invitedByName: string) => {
  EventBus.emitEvent('NEW_INVITATION', { groupId, groupName, invitedBy, invitedByName });
};

export const emitNewMatch = (matchId: string, chatRoomId: string, groupName: string) => {
  EventBus.emitEvent('NEW_MATCH', { matchId, chatRoomId, groupName });
};

export const emitConnectionStatus = (status: EventPayload<'CONNECTION_STATUS'>['status'], error?: string) => {
  EventBus.emitEvent('CONNECTION_STATUS', { status, error });
};

export const emitRefreshMessages = () => {
  EventBus.emitEvent('REFRESH_MESSAGES_COUNT', {});
};

export const emitRefreshLikes = () => {
  EventBus.emitEvent('REFRESH_LIKES_COUNT', {});
};

export default EventBus;