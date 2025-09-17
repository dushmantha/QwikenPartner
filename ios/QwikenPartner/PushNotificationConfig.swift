import Foundation
import UserNotifications

// Push Notification Configuration
// This file helps manage APNs environment settings

class PushNotificationConfig {
    
    static let shared = PushNotificationConfig()
    
    // Automatically determine if we're in production or development
    var isProduction: Bool {
        #if DEBUG
            // Debug builds use APNs development/sandbox environment
            return false
        #else
            // Release builds use APNs production environment
            return true
        #endif
    }
    
    // Get the appropriate APNs environment string
    var environment: String {
        return isProduction ? "production" : "development"
    }
    
    // Bundle identifier
    var bundleId: String {
        return Bundle.main.bundleIdentifier ?? "org.app.qwiken"
    }
    
    // Log configuration on app start
    func logConfiguration() {
        print("📱 Push Notification Configuration:")
        print("   Bundle ID: \(bundleId)")
        print("   APNs Environment: \(environment)")
        print("   Build Configuration: \(isProduction ? "RELEASE" : "DEBUG")")
    }
    
    // Store device token based on environment
    func storeDeviceToken(_ deviceToken: Data) {
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        
        // Store in UserDefaults for easy access
        UserDefaults.standard.set(tokenString, forKey: "DeviceToken")
        UserDefaults.standard.set(environment, forKey: "APNsEnvironment")
        
        print("✅ Device token stored for \(environment) environment")
        print("   Token: \(tokenString)")
    }
}