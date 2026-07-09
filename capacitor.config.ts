import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.unimarket.app",
  appName: "UniMarket",
  webDir: "dist",

  // Server configuration
  server: {
    // Allow cleartext traffic for local development only
    // In production, this will be ignored as we use HTTPS
    androidScheme: "https",
    iosScheme: "capacitor",
    // Hostname for the app
    hostname: "unimarket.com.ng",
    // Allow navigation to external URLs
    allowNavigation: [
      "unimarket.com.ng",
      "*.unimarket.com.ng",
      "https://unimarket.com.ng",
      "js.paystack.co",
      "*.supabase.co",
      "fonts.googleapis.com",
      "fonts.gstatic.com",
    ],
  },

  // iOS specific configuration
  ios: {
    contentInset: "never",
    // Keyboard behavior
    scrollEnabled: true,
    // Allow inline media playback
    allowsInlineMediaPlayback: true,
    // Suppress incremental rendering for better performance
    suppressesIncrementalRendering: false,
    // Handle links
    limitsNavigationsToAppBoundDomains: false,
    // Prefer status bar overlay
    preferredContentMode: "mobile",
  },

  // Android specific configuration
  android: {
    // Allow mixed content for development
    allowMixedContent: false,
    // Capture back button
    captureInput: true,
    // Web view debugging (disable in production)
    webContentsDebuggingEnabled: false,
    // Background color
    backgroundColor: "#ffffff",
    // Keyboard behavior
    resizeOnFullScreen: true,
  },

  // Splash screen configuration
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "FIT_CENTER",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#16a34a",
      splashFullScreen: false,
      splashImmersive: false,
    },

    // Status bar configuration
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#16a34a",
    },

    // Keyboard configuration
    Keyboard: {
      resize: "body",
      style: "DARK",
      resizeOnFullScreen: true,
    },

    // Push notifications
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
