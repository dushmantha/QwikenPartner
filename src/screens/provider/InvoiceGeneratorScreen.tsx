import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
  SafeAreaView,
  Modal,
  Linking,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizedShopService } from '../../lib/supabase/normalized';
import { InvoiceGenerator } from '../../services/InvoiceGenerator';

const { width: screenWidth } = Dimensions.get('window');

interface InvoiceData {
  // Company Information
  companyName: string;
  companyLogo?: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite?: string;
  gstNumber: string;
  businessNumber: string;
  
  // Invoice Details
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  
  // Client Information
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  
  // Service Details
  serviceTitle: string;
  serviceDescription: string;
  serviceDate: string;
  serviceDuration: string;
  servicePrice: number;
  
  // Additional Charges
  gstRate: number;
  discountAmount?: number;
  additionalFees?: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
  
  // Terms and Conditions
  termsAndConditions: string;
  notes?: string;
  
  // Payment Information
  paymentMethod?: string;
  paymentTerms: string;
  
  // Signature
  providerSignature?: string;
  signatureDate: string;
}

interface BookingData {
  id: string;
  title: string;
  service_type: string;
  client: string;
  client_phone: string;
  client_email: string;
  time: string;
  date: string;
  scheduled_time: string;
  location: string;
  status: string;
  priority: string;
  duration: string;
  price: number;
  notes: string;
  booking_id: string;
  created_at: string;
}

interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// API Configuration
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'https://your-api-domain.com/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

const InvoiceGeneratorScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal states
  const [showCompanySetup, setShowCompanySetup] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  
  // Data states
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    // Default company data
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    gstNumber: '',
    businessNumber: '',
    
    // Auto-generated invoice details
    invoiceNumber: generateInvoiceNumber(),
    invoiceDate: formatDate(new Date()),
    dueDate: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // Default 30 days
    
    // Client data - will be populated from booking
    clientName: '',
    clientAddress: '',
    clientPhone: '',
    clientEmail: '',
    
    // Service data - will be populated from booking
    serviceTitle: '',
    serviceDescription: '',
    serviceDate: '',
    serviceDuration: '',
    servicePrice: 0,
    
    // Default rates and terms
    gstRate: 15, // New Zealand GST rate
    additionalFees: [],
    termsAndConditions: `Payment Terms:
• Payment is due within 30 days of invoice date
• Late payments may incur additional charges of 2% per month
• All prices are in NZD and include GST where applicable

Service Terms:
• Services are provided as agreed upon booking
• Any additional services will be quoted separately
• Cancellation policy applies as per booking terms
• Work completed remains property of ${''} until payment is received in full

Contact Information:
• For payment queries, please contact our accounts department
• For service queries, please contact your service representative

Thank you for choosing our services.`,
    paymentTerms: 'Net 30 days',
    signatureDate: formatDate(new Date()),
  });

  // Focus effect to reload data when screen becomes active
  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [])
  );

  useEffect(() => {
    setupNavigationHeader();
  }, [isLoading, isSaving]);

  // Utility Functions
  function generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}${day}-${random}`;
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-NZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function generateUniqueId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Setup navigation header with improved state management
  const setupNavigationHeader = () => {
    navigation.setOptions({
      headerShown: false, // Hide the default navigation header
    });
  };

  // Calculate due date based on payment terms
  const calculateDueDate = (invoiceDate: string, paymentTerms: string = 'Net 30 days'): string => {
    try {
      const date = new Date(invoiceDate.split('/').reverse().join('-')); // Convert DD/MM/YYYY to YYYY-MM-DD
      const daysMatch = paymentTerms.match(/\d+/);
      const days = daysMatch ? parseInt(daysMatch[0]) : 30;
      date.setDate(date.getDate() + days);
      return formatDate(date);
    } catch (error) {
      console.error('Error calculating due date:', error);
      return formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    }
  };

  // Enhanced error handling for API calls
  const handleApiError = (error: any): ApiError => {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.message || 'Server error occurred',
        code: error.response.data?.code,
        status: error.response.status,
      };
    } else if (error.request) {
      // Network error
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      };
    } else {
      // Other error
      return {
        message: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      };
    }
  };

  // Retry mechanism for API calls
  const retryApiCall = async <T,>(
    apiCall: () => Promise<T>,
    maxRetries: number = API_CONFIG.RETRY_ATTEMPTS
  ): Promise<T> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = API_CONFIG.RETRY_DELAY * attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries reached');
  };

  // Load initial data with improved error handling
  const loadInitialData = async () => {
    try {
      setIsInitialLoading(true);
      
      // Load booking data
      const selectedBookingData = await AsyncStorage.getItem('selectedBookingForInvoice');
      if (selectedBookingData) {
        try {
          const parsedData = JSON.parse(selectedBookingData);
          setBookingData(parsedData.bookingData || parsedData);
          
          // Populate invoice data with booking information
          const booking = parsedData.bookingData || parsedData;
          setInvoiceData(prev => ({
            ...prev,
            clientName: booking.client || '',
            clientAddress: booking.location || '',
            clientPhone: booking.client_phone || '',
            clientEmail: booking.client_email || '',
            serviceTitle: booking.title || booking.service_type || '',
            serviceDescription: booking.notes || '',
            serviceDate: booking.date || '',
            serviceDuration: booking.duration || '',
            servicePrice: Number(booking.price) || 0,
          }));
        } catch (parseError) {
          console.error('Error parsing booking data:', parseError);
          Alert.alert('Warning', 'Could not load booking data. You can still create an invoice manually.');
        }
      }
      
      // Load shop data from database first
      let shopData = null;
      try {
        const user = await normalizedShopService.getCurrentUser();
        if (user?.id) {
          // Get provider's shops
          const { data: shops } = await normalizedShopService.client
            .from('provider_businesses')
            .select('logo_url, name, address, city, state, country, phone, email, website_url')
            .eq('provider_id', user.id)
            .limit(1)
            .single();
          
          if (shops) {
            shopData = {
              companyLogo: shops.logo_url,
              companyName: shops.name,
              companyAddress: `${shops.address}, ${shops.city}, ${shops.state}`,
              companyPhone: shops.phone,
              companyEmail: shops.email,
              companyWebsite: shops.website_url,
            };
          }
        }
      } catch (error) {
        console.error('Error loading shop data:', error);
      }

      // Load company settings
      const savedSettings = await AsyncStorage.getItem('companySettings');
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          setInvoiceData(prev => ({
            ...prev,
            ...settings,
            // Override with fresh shop data if available
            ...(shopData || {}),
            // Update terms with company name if available
            termsAndConditions: prev.termsAndConditions.replace('${companyName}', shopData?.companyName || settings.companyName || ''),
          }));
        } catch (parseError) {
          console.error('Error parsing company settings:', parseError);
          // If shop data exists, use it
          if (shopData) {
            setInvoiceData(prev => ({
              ...prev,
              ...shopData,
              termsAndConditions: prev.termsAndConditions.replace('${companyName}', shopData.companyName || ''),
            }));
          } else {
            setShowCompanySetup(true);
          }
        }
      } else {
        // No saved settings - try to use shop data
        if (shopData) {
          setInvoiceData(prev => ({
            ...prev,
            ...shopData,
            termsAndConditions: prev.termsAndConditions.replace('${companyName}', shopData.companyName || ''),
          }));
        } else {
          setShowCompanySetup(true);
        }
      }
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load invoice data. Please try again.');
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Save company settings with validation
  const saveCompanySettings = async (settings: Partial<InvoiceData>) => {
    try {
      // Validate required fields
      if (!settings.companyName?.trim()) {
        Alert.alert('Validation Error', 'Company name is required');
        return false;
      }
      
      if (!settings.gstNumber?.trim()) {
        Alert.alert('Validation Error', 'GST number is required');
        return false;
      }

      await AsyncStorage.setItem('companySettings', JSON.stringify(settings));
      setInvoiceData(prev => ({
        ...prev,
        ...settings,
        termsAndConditions: prev.termsAndConditions.replace('${}', settings.companyName || ''),
      }));
      
      return true;
    } catch (error) {
      console.error('Error saving company settings:', error);
      Alert.alert('Error', 'Failed to save company settings');
      return false;
    }
  };

  // Calculate totals with improved precision
  const calculateTotals = () => {
    const serviceAmount = Number(invoiceData.servicePrice) || 0;
    const additionalAmount = (invoiceData.additionalFees || [])
      .reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0);
    
    const subtotal = serviceAmount + additionalAmount;
    const discount = Number(invoiceData.discountAmount) || 0;
    const subtotalAfterDiscount = Math.max(0, subtotal - discount);
    const gstAmount = (subtotalAfterDiscount * (Number(invoiceData.gstRate) || 0)) / 100;
    const total = subtotalAfterDiscount + gstAmount;
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      subtotalAfterDiscount: Math.round(subtotalAfterDiscount * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  };

  // Get authentication token with improved error handling
  const getAuthToken = async (): Promise<string> => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw new Error('Authentication failed');
    }
  };

  // Enhanced API call for sending invoice
  const sendInvoiceToAPI = async (): Promise<string> => {
    const totals = calculateTotals();
    
    const apiPayload = {
      invoice: {
        ...invoiceData,
        totals,
        createdAt: new Date().toISOString(),
        status: 'pending',
        version: '1.0',
      },
      booking: bookingData,
      metadata: {
        platform: Platform.OS,
        appVersion: '1.0.0',
        timestamp: new Date().toISOString(),
      },
    };

    return retryApiCall(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      try {
        const authToken = await getAuthToken();
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/invoices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'X-Client-Platform': Platform.OS,
            'X-Client-Version': '1.0.0',
          },
          body: JSON.stringify(apiPayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.customerViewUrl) {
          throw new Error('Invalid API response: missing customer view URL');
        }

        return result.customerViewUrl;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });
  };

  // Enhanced invoice HTML generation with responsive design
  const generateInvoiceHTML = (): string => {
    const totals = calculateTotals();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoiceData.invoiceNumber}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            color: #1F2937; 
            line-height: 1.6;
            background: #FEFCE8;
        }
        .invoice-container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 4px 20px rgba(245, 158, 11, 0.1);
            border: 1px solid #F5F5E9;
        }
        .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 40px; 
            border-bottom: 3px solid #1A2533; 
            padding-bottom: 30px; 
        }
        .company-logo { 
            width: 80px; 
            height: 80px; 
            background: linear-gradient(135deg, #1A2533, #EAB308); 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-size: 28px; 
            font-weight: bold; 
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        }
        .company-logo-img {
            width: 100px;
            height: 100px;
            object-fit: contain;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .company-info { 
            text-align: right; 
            max-width: 350px;
        }
        .company-name { 
            font-size: 24px; 
            font-weight: bold; 
            color: #1A2533; 
            margin-bottom: 8px; 
        }
        .company-details {
            color: #6B7280;
            font-size: 14px;
            line-height: 1.5;
        }
        .invoice-title { 
            font-size: 48px; 
            font-weight: bold; 
            color: #1F2937; 
            margin-bottom: 30px; 
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .invoice-meta { 
            background: linear-gradient(135deg, #F5F5E9, #FDE68A); 
            padding: 25px; 
            border-radius: 12px; 
            margin-bottom: 40px; 
            border-left: 4px solid #1A2533;
        }
        .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .meta-item {
            display: flex;
            flex-direction: column;
        }
        .meta-label {
            font-size: 12px;
            font-weight: 600;
            color: #92400E;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .meta-value {
            font-size: 16px;
            font-weight: 600;
            color: #1F2937;
        }
        .billing-section { 
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 40px; 
        }
        .billing-box { 
            background: #F8FAFC;
            border-radius: 12px;
            padding: 25px;
            border: 1px solid #E2E8F0;
        }
        .billing-title { 
            font-size: 18px; 
            font-weight: bold; 
            color: #1A2533; 
            margin-bottom: 15px; 
            border-bottom: 2px solid #F5F5E9; 
            padding-bottom: 8px; 
        }
        .billing-content {
            color: #374151;
            line-height: 1.6;
        }
        .billing-content strong {
            color: #1F2937;
            display: block;
            margin-bottom: 4px;
        }
        .services-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 30px 0; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .services-table th { 
            background: linear-gradient(135deg, #1A2533, #EAB308); 
            color: white; 
            font-weight: bold; 
            padding: 20px 16px;
            text-align: left;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .services-table td { 
            padding: 20px 16px; 
            border-bottom: 1px solid #F1F5F9; 
            vertical-align: top;
        }
        .services-table tr:hover {
            background: #FEFCE8;
        }
        .service-description {
            color: #6B7280;
            font-size: 14px;
            margin-top: 4px;
        }
        .amount-cell {
            text-align: right;
            font-weight: 600;
            color: #1F2937;
        }
        .totals-section { 
            background: linear-gradient(135deg, #1F2937, #111827); 
            color: white; 
            padding: 30px; 
            border-radius: 12px; 
            margin: 30px 0; 
        }
        .total-row { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            margin-bottom: 15px; 
            padding: 8px 0;
        }
        .total-label {
            font-size: 16px;
            color: #D1D5DB;
        }
        .total-value {
            font-size: 16px;
            font-weight: 600;
        }
        .grand-total { 
            font-size: 24px; 
            font-weight: bold; 
            border-top: 2px solid #1A2533; 
            padding-top: 20px; 
            margin-top: 20px; 
            color: #1A2533; 
        }
        .notes-section {
            background: #F0F9FF;
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
            border-left: 4px solid #0EA5E9;
        }
        .notes-title {
            font-size: 18px;
            font-weight: bold;
            color: #0EA5E9;
            margin-bottom: 15px;
        }
        .terms-section { 
            background: #F5F5E9; 
            padding: 25px; 
            border-radius: 12px; 
            border-left: 4px solid #1A2533; 
            margin: 30px 0;
        }
        .terms-title {
            font-size: 18px;
            font-weight: bold;
            color: #1A2533;
            margin-bottom: 15px;
        }
        .terms-content {
            white-space: pre-wrap; 
            font-family: inherit;
            color: #374151;
            line-height: 1.7;
        }
        .footer { 
            text-align: center; 
            margin-top: 50px; 
            padding-top: 30px; 
            border-top: 2px solid #F1F5F9; 
            color: #6B7280; 
        }
        .footer-message {
            font-size: 18px;
            font-weight: 600;
            color: #1A2533;
            margin-bottom: 10px;
        }
        .payment-link { 
            background: linear-gradient(135deg, #10B981, #059669); 
            color: white; 
            padding: 15px 30px; 
            border-radius: 12px; 
            text-decoration: none; 
            display: inline-block; 
            margin: 20px 0; 
            font-weight: bold; 
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
            transition: transform 0.2s;
        }
        .payment-link:hover {
            transform: translateY(-2px);
        }
        
        @media print {
            body { background: white; }
            .invoice-container { box-shadow: none; border: 1px solid #E5E7EB; }
            .payment-link { display: none; }
        }
        
        @media (max-width: 600px) {
            body { padding: 10px; }
            .invoice-container { padding: 20px; }
            .billing-section { grid-template-columns: 1fr; gap: 20px; }
            .header { flex-direction: column; text-align: center; gap: 20px; }
            .company-info { text-align: center; max-width: none; }
            .invoice-title { font-size: 36px; }
            .meta-grid { grid-template-columns: 1fr; }
            .services-table th, .services-table td { padding: 12px 8px; font-size: 14px; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div>
                ${invoiceData.companyLogo 
                    ? `<img src="${invoiceData.companyLogo}" alt="${invoiceData.companyName}" class="company-logo-img" />`
                    : `<div class="company-logo">${invoiceData.companyName.charAt(0).toUpperCase()}</div>`
                }
            </div>
            <div class="company-info">
                <div class="company-name">${invoiceData.companyName}</div>
                <div class="company-details">
                    ${invoiceData.companyAddress}<br>
                    <span style="color: #1A2533;">📞</span> ${invoiceData.companyPhone}<br>
                    <span style="color: #1A2533;">✉️</span> ${invoiceData.companyEmail}
                    ${invoiceData.companyWebsite ? `<br><span style="color: #1A2533;">🌐</span> ${invoiceData.companyWebsite}` : ''}
                </div>
            </div>
        </div>

        <div class="invoice-title">
            <span style="font-size: 48px;">INVOICE</span>
            <div style="width: 100px; height: 4px; background: #1A2533; margin: 10px auto 0;"></div>
        </div>

        <div class="invoice-meta">
            <div class="meta-grid">
                <div class="meta-item">
                    <span class="meta-label">Invoice Number</span>
                    <span class="meta-value">${invoiceData.invoiceNumber}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Issue Date</span>
                    <span class="meta-value">${invoiceData.invoiceDate}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Due Date</span>
                    <span class="meta-value">${invoiceData.dueDate}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Payment Terms</span>
                    <span class="meta-value">${invoiceData.paymentTerms}</span>
                </div>
            </div>
        </div>

        <div class="billing-section">
            <div class="billing-box">
                <div class="billing-title">Bill To</div>
                <div class="billing-content">
                    <strong>${invoiceData.clientName}</strong>
                    ${invoiceData.clientAddress}<br>
                    ${invoiceData.clientPhone}<br>
                    ${invoiceData.clientEmail}
                </div>
            </div>
            <div class="billing-box">
                <div class="billing-title">Service Details</div>
                <div class="billing-content">
                    <strong>Service:</strong> ${invoiceData.serviceTitle}<br>
                    <strong>Date:</strong> ${invoiceData.serviceDate}<br>
                    <strong>Duration:</strong> ${invoiceData.serviceDuration}<br>
                    <strong>GST Number:</strong> ${invoiceData.gstNumber}<br>
                    <strong>Business Number:</strong> ${invoiceData.businessNumber}
                </div>
            </div>
        </div>

        <div style="margin: 30px 0;">
            <h2 style="color: #1F2937; font-size: 22px; margin-bottom: 20px; display: flex; align-items: center;">
                <span style="color: #1A2533; margin-right: 10px;">▎</span>
                Services Provided
            </h2>
        </div>

        <table class="services-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="width: 80px;">Qty</th>
                    <th style="width: 100px;">Rate</th>
                    <th style="width: 120px;">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <strong>${invoiceData.serviceTitle}</strong>
                        ${invoiceData.serviceDescription ? `<div class="service-description">${invoiceData.serviceDescription}</div>` : ''}
                    </td>
                    <td class="amount-cell">1</td>
                    <td class="amount-cell">$${invoiceData.servicePrice.toFixed(2)}</td>
                    <td class="amount-cell">$${invoiceData.servicePrice.toFixed(2)}</td>
                </tr>
                ${(invoiceData.additionalFees || []).map(fee => `
                    <tr>
                        <td><strong>${fee.name}</strong></td>
                        <td class="amount-cell">1</td>
                        <td class="amount-cell">$${Number(fee.amount).toFixed(2)}</td>
                        <td class="amount-cell">$${Number(fee.amount).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals-section">
            <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-value">$${totals.subtotal.toFixed(2)}</span>
            </div>
            ${totals.discount > 0 ? `
            <div class="total-row">
                <span class="total-label">Discount:</span>
                <span class="total-value" style="color: #10B981;">-${totals.discount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="total-row">
                <span class="total-label">GST (${invoiceData.gstRate}%):</span>
                <span class="total-value">${totals.gstAmount.toFixed(2)}</span>
            </div>
            <div class="total-row grand-total">
                <span>TOTAL AMOUNT:</span>
                <span>${totals.total.toFixed(2)}</span>
            </div>
        </div>

        ${invoiceData.notes ? `
        <div class="notes-section">
            <div class="notes-title">Additional Notes</div>
            <p>${invoiceData.notes}</p>
        </div>
        ` : ''}

        <div class="terms-section">
            <div class="terms-title">Terms & Conditions</div>
            <div class="terms-content">${invoiceData.termsAndConditions}</div>
        </div>

        <div class="footer">
            <div style="text-align: center; margin-bottom: 40px;">
                <div class="footer-message">Thank you for choosing ${invoiceData.companyName}!</div>
                <p style="color: #6B7280; margin-top: 10px;">Payment is due within ${invoiceData.paymentTerms}</p>
            </div>
            
            <div style="background: #F9FAFB; border-radius: 12px; padding: 30px; margin: 30px 0;">
                <table style="width: 100%; color: #6B7280; font-size: 14px;">
                    <tr>
                        <td style="text-align: left; vertical-align: top;">
                            <strong style="color: #1F2937; font-size: 16px;">${invoiceData.companyName}</strong><br>
                            <div style="margin-top: 5px; line-height: 1.5;">
                                ${invoiceData.companyAddress}<br>
                                <span style="color: #1A2533;">📞</span> ${invoiceData.companyPhone}<br>
                                <span style="color: #1A2533;">✉️</span> ${invoiceData.companyEmail}
                                ${invoiceData.companyWebsite ? `<br><span style="color: #1A2533;">🌐</span> ${invoiceData.companyWebsite}` : ''}
                            </div>
                        </td>
                        <td style="text-align: right; vertical-align: top;">
                            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #E5E7EB;">
                                <div style="font-size: 12px; color: #9CA3AF; margin-bottom: 5px;">INVOICE NUMBER</div>
                                <div style="font-size: 18px; font-weight: bold; color: #1A2533;">${invoiceData.invoiceNumber}</div>
                                <div style="font-size: 12px; color: #6B7280; margin-top: 10px;">Generated on<br>${formatDate(new Date())}</div>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                <p style="font-size: 12px; color: #9CA3AF; margin-bottom: 10px;">
                    This is a computer-generated invoice. For questions, please contact us at ${invoiceData.companyEmail}
                </p>
                <div style="color: #D1D5DB; font-size: 11px;">
                    Powered by Qwiken • Professional Service Management • ${new Date().getFullYear()}
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    `.trim();
  };

  // Enhanced share invoice with better error handling and user feedback
  const shareInvoice = async () => {
    try {
      setIsLoading(true);

      // Validation checks
      if (!invoiceData.companyName?.trim() || !invoiceData.gstNumber?.trim()) {
        Alert.alert(
          'Missing Information',
          'Please complete company information before generating invoice.',
          [
            { 
              text: 'Setup Company Info', 
              onPress: () => setShowCompanySetup(true),
              style: 'default'
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }

      if (!invoiceData.clientName?.trim()) {
        Alert.alert(
          'Missing Client Information',
          'Please enter client name before generating invoice.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      if (calculateTotals().total <= 0) {
        Alert.alert(
          'Invalid Amount',
          'Invoice total must be greater than zero.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Calculate totals
      const totals = calculateTotals();
      
      let customerViewUrl: string | undefined;
      
      try {
        // Try to send to API first for payment link
        customerViewUrl = await sendInvoiceToAPI();
      } catch (apiError) {
        console.error('API error, will share without payment link:', apiError);
      }

      // Share the invoice using the new generator
      const shared = await InvoiceGenerator.shareInvoice(invoiceData, totals, customerViewUrl);
      
      if (!shared) {
        // User cancelled sharing
        return;
      }

      // Save invoice data
      await InvoiceGenerator.saveInvoiceData(invoiceData, totals);
      await saveInvoiceLocally('sent');

      // Clear the temporary booking data
      await AsyncStorage.removeItem('selectedBookingForInvoice');
      
      // Show success message based on whether we have payment link
      if (customerViewUrl) {
        Alert.alert(
          'Invoice Sent Successfully! ✅',
          'The invoice has been shared with your customer. They can view and pay online using the link included.',
          [
            { 
              text: 'View Payment Link', 
              onPress: () => Linking.openURL(customerViewUrl),
              style: 'default'
            },
            { 
              text: 'Done', 
              onPress: () => navigation.goBack(),
              style: 'default'
            }
          ]
        );
      } else {
        Alert.alert(
          'Invoice Shared! ✅',
          'The invoice has been shared with your customer. They will receive the complete invoice details.',
          [
            { 
              text: 'Done', 
              onPress: () => navigation.goBack(),
              style: 'default'
            }
          ]
        );
      }

    } catch (error) {
      console.error('Error sharing invoice:', error);
      const apiError = handleApiError(error);
      
      Alert.alert(
        'Error Sharing Invoice', 
        apiError.message,
        [
          { text: 'Retry', onPress: shareInvoice },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsLoading(false);
      setupNavigationHeader();
    }
  };

  // Enhanced save invoice locally with status tracking
  const saveInvoiceLocally = async (status: string = 'draft') => {
    try {
      const invoiceRecord = {
        ...invoiceData,
        totals: calculateTotals(),
        savedAt: new Date().toISOString(),
        status,
        id: generateUniqueId(),
        bookingReference: bookingData?.id || null,
      };

      // Get existing invoices
      const existingInvoices = await AsyncStorage.getItem('savedInvoices');
      const invoices = existingInvoices ? JSON.parse(existingInvoices) : [];
      
      // Check for duplicates and update or add
      const existingIndex = invoices.findIndex(
        (inv: any) => inv.invoiceNumber === invoiceRecord.invoiceNumber
      );
      
      if (existingIndex >= 0) {
        invoices[existingIndex] = invoiceRecord;
      } else {
        invoices.push(invoiceRecord);
      }
      
      // Save back to storage
      await AsyncStorage.setItem('savedInvoices', JSON.stringify(invoices));
      
      return invoiceRecord;
    } catch (error) {
      console.error('Error saving invoice locally:', error);
      throw new Error('Failed to save invoice locally');
    }
  };

  // Update invoice data with improved validation
  const updateInvoiceData = (field: keyof InvoiceData, value: any) => {
    setInvoiceData(prev => {
      const updated = { ...prev };
      
      // Type-specific validation and formatting
      switch (field) {
        case 'servicePrice':
        case 'discountAmount':
        case 'gstRate':
          const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
          updated[field] = Math.max(0, numValue);
          break;
        
        case 'invoiceDate':
        case 'paymentTerms':
          updated[field] = value;
          // Auto-update due date when invoice date or payment terms change
          updated.dueDate = calculateDueDate(
            field === 'invoiceDate' ? value : updated.invoiceDate,
            field === 'paymentTerms' ? value : updated.paymentTerms
          );
          break;
          
        case 'companyName':
          updated[field] = value;
          // Update terms and conditions with company name
          updated.termsAndConditions = prev.termsAndConditions.replace(
            /Work completed remains property of .* until/,
            `Work completed remains property of ${value} until`
          );
          break;
          
        default:
          updated[field] = value;
      }
      
      return updated;
    });
  };

  // Enhanced additional fee management
  const addAdditionalFee = () => {
    const newFee = {
      id: generateUniqueId(),
      name: 'Additional Service',
      amount: 0
    };
    
    setInvoiceData(prev => ({
      ...prev,
      additionalFees: [...(prev.additionalFees || []), newFee]
    }));
  };

  const updateAdditionalFee = (id: string, field: 'name' | 'amount', value: string | number) => {
    setInvoiceData(prev => ({
      ...prev,
      additionalFees: (prev.additionalFees || []).map(fee => 
        fee.id === id 
          ? { ...fee, [field]: field === 'amount' ? (parseFloat(value.toString()) || 0) : value }
          : fee
      )
    }));
  };

  const removeAdditionalFee = (id: string) => {
    setInvoiceData(prev => ({
      ...prev,
      additionalFees: (prev.additionalFees || []).filter(fee => fee.id !== id)
    }));
  };

  // Save draft with user feedback
  const saveDraft = async () => {
    try {
      setIsSaving(true);
      await saveInvoiceLocally('draft');
      Alert.alert(
        'Draft Saved ✅',
        'Invoice has been saved as a draft on your device.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      Alert.alert(
        'Save Failed',
        'Could not save draft. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsSaving(false);
      setupNavigationHeader();
    }
  };

  const totals = calculateTotals();

  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading invoice data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Custom Header with Share Button */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            disabled={isLoading || isSaving}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generate Invoice</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.helpButton}
              onPress={() => Alert.alert(
                'Invoice Help 💡', 
                'Fill in the details to generate a professional invoice.\n\n• Complete company information first\n• Verify client details\n• Review pricing and terms\n• Use the share button to send with secure payment link\n\nYour customers will receive a professional invoice with online payment options.'
              )}
            >
              <Ionicons name="help-circle-outline" size={20} color="#1A2533" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerShareButton, (isLoading || isSaving) && styles.headerButtonDisabled]}
              onPress={shareInvoice}
              disabled={isLoading || isSaving}
            >
              {(isLoading || isSaving) ? (
                <ActivityIndicator size="small" color="#1A2533" />
              ) : (
                <Ionicons name="share-outline" size={24} color="#1A2533" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Booking Information Display */}
          {bookingData && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="briefcase" size={20} color="#1A2533" />
                <Text style={styles.sectionTitle}>Service Information</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>From Booking</Text>
                </View>
              </View>
              <View style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.bookingTitle}>{bookingData.title}</Text>
                  <View style={[styles.statusBadge, styles.readyBadge]}>
                    <Text style={styles.statusText}>Ready to Invoice</Text>
                  </View>
                </View>
                <Text style={styles.bookingClient}>
                  <Ionicons name="person" size={14} color="#6B7280" /> {bookingData.client}
                </Text>
                <Text style={styles.bookingDetails}>
                  <Ionicons name="calendar" size={14} color="#6B7280" /> {bookingData.date} • 
                  <Ionicons name="time" size={14} color="#6B7280" /> {bookingData.duration} • 
                  <Ionicons name="cash" size={14} color="#10B981" /> ${bookingData.price}
                </Text>
                {bookingData.notes && (
                  <Text style={styles.bookingNotes}>
                    <Ionicons name="document-text" size={14} color="#6B7280" /> {bookingData.notes}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Company Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={20} color="#1A2533" />
              <Text style={styles.sectionTitle}>Company Information</Text>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setShowCompanySetup(true)}
                disabled={isLoading || isSaving}
              >
                <Ionicons name="pencil" size={16} color="#1A2533" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.companyCard}>
              <View style={styles.companyHeader}>
                <View style={styles.companyLogo}>
                  <Text style={styles.companyLogoText}>
                    {invoiceData.companyName ? invoiceData.companyName.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
                <View style={styles.companyInfo}>
                  <Text style={styles.companyName}>
                    {invoiceData.companyName || 'Company Name Not Set'}
                  </Text>
                  <Text style={styles.companyDetails}>{invoiceData.companyAddress}</Text>
                  <Text style={styles.companyDetails}>{invoiceData.companyPhone}</Text>
                  <Text style={styles.companyDetails}>{invoiceData.companyEmail}</Text>
                </View>
              </View>
              <View style={styles.companyMeta}>
                <Text style={styles.companyDetails}>
                  <Ionicons name="document-text" size={12} color="#6B7280" /> GST: {invoiceData.gstNumber || 'Not Set'}
                </Text>
                <Text style={styles.companyDetails}>
                  <Ionicons name="business" size={12} color="#6B7280" /> {invoiceData.businessNumber || 'Not Set'}
                </Text>
              </View>
            </View>
          </View>

          {/* Invoice Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document" size={20} color="#1A2533" />
              <Text style={styles.sectionTitle}>Invoice Details</Text>
            </View>
            
            <View style={styles.invoiceDetailsGrid}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Invoice Number</Text>
                <TextInput
                  style={styles.input}
                  value={invoiceData.invoiceNumber}
                  onChangeText={(text) => updateInvoiceData('invoiceNumber', text)}
                  placeholder="INV-2024-001"
                  editable={!isLoading && !isSaving}
                />
              </View>
              
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Issue Date</Text>
                <TextInput
                  style={styles.input}
                  value={invoiceData.invoiceDate}
                  onChangeText={(text) => updateInvoiceData('invoiceDate', text)}
                  placeholder="DD/MM/YYYY"
                  editable={!isLoading && !isSaving}
                />
              </View>
              
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Due Date</Text>
                <TextInput
                  style={[styles.input, styles.inputReadonly]}
                  value={invoiceData.dueDate}
                  onChangeText={(text) => updateInvoiceData('dueDate', text)}
                  placeholder="DD/MM/YYYY"
                  editable={!isLoading && !isSaving}
                />
                <Text style={styles.helperText}>Auto-calculated from payment terms</Text>
              </View>
              
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Payment Terms</Text>
                <TextInput
                  style={styles.input}
                  value={invoiceData.paymentTerms}
                  onChangeText={(text) => updateInvoiceData('paymentTerms', text)}
                  placeholder="Net 30 days"
                  editable={!isLoading && !isSaving}
                />
              </View>
            </View>
          </View>

          {/* Client Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color="#1A2533" />
              <Text style={styles.sectionTitle}>Client Information</Text>
            </View>
            
            <View style={styles.clientGrid}>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Client Name *</Text>
                <TextInput
                  style={styles.input}
                  value={invoiceData.clientName}
                  onChangeText={(text) => updateInvoiceData('clientName', text)}
                  placeholder="Client Name"
                  editable={!isLoading && !isSaving}
                />
              </View>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Client Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={invoiceData.clientAddress}
                  onChangeText={(text) => updateInvoiceData('clientAddress', text)}
                  placeholder="Client Address"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isLoading && !isSaving}
                />
              </View>
              
              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={invoiceData.clientPhone}
                    onChangeText={(text) => updateInvoiceData('clientPhone', text)}
                    placeholder="+64 9 123 4567"
                    keyboardType="phone-pad"
                    editable={!isLoading && !isSaving}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={invoiceData.clientEmail}
                    onChangeText={(text) => updateInvoiceData('clientEmail', text)}
                    placeholder="client@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading && !isSaving}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Service Pricing */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calculator" size={20} color="#1A2533" />
              <Text style={styles.sectionTitle}>Pricing Details</Text>
            </View>
            
            <View style={styles.pricingCard}>
              <View style={styles.mainServiceRow}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceLabel}>Main Service</Text>
                  <TextInput
                    style={styles.serviceNameInput}
                    value={invoiceData.serviceTitle}
                    onChangeText={(text) => updateInvoiceData('serviceTitle', text)}
                    placeholder="Service name"
                    editable={!isLoading && !isSaving}
                  />
                </View>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={invoiceData.servicePrice.toString()}
                    onChangeText={(text) => updateInvoiceData('servicePrice', text)}
                    keyboardType="numeric"
                    placeholder="0.00"
                    editable={!isLoading && !isSaving}
                  />
                </View>
              </View>
              
              <View style={styles.serviceDescContainer}>
                <Text style={styles.label}>Service Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={invoiceData.serviceDescription}
                  onChangeText={(text) => updateInvoiceData('serviceDescription', text)}
                  placeholder="Describe the service provided..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isLoading && !isSaving}
                />
              </View>
            </View>

            {/* Additional Fees */}
            <View style={styles.additionalFeesSection}>
              <View style={styles.feesHeader}>
                <Text style={styles.feesTitle}>Additional Fees</Text>
                <TouchableOpacity 
                  onPress={addAdditionalFee} 
                  style={styles.addFeeButton}
                  disabled={isLoading || isSaving}
                >
                  <Ionicons name="add-circle" size={20} color="#1A2533" />
                  <Text style={styles.addFeeText}>Add Fee</Text>
                </TouchableOpacity>
              </View>
              
              {(invoiceData.additionalFees || []).map((fee) => (
                <View key={fee.id} style={styles.feeRow}>
                  <TextInput
                    style={[styles.input, styles.feeNameInput]}
                    placeholder="Fee description"
                    value={fee.name}
                    onChangeText={(text) => updateAdditionalFee(fee.id, 'name', text)}
                    editable={!isLoading && !isSaving}
                  />
                  <View style={styles.feeAmountContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.feeAmountInput}
                      placeholder="0.00"
                      value={fee.amount.toString()}
                      onChangeText={(text) => updateAdditionalFee(fee.id, 'amount', text)}
                      keyboardType="numeric"
                      editable={!isLoading && !isSaving}
                    />
                  </View>
                  <TouchableOpacity 
                    onPress={() => removeAdditionalFee(fee.id)}
                    style={styles.removeFeeButton}
                    disabled={isLoading || isSaving}
                  >
                    <Ionicons name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {(!invoiceData.additionalFees || invoiceData.additionalFees.length === 0) && (
                <Text style={styles.emptyFeesText}>No additional fees added</Text>
              )}
            </View>

            {/* GST and Discount Settings */}
            <View style={styles.taxDiscountSection}>
              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>GST Rate (%)</Text>
                  <View style={styles.gstInputContainer}>
                    <TextInput
                      style={styles.gstInput}
                      value={invoiceData.gstRate.toString()}
                      onChangeText={(text) => updateInvoiceData('gstRate', text)}
                      keyboardType="numeric"
                      placeholder="15"
                      editable={!isLoading && !isSaving}
                    />
                    <Text style={styles.percentSymbol}>%</Text>
                  </View>
                </View>
                
                <View style={styles.field}>
                  <Text style={styles.label}>Discount (Optional)</Text>
                  <View style={styles.discountInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.discountInput}
                      value={(invoiceData.discountAmount || 0).toString()}
                      onChangeText={(text) => updateInvoiceData('discountAmount', text)}
                      keyboardType="numeric"
                      placeholder="0.00"
                      editable={!isLoading && !isSaving}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Invoice Totals */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt" size={20} color="#1A2533" />
              <Text style={styles.sectionTitle}>Invoice Summary</Text>
            </View>
            <View style={styles.totalsCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalValue}>${totals.subtotal.toFixed(2)}</Text>
              </View>
              {totals.discount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount:</Text>
                  <Text style={[styles.totalValue, styles.discountValue]}>-${totals.discount.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>GST ({invoiceData.gstRate}%):</Text>
                <Text style={styles.totalValue}>${totals.gstAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.separator} />
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total Amount:</Text>
                <Text style={styles.grandTotalValue}>${totals.total.toFixed(2)}</Text>
              </View>
              <Text style={styles.totalNote}>All amounts in NZD</Text>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbox" size={20} color="#1A2533" />
              <Text style={styles.sectionTitle}>Additional Notes</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={invoiceData.notes}
              onChangeText={(text) => updateInvoiceData('notes', text)}
              placeholder="Add any additional notes for this invoice..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isLoading && !isSaving}
            />
          </View>

          {/* Terms and Conditions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color="#1A2533" />
              <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            </View>
            <TextInput
              style={[styles.input, styles.largeTextArea]}
              value={invoiceData.termsAndConditions}
              onChangeText={(text) => updateInvoiceData('termsAndConditions', text)}
              placeholder="Enter your terms and conditions..."
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              editable={!isLoading && !isSaving}
            />
          </View>

          {/* API Status Indicator */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cloud" size={20} color="#10B981" />
              <Text style={styles.sectionTitle}>Online Features</Text>
            </View>
            <View style={styles.apiStatusCard}>
              <View style={styles.featureRow}>
                <Ionicons name="link" size={16} color="#10B981" />
                <Text style={styles.featureText}>Customer Payment Portal</Text>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="card" size={16} color="#10B981" />
                <Text style={styles.featureText}>Secure Online Payments</Text>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="mail" size={16} color="#10B981" />
                <Text style={styles.featureText}>Automatic Email Notifications</Text>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="analytics" size={16} color="#10B981" />
                <Text style={styles.featureText}>Payment Tracking & Analytics</Text>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              </View>
              <Text style={styles.apiNote}>
                When you share this invoice, your customer will receive a secure link to view and pay online.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.previewButton, (isLoading || isSaving) && styles.buttonDisabled]}
            onPress={() => setShowInvoicePreview(true)}
            disabled={isLoading || isSaving}
          >
            <Ionicons name="eye" size={20} color="#1A2533" />
            <Text style={styles.previewButtonText}>Preview</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.draftButton, (isLoading || isSaving) && styles.buttonDisabled]}
            onPress={saveDraft}
            disabled={isLoading || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Ionicons name="document-text" size={20} color="#6B7280" />
            )}
            <Text style={styles.draftButtonText}>
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Company Setup Modal */}
        <CompanySetupModal
          visible={showCompanySetup}
          onClose={() => setShowCompanySetup(false)}
          onSave={saveCompanySettings}
          initialData={invoiceData}
        />

        {/* Invoice Preview Modal */}
        <InvoicePreviewModal
          visible={showInvoicePreview}
          onClose={() => setShowInvoicePreview(false)}
          invoiceData={invoiceData}
          totals={calculateTotals()}
          invoiceNumber={invoiceData.invoiceNumber}
          onShare={shareInvoice}
          isLoading={isLoading}
        />
      </KeyboardAvoidingView>
    </View>
  );
};

// Company Setup Modal Component
interface CompanySetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<boolean>;
  initialData: any;
}

const CompanySetupModal: React.FC<CompanySetupModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
}) => {
  const [companyData, setCompanyData] = useState({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    gstNumber: '',
    businessNumber: '',
    ...initialData,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCompanyData({
        companyName: '',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        companyWebsite: '',
        gstNumber: '',
        businessNumber: '',
        ...initialData,
      });
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await onSave(companyData);
      if (success) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const validateForm = () => {
    return companyData.companyName.trim() && companyData.gstNumber.trim();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.modalCloseButton}
              disabled={isSaving}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Company Setup</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="business" size={20} color="#1A2533" />
                <Text style={styles.sectionTitle}>Basic Information</Text>
              </View>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Company Name *</Text>
                <TextInput
                  style={[styles.input, !companyData.companyName.trim() && styles.inputError]}
                  value={companyData.companyName}
                  onChangeText={(text) => setCompanyData(prev => ({ ...prev, companyName: text }))}
                  placeholder="Your Company Name"
                  editable={!isSaving}
                />
                {!companyData.companyName.trim() && (
                  <Text style={styles.errorText}>Company name is required</Text>
                )}
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Business Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={companyData.companyAddress}
                  onChangeText={(text) => setCompanyData(prev => ({ ...prev, companyAddress: text }))}
                  placeholder="123 Business Street, Auckland 1010, New Zealand"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isSaving}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={companyData.companyPhone}
                    onChangeText={(text) => setCompanyData(prev => ({ ...prev, companyPhone: text }))}
                    placeholder="+64 9 123 4567"
                    keyboardType="phone-pad"
                    editable={!isSaving}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={companyData.companyEmail}
                    onChangeText={(text) => setCompanyData(prev => ({ ...prev, companyEmail: text }))}
                    placeholder="info@company.co.nz"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isSaving}
                  />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Website (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={companyData.companyWebsite}
                  onChangeText={(text) => setCompanyData(prev => ({ ...prev, companyWebsite: text }))}
                  placeholder="www.yourcompany.co.nz"
                  autoCapitalize="none"
                  editable={!isSaving}
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={20} color="#1A2533" />
                <Text style={styles.sectionTitle}>Legal Information</Text>
              </View>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>GST Number *</Text>
                <TextInput
                  style={[styles.input, !companyData.gstNumber.trim() && styles.inputError]}
                  value={companyData.gstNumber}
                  onChangeText={(text) => setCompanyData(prev => ({ ...prev, gstNumber: text }))}
                  placeholder="123-456-789"
                  editable={!isSaving}
                />
                {!companyData.gstNumber.trim() && (
                  <Text style={styles.errorText}>GST number is required</Text>
                )}
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Business Number (NZBN)</Text>
                <TextInput
                  style={styles.input}
                  value={companyData.businessNumber}
                  onChangeText={(text) => setCompanyData(prev => ({ ...prev, businessNumber: text }))}
                  placeholder="9429041234567"
                  keyboardType="numeric"
                  editable={!isSaving}
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Why do we need this information?</Text>
                  <Text style={styles.infoText}>
                    This information appears on your invoices and is required for legal compliance. 
                    Your GST number is mandatory for New Zealand businesses.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[
                styles.saveButton, 
                (!validateForm() || isSaving) && styles.saveButtonDisabled
              ]} 
              onPress={handleSave}
              disabled={!validateForm() || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save Company Information'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// Invoice Preview Modal Component
interface InvoicePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  invoiceData: InvoiceData;
  totals: InvoiceTotals;
  invoiceNumber: string;
  onShare: () => void;
  isLoading: boolean;
}

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  visible,
  onClose,
  invoiceData,
  totals,
  invoiceNumber,
  onShare,
  isLoading,
}) => {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            onPress={onClose} 
            style={styles.modalCloseButton}
            disabled={isLoading}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Invoice Preview</Text>
          <TouchableOpacity 
            style={[styles.sharePreviewButton, isLoading && styles.buttonDisabled]}
            onPress={onShare}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#1A2533" />
            ) : (
              <Ionicons name="share-outline" size={20} color="#1A2533" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.previewContent} showsVerticalScrollIndicator={false}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Ionicons name="document-text" size={24} color="#1A2533" />
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>Invoice {invoiceNumber}</Text>
                <Text style={styles.previewNote}>
                  This is how your invoice will appear to customers
                </Text>
              </View>
            </View>
            
            <View style={styles.invoicePreviewContainer}>
              <ScrollView 
                style={styles.invoicePreviewScroll}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <View style={styles.invoicePreview}>
                  {/* Company Header */}
                  <View style={styles.invoiceHeader}>
                    <View style={styles.companyLogoSection}>
                      {invoiceData.companyLogo ? (
                        <View style={styles.logoPlaceholder}>
                          <Ionicons name="image" size={35} color="#1A2533" />
                        </View>
                      ) : (
                        <View style={styles.logoInitial}>
                          <Text style={styles.logoInitialText}>
                            {invoiceData.companyName?.charAt(0).toUpperCase() || '?'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.companyInfoSection}>
                      <Text style={styles.companyNamePreview}>{invoiceData.companyName}</Text>
                      <View style={styles.companyAddressLine}>
                        <Ionicons name="location-outline" size={12} color="#1A2533" style={styles.contactIcon} />
                        <Text style={styles.companyDetailPreview}>{invoiceData.companyAddress}</Text>
                      </View>
                      <View style={styles.companyAddressLine}>
                        <Ionicons name="call-outline" size={12} color="#1A2533" style={styles.contactIcon} />
                        <Text style={styles.companyDetailPreview}>{invoiceData.companyPhone}</Text>
                      </View>
                      <View style={styles.companyAddressLine}>
                        <Ionicons name="mail-outline" size={12} color="#1A2533" style={styles.contactIcon} />
                        <Text style={styles.companyDetailPreview}>{invoiceData.companyEmail}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Invoice Details */}
                  <View style={styles.invoiceMetaSection}>
                    <View style={styles.invoiceNumberBox}>
                      <Text style={styles.invoiceLabel}>INVOICE</Text>
                      <Text style={styles.invoiceNumberText}>#{invoiceNumber}</Text>
                    </View>
                    <View style={styles.invoiceDates}>
                      <View style={styles.dateRow}>
                        <Text style={styles.dateLabel}>Date:</Text>
                        <Text style={styles.dateValue}>{invoiceData.invoiceDate}</Text>
                      </View>
                      <View style={styles.dateRow}>
                        <Text style={styles.dateLabel}>Due:</Text>
                        <Text style={styles.dateValue}>{invoiceData.dueDate}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Client Info */}
                  <View style={styles.clientSection}>
                    <View style={styles.sectionHeaderPreview}>
                      <Ionicons name="person-outline" size={16} color="#1A2533" />
                      <Text style={styles.sectionTitlePreview}>Bill To</Text>
                    </View>
                    <Text style={styles.clientNamePreview}>{invoiceData.clientName}</Text>
                    <View style={styles.clientContactLine}>
                      <Ionicons name="location-outline" size={12} color="#6B7280" style={styles.clientIcon} />
                      <Text style={styles.clientDetailPreview}>{invoiceData.clientAddress}</Text>
                    </View>
                    <View style={styles.clientContactLine}>
                      <Ionicons name="call-outline" size={12} color="#6B7280" style={styles.clientIcon} />
                      <Text style={styles.clientDetailPreview}>{invoiceData.clientPhone}</Text>
                    </View>
                    <View style={styles.clientContactLine}>
                      <Ionicons name="mail-outline" size={12} color="#6B7280" style={styles.clientIcon} />
                      <Text style={styles.clientDetailPreview}>{invoiceData.clientEmail}</Text>
                    </View>
                  </View>

                  {/* Services */}
                  <View style={styles.servicesSection}>
                    <View style={styles.sectionHeaderPreview}>
                      <Ionicons name="briefcase-outline" size={16} color="#1A2533" />
                      <Text style={styles.sectionTitlePreview}>Services</Text>
                    </View>
                    <View style={styles.serviceItem}>
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName}>{invoiceData.serviceTitle}</Text>
                        {invoiceData.serviceDescription && (
                          <Text style={styles.serviceDesc}>{invoiceData.serviceDescription}</Text>
                        )}
                      </View>
                      <Text style={styles.servicePrice}>{formatCurrency(invoiceData.servicePrice)}</Text>
                    </View>
                    
                    {invoiceData.additionalFees?.map((fee) => (
                      <View key={fee.id} style={styles.serviceItem}>
                        <Text style={styles.serviceName}>{fee.name}</Text>
                        <Text style={styles.servicePrice}>{formatCurrency(fee.amount)}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Totals */}
                  <View style={styles.totalsSection}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Subtotal</Text>
                      <Text style={styles.totalValue}>{formatCurrency(totals.subtotal)}</Text>
                    </View>
                    {totals.discount > 0 && (
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Discount</Text>
                        <Text style={styles.totalValue}>-{formatCurrency(totals.discount)}</Text>
                      </View>
                    )}
                    {invoiceData.gstRate > 0 && (
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>GST ({invoiceData.gstRate}%)</Text>
                        <Text style={styles.totalValue}>{formatCurrency(totals.gstAmount)}</Text>
                      </View>
                    )}
                    <View style={[styles.totalRow, styles.grandTotalRow]}>
                      <Text style={styles.grandTotalLabel}>Total Due</Text>
                      <Text style={styles.grandTotalValue}>{formatCurrency(totals.total)}</Text>
                    </View>
                  </View>

                  {/* Footer */}
                  <View style={styles.invoiceFooter}>
                    <Text style={styles.footerThankYou}>Thank you for your business!</Text>
                    <Text style={styles.footerText}>Payment is due within {invoiceData.paymentTerms}</Text>
                  </View>
                </View>
              </ScrollView>
            </View>

            <View style={styles.previewActions}>
              <TouchableOpacity 
                style={styles.previewActionButton}
                onPress={async () => {
                  const totals = calculateTotals();
                  const shared = await InvoiceGenerator.shareInvoice(invoiceData, totals);
                  if (shared) {
                    await InvoiceGenerator.saveInvoiceData(invoiceData, totals);
                    Alert.alert('Success', 'Invoice exported successfully!');
                  }
                }}
              >
                <Ionicons name="document-text" size={16} color="#6B7280" />
                <Text style={styles.previewActionText}>Export Invoice</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.previewActionButton}
                onPress={() => {
                  const textInvoice = InvoiceGenerator.generateTextInvoice(invoiceData, totals);
                  Share.share({
                    message: textInvoice,
                    title: `Invoice ${invoiceNumber}`,
                  });
                }}
              >
                <Ionicons name="document-outline" size={16} color="#6B7280" />
                <Text style={styles.previewActionText}>Share Text</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]} 
            onPress={onShare}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Sending...' : 'Send Invoice'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Close Preview</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE',
    paddingTop: Platform.OS === 'android' ? 25 : 0, // Add status bar padding for Android
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Header Styles - Updated to remove duplicate navigation
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16, // Account for status bar on iOS
    paddingBottom: 12,
    backgroundColor: '#F0FFFE',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5E9',
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5E9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helpButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5E9',
  },
  headerShareButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5E9',
    minWidth: 40,
    alignItems: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.6,
  },
  
  // Content Styles
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  
  // Status Badge
  statusBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  readyBadge: {
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Booking Card Styles
  bookingCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  bookingClient: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  bookingDetails: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  bookingNotes: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  
  // Company Card Styles
  companyCard: {
    backgroundColor: '#F5F5E9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1A2533',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyLogoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  companyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginLeft: 4,
  },
  
  // Form Styles
  invoiceDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  fieldGroup: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  clientGrid: {
    gap: 16,
  },
  
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputReadonly: {
    backgroundColor: '#F5F5E9',
    borderColor: '#F5F5E9',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  largeTextArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  field: {
    flex: 1,
    marginHorizontal: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  
  // Pricing Styles
  pricingCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  mainServiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 16,
  },
  serviceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serviceNameInput: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    paddingVertical: 4,
  },
  serviceDescContainer: {
    marginTop: 8,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    marginRight: 4,
  },
  priceInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    minWidth: 80,
    textAlign: 'right',
    paddingVertical: 8,
  },
  
  // Additional Fees Styles
  additionalFeesSection: {
    marginBottom: 16,
  },
  feesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  addFeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  addFeeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginLeft: 4,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  feeNameInput: {
    flex: 1,
    marginRight: 12,
  },
  feeAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  feeAmountInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    width: 80,
    textAlign: 'right',
    paddingVertical: 12,
  },
  removeFeeButton: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emptyFeesText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  
  // Tax and Discount Section
  taxDiscountSection: {
    marginBottom: 16,
  },
  gstInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    width: 120,
  },
  gstInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
    paddingVertical: 12,
  },
  percentSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  discountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  discountInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
    paddingVertical: 12,
  },
  
  // Totals Styles
  totalsCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  discountValue: {
    color: '#10B981',
  },
  separator: {
    height: 2,
    backgroundColor: '#1A2533',
    marginVertical: 12,
  },
  grandTotalRow: {
    marginBottom: 8,
  },
  grandTotalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2533',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A2533',
  },
  totalNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // API Status Card
  apiStatusCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  apiNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  // Footer Styles - Updated
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F5F5E9',
    gap: 12,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5E9',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F5F5E9',
    flex: 1,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2533',
    marginLeft: 8,
  },
  draftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    flex: 1,
  },
  draftButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginLeft: 8,
  },
  
  // Modal Styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5E9',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F5F5E9',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A2533',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  
  // Preview Modal Styles
  sharePreviewButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5E9',
  },
  previewContent: {
    flex: 1,
    padding: 16,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F5F5E9',
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  previewNote: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#F5F5E9',
    borderRadius: 8,
  },
  htmlPreview: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  htmlContent: {
    fontSize: 12,
    color: '#1F2937',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  closePreviewButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  closePreviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Invoice Preview Styles
  invoicePreviewContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    margin: 10,
    overflow: 'hidden',
  },
  invoicePreviewScroll: {
    flex: 1,
  },
  invoicePreview: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invoiceHeader: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#1A2533',
  },
  companyLogoSection: {
    marginRight: 15,
  },
  logoPlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: '#F5F5E9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    width: 50,
    height: 50,
    backgroundColor: '#1A2533',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitialText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  companyInfoSection: {
    flex: 1,
  },
  companyNamePreview: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  companyDetailPreview: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  invoiceMetaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  invoiceNumberBox: {
    backgroundColor: '#F5F5E9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  invoiceLabel: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: 'bold',
  },
  invoiceNumberText: {
    fontSize: 16,
    color: '#1A2533',
    fontWeight: 'bold',
  },
  invoiceDates: {
    alignItems: 'flex-end',
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
  },
  clientSection: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitlePreview: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  clientNamePreview: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 3,
  },
  clientDetailPreview: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  servicesSection: {
    marginBottom: 20,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#1A2533',
  },
  serviceInfo: {
    flex: 1,
    marginRight: 10,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  serviceDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  servicePrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalsSection: {
    backgroundColor: '#1F2937',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  totalValue: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#1A2533',
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 16,
    color: '#1A2533',
    fontWeight: 'bold',
  },
  invoiceFooter: {
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerThankYou: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 5,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // New enhanced preview styles
  companyAddressLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactIcon: {
    marginRight: 6,
  },
  sectionHeaderPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  clientContactLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  clientIcon: {
    marginRight: 6,
  },

  // Preview header styles
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  previewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#F5F5E9',
  },
});

export default InvoiceGeneratorScreen;