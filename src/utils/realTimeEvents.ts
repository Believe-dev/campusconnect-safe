// Real-time event utilities for immediate UI updates

export const triggerCartUpdate = () => {
  window.dispatchEvent(new CustomEvent('cartUpdated'));
};

export const triggerOrdersUpdate = () => {
  window.dispatchEvent(new CustomEvent('ordersUpdated'));
};

export const triggerMessagesUpdate = () => {
  window.dispatchEvent(new CustomEvent('messagesUpdated'));
};

export const triggerNotificationsUpdate = () => {
  window.dispatchEvent(new CustomEvent('notificationsUpdated'));
};

export const triggerProfileUpdate = () => {
  window.dispatchEvent(new CustomEvent('profileUpdated'));
};

// Batch update multiple components at once
export const triggerMultipleUpdates = (events: string[]) => {
  events.forEach(event => {
    window.dispatchEvent(new CustomEvent(event));
  });
};