// Lazy loading utility for services to improve app startup performance
// This prevents heavy services from being imported during app initialization

let normalizedShopService: any = null;
let integratedShopService: any = null;

export const lazyServices = {
  async getNormalizedShopService() {
    if (!normalizedShopService) {
      normalizedShopService = (await import('../lib/supabase/normalized')).normalizedShopService;
    }
    return normalizedShopService;
  },

  async getIntegratedShopService() {
    if (!integratedShopService) {
      integratedShopService = (await import('../lib/supabase/integrated')).default;
    }
    return integratedShopService;
  },

  async getPushNotificationService() {
    const module = await import('../services/safePushNotificationService');
    return module.default;
  }
};

export default lazyServices;