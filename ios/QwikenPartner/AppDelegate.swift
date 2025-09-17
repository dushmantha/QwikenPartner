import UIKit
import React_RCTAppDelegate
import React
import UserNotifications

// Note: These imports will be resolved at runtime based on what's available

@main
class AppDelegate: RCTAppDelegate {
  
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    self.moduleName = "Qwiken Partner"
    
    // You can add your custom initial props in the dictionary below.
    // They will be passed down to the ViewController used by React Native.
    self.initialProps = [:]
    
    // Configure UserNotifications
    let center = UNUserNotificationCenter.current()
    center.delegate = self
    
    // Check current notification settings
    center.getNotificationSettings { settings in
      print("Current notification status: \(settings.authorizationStatus.rawValue)")
      
      switch settings.authorizationStatus {
      case .notDetermined:
        // First time - request permissions
        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
          if granted {
            print("Push notification permissions granted")
            DispatchQueue.main.async {
              application.registerForRemoteNotifications()
            }
          } else {
            print("Push notification permissions denied")
          }
          
          if let error = error {
            print("Error requesting permissions: \(error)")
          }
        }
        
      case .authorized, .provisional, .ephemeral:
        // Already authorized - register for remote notifications
        print("Push notifications already authorized")
        DispatchQueue.main.async {
          application.registerForRemoteNotifications()
        }
        
      case .denied:
        // User denied - we can't request again programmatically
        print("Push notifications denied by user")
        
      @unknown default:
        print("Unknown authorization status")
      }
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
  
  // MARK: - Push Notification Registration
  
  override func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
    let token = tokenParts.joined()
    print("🎉 Native iOS Device Token Generated: \(token)")
    
    // Forward to React Native modules
    self.forwardTokenToReactNative(deviceToken: deviceToken)
  }
  
  private func forwardTokenToReactNative(deviceToken: Data) {
    guard let bridge = self.bridge else {
      print("❌ React Native bridge not available")
      return
    }
    
    // Try to forward to RNCPushNotificationIOS
    if let pushNotificationIOSClass = NSClassFromString("RNCPushNotificationIOS"),
       let pushNotificationManager = bridge.module(for: pushNotificationIOSClass) as? NSObject {
      if pushNotificationManager.responds(to: NSSelectorFromString("didRegisterForRemoteNotificationsWithDeviceToken:")) {
        pushNotificationManager.perform(NSSelectorFromString("didRegisterForRemoteNotificationsWithDeviceToken:"), with: deviceToken)
        print("✅ Device token forwarded to RNCPushNotificationIOS")
      }
    }
    
    // Try to forward to RCTPushNotificationManager (fallback)
    if let pushNotificationManagerClass = NSClassFromString("RCTPushNotificationManager"),
       let pushNotificationManager = bridge.module(for: pushNotificationManagerClass) as? NSObject {
      if pushNotificationManager.responds(to: NSSelectorFromString("didRegisterForRemoteNotificationsWithDeviceToken:")) {
        pushNotificationManager.perform(NSSelectorFromString("didRegisterForRemoteNotificationsWithDeviceToken:"), with: deviceToken)
        print("✅ Device token forwarded to RCTPushNotificationManager")
      }
    }
    
    print("📱 Device token forwarding completed")
  }
  
  override func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("❌ Native iOS Failed to register for remote notifications: \(error)")
    
    // Forward error to React Native modules
    self.forwardErrorToReactNative(error: error)
  }
  
  private func forwardErrorToReactNative(error: Error) {
    guard let bridge = self.bridge else {
      print("❌ React Native bridge not available for error forwarding")
      return
    }
    
    // Try to forward to RNCPushNotificationIOS
    if let pushNotificationIOSClass = NSClassFromString("RNCPushNotificationIOS"),
       let pushNotificationManager = bridge.module(for: pushNotificationIOSClass) as? NSObject {
      if pushNotificationManager.responds(to: NSSelectorFromString("didFailToRegisterForRemoteNotificationsWithError:")) {
        pushNotificationManager.perform(NSSelectorFromString("didFailToRegisterForRemoteNotificationsWithError:"), with: error)
        print("✅ Error forwarded to RNCPushNotificationIOS")
      }
    }
  }
  
  override func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    print("📱 Native iOS Received remote notification: \(userInfo)")
    
    // Forward to React Native modules
    self.forwardNotificationToReactNative(userInfo: userInfo)
    
    completionHandler(.newData)
  }
  
  private func forwardNotificationToReactNative(userInfo: [AnyHashable : Any]) {
    guard let bridge = self.bridge else {
      print("❌ React Native bridge not available for notification forwarding")
      return
    }
    
    // Try to forward to RNCPushNotificationIOS
    if let pushNotificationIOSClass = NSClassFromString("RNCPushNotificationIOS"),
       let pushNotificationManager = bridge.module(for: pushNotificationIOSClass) as? NSObject {
      if pushNotificationManager.responds(to: NSSelectorFromString("didReceiveRemoteNotification:")) {
        pushNotificationManager.perform(NSSelectorFromString("didReceiveRemoteNotification:"), with: userInfo)
        print("✅ Remote notification forwarded to RNCPushNotificationIOS")
      }
    }
  }
}

// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate: UNUserNotificationCenterDelegate {
  // Called when a notification is delivered to a foreground app.
  func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([.alert, .badge, .sound])
  }
  
  // Called when user interacts with notification
  func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
    print("User interacted with notification: \(response)")
    completionHandler()
  }
}
