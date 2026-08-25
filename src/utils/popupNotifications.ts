// Utility functions for triggering popup notifications

interface PopupNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  action_url?: string;
  created_at: string;
}

export const showPopupNotification = (notification: Omit<PopupNotification, 'id' | 'created_at'>) => {
  const fullNotification: PopupNotification = {
    id: Math.random().toString(36).substr(2, 9),
    created_at: new Date().toISOString(),
    ...notification
  };

  // Try multiple methods to ensure notification shows
  
  // Method 1: Custom event
  window.dispatchEvent(new CustomEvent('showPopupNotification', {
    detail: fullNotification
  }));

  // Method 2: Direct function call (if available)
  if ((window as any).showPopupNotification) {
    (window as any).showPopupNotification(fullNotification);
  }


};

// Predefined notification types
export const showSuccessNotification = (title: string, message: string, actionUrl?: string) => {
  showPopupNotification({
    title,
    message,
    type: 'success',
    action_url: actionUrl
  });
};

export const showErrorNotification = (title: string, message: string) => {
  showPopupNotification({
    title,
    message,
    type: 'error'
  });
};

export const showInfoNotification = (title: string, message: string, actionUrl?: string) => {
  showPopupNotification({
    title,
    message,
    type: 'info',
    action_url: actionUrl
  });
};

export const showMessageNotification = (title: string, message: string) => {
  showPopupNotification({
    title,
    message,
    type: 'message',
    action_url: '/messages'
  });
};