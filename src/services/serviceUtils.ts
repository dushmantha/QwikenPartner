// src/services/serviceUtils.ts
import React from 'react';
import { ServiceOption, ServiceOptionState, ApiResponse } from '../types/service';
import { serviceOptionsAPI, ServiceOption as APIServiceOption } from './api/serviceOptions/serviceOptionsAPI';
import { formatCurrency, CURRENCY } from '../utils/currency';

/**
 * Utility class for handling service-related API calls and data transformations
 */
export class ServiceUtils {
  /**
   * Helper function to validate UUID
   */
  private static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Fetches service options from the API and transforms them for component use
   */
  static async fetchServiceOptions(serviceId: string, shopId?: string): Promise<{
    options: ServiceOptionState[];
    error: string | null;
  }> {
    try {
      // Validate that serviceId is a proper UUID
      if (!serviceId || !ServiceUtils.isValidUUID(serviceId)) {
        console.warn('⚠️ Invalid service ID format:', serviceId, 'Expected UUID format');
        return {
          options: [],
          error: 'Invalid service ID format. Service must be saved first.'
        };
      }

      // Use the real service options API
      const { data, error } = await serviceOptionsAPI.getServiceOptionsForConsumer(serviceId, shopId);
      
      if (error) {
        return {
          options: [],
          error: error
        };
      }

      if (!data || data.length === 0) {
        console.log('📋 No service options available for:', serviceId);
        return {
          options: [],
          error: null
        };
      }

      // Transform API response to component state format
      const transformedOptions: ServiceOptionState[] = data.map((apiOption: APIServiceOption, index: number) => ({
        id: apiOption.id || `opt-${index}`,
        name: apiOption.option_name,
        description: apiOption.option_description || '',
        duration: `${apiOption.duration} min`,
        price: formatCurrency(apiOption.price),
        selected: index === 0, // Select first option by default
      }));

      return {
        options: transformedOptions,
        error: null
      };
    } catch (error) {
      console.error('Error in fetchServiceOptions:', error);
      return {
        options: [],
        error: 'Failed to load service options'
      };
    }
  }

  /**
   * Fetches a service with its options in a single call
   */
  static async fetchServiceWithOptions(serviceId: string) {
    try {
      // TODO: Replace with real API call to Supabase
      console.log('TODO: Implement fetchServiceWithOptions for service:', serviceId);
      
      return {
        service: null,
        options: [],
        error: 'Service not found - mock data removed'
      };
    } catch (error) {
      console.error('Error in fetchServiceWithOptions:', error);
      return {
        service: null,
        options: [],
        error: 'Failed to load service with options'
      };
    }
  }

  /**
   * Calculates total price from selected options
   */
  static calculateTotalPrice(options: ServiceOptionState[]): number {
    return options
      .filter(option => option.selected)
      .reduce((total, option) => {
        const price = parseFloat(option.price.replace(/[^0-9.]/g, ''));
        return total + (isNaN(price) ? 0 : price);
      }, 0);
  }

  /**
   * Validates if at least one option is selected
   */
  static hasSelectedOptions(options: ServiceOptionState[]): boolean {
    return options.some(option => option.selected);
  }

  /**
   * Formats price for display
   */
  static formatPrice(price: number, currency: string = CURRENCY.code): string {
    return formatCurrency(price);
  }

  /**
   * Formats duration for display
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${remainingMinutes}min`;
      }
    }
  }

  /**
   * Transforms selected options for booking
   */
  static prepareSelectedServicesForBooking(options: ServiceOptionState[]) {
    return options
      .filter(option => option.selected)
      .map(option => ({
        id: option.id,
        name: option.name,
        price: option.price,
        duration: option.duration
      }));
  }
}

/**
 * Custom hook for managing service options state
 */
export const useServiceOptions = (serviceId: string, shopId?: string) => {
  const [options, setOptions] = React.useState<ServiceOptionState[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchOptions = React.useCallback(async () => {
    if (!serviceId) return;
    
    setLoading(true);
    setError(null);
    
    const result = await ServiceUtils.fetchServiceOptions(serviceId, shopId);
    
    setOptions(result.options);
    setError(result.error);
    setLoading(false);
  }, [serviceId, shopId]);

  const toggleOption = React.useCallback((optionId: string) => {
    setOptions(prevOptions => 
      prevOptions.map(option => 
        option.id === optionId 
          ? { ...option, selected: !option.selected }
          : option
      )
    );
  }, []);

  const selectOption = React.useCallback((optionId: string) => {
    setOptions(prevOptions => 
      prevOptions.map(option => 
        option.id === optionId 
          ? { ...option, selected: true }
          : option
      )
    );
  }, []);

  const deselectOption = React.useCallback((optionId: string) => {
    setOptions(prevOptions => 
      prevOptions.map(option => 
        option.id === optionId 
          ? { ...option, selected: false }
          : option
      )
    );
  }, []);

  const clearAllSelections = React.useCallback(() => {
    setOptions(prevOptions => 
      prevOptions.map(option => ({ ...option, selected: false }))
    );
  }, []);

  const selectAllOptions = React.useCallback(() => {
    setOptions(prevOptions => 
      prevOptions.map(option => ({ ...option, selected: true }))
    );
  }, []);

  const totalPrice = React.useMemo(() => 
    ServiceUtils.calculateTotalPrice(options), [options]
  );

  const hasSelections = React.useMemo(() => 
    ServiceUtils.hasSelectedOptions(options), [options]
  );

  const selectedCount = React.useMemo(() => 
    options.filter(option => option.selected).length, [options]
  );

  React.useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return {
    options,
    loading,
    error,
    totalPrice,
    hasSelections,
    selectedCount,
    actions: {
      toggleOption,
      selectOption,
      deselectOption,
      clearAllSelections,
      selectAllOptions,
      refetch: fetchOptions,
    }
  };
};