# OneSignal Setup Instructions

## 1. Create OneSignal Account
1. Go to [OneSignal.com](https://onesignal.com)
2. Sign up for a free account
3. Click "Add a new app/website"

## 2. Configure Web Push
1. Choose "Web Push" platform
2. Enter your app name: "UniMarket"
3. Choose "Typical Site" setup
4. Enter your site URL (e.g., https://yourdomain.com)

## 3. Get Your App ID
1. After creating the app, go to Settings > Keys & IDs
2. Copy your "OneSignal App ID"
3. Replace the App ID in `/src/utils/oneSignal.ts`:
   ```typescript
   const ONESIGNAL_APP_ID = 'YOUR_APP_ID_HERE';
   ```

## 4. Configure Web Push Settings
1. In OneSignal dashboard, go to Settings > Web Configuration
2. Set these options:
   - **Site Name**: UniMarket
   - **Default Icon URL**: https://yourdomain.com/logo.png
   - **Default URL**: https://yourdomain.com
   - **Auto Resubscribe**: Enabled
   - **Persist Notifications**: Enabled

## 5. Add OneSignal Files to Public Folder
1. Download OneSignal SDK files from dashboard
2. Add these files to your `/public` folder:
   - `OneSignalSDKWorker.js`
   - `OneSignalSDKUpdaterWorker.js`

## 6. Configure Manifest (Optional)
Add to your `/public/manifest.json`:
```json
{
  "gcm_sender_id": "482941778795",
  "gcm_sender_id_comment": "Do not change the GCM Sender ID"
}
```

## 7. Test Setup
1. Go to Settings > Notification Settings in your app
2. Click "Test Browser Notification"
3. Allow notifications when prompted
4. You should see a test notification

## 8. Database Integration (Already Configured)
The app is already configured to:
- Send notifications via database triggers
- Use OneSignal REST API for push notifications
- Respect user notification preferences

## 9. Production Setup
For production, you'll need to:
1. Update the App ID in the code
2. Configure your domain in OneSignal
3. Set up proper SSL certificates
4. Test on your live domain

## Current Status
- App ID: `2c42e82a-a1c6-4bf8-bb8b-67106cf7d92c` (demo/test)
- Browser notifications: ✅ Working
- Database integration: ✅ Working
- Email notifications: ✅ Working
- User preferences: ✅ Working

## Troubleshooting
- **No notifications**: Check browser permissions
- **Permission denied**: Clear site data and try again
- **OneSignal errors**: Verify App ID is correct
- **HTTPS required**: OneSignal requires HTTPS in production