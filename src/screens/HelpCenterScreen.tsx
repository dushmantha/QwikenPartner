import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  FlatList,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAccount } from '../navigation/AppNavigator';

// Lazy import to improve startup performance
let normalizedShopService: any;
const getShopService = async () => {
  if (!normalizedShopService) {
    normalizedShopService = (await import('../lib/supabase/normalized')).normalizedShopService;
  }
  return normalizedShopService;
};

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful_count: number;
  is_expanded?: boolean;
}

interface ContactMethod {
  type: 'email' | 'phone' | 'chat' | 'help_desk';
  title: string;
  description: string;
  value: string;
  icon: string;
  available: boolean;
  response_time?: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  last_updated: string;
  messages_count: number;
}

const HelpCenterScreen = ({ navigation }: { navigation: any }) => {
  const { accountType } = useAccount();
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'tickets'>('faq');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([]);
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
  });

  // Mock API service
  const mockHelpAPI = {
    async getFAQs(accountType: 'provider' | 'consumer'): Promise<FAQ[]> {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const consumerFAQs: FAQ[] = [
        {
          id: '1',
          question: 'How do I book a service with Qwiken?',
          answer: 'To book a service on Qwiken, browse our service categories (beauty, wellness, maintenance, etc.), select the service you need, choose your preferred date and time from the provider\'s available slots, and confirm your booking. You\'ll receive instant confirmation with all the details.',
          category: 'Booking',
          helpful_count: 156,
        },
        {
          id: '2',
          question: 'Can I request a service at my location?',
          answer: 'Yes! Qwiken supports both in-house services (at the provider\'s location) and on-location services (at your home or office). When browsing services, look for the location type indicator. For on-location services, you\'ll need to provide your address during booking.',
          category: 'Booking',
          helpful_count: 89,
        },
        {
          id: '3',
          question: 'How do I know if a provider is verified?',
          answer: 'Verified providers on Qwiken have a blue checkmark on their profile. This means they\'ve completed our verification process including identity verification, business registration, and skill certifications. You can also check their ratings and reviews from other customers.',
          category: 'Trust & Safety',
          helpful_count: 134,
        },
        {
          id: '4',
          question: 'What happens after I complete a booking?',
          answer: 'After booking, you\'ll receive a confirmation with the booking ID (BKR-XXXXX), provider details, and service information. The provider will also be notified. You can track the status in your Service Queue - from pending to confirmed to completed.',
          category: 'Booking',
          helpful_count: 67,
        },
        {
          id: '5',
          question: 'How do payments work on Qwiken?',
          answer: 'Payments are handled securely through Qwiken. You pay when booking the service, but the payment is held until the service is completed. Once marked as complete by the provider, you have 24 hours to confirm satisfaction before payment is released.',
          category: 'Payment',
          helpful_count: 203,
        },
        {
          id: '6',
          question: 'Can I cancel or reschedule my booking?',
          answer: 'Yes, you can cancel or reschedule based on the provider\'s cancellation policy. Most providers allow free cancellation up to 24 hours before the service. Check the specific cancellation terms on the service details page before booking.',
          category: 'Booking',
          helpful_count: 145,
        },
        {
          id: '7',
          question: 'How do I switch between Consumer and Provider mode?',
          answer: 'Qwiken allows you to be both a consumer and provider. Use the "Switch Mode" button in your profile to toggle between modes. As a consumer, you book services. As a provider, you offer services and manage bookings.',
          category: 'Account',
          helpful_count: 98,
        },
      ];

      const providerFAQs: FAQ[] = [
        {
          id: '1',
          question: 'How do I set up my Qwiken provider profile?',
          answer: 'Create your provider profile by adding your business name, service category, description, and service area. Upload your business logo, add your skills and certifications, set your business hours, and define your service offerings with pricing. Don\'t forget to enable "Women Owned Business" if applicable!',
          category: 'Getting Started',
          helpful_count: 189,
        },
        {
          id: '2',
          question: 'How do I manage my service offerings?',
          answer: 'Go to Services Management to add, edit, or deactivate services. For each service, specify: name, description, price, duration, location type (in-house or on-location), and assign staff members. You can also create service packages and special offers.',
          category: 'Services',
          helpful_count: 145,
        },
        {
          id: '3',
          question: 'How does the Service Queue work?',
          answer: 'Your Service Queue shows all bookings organized by status: Pending (awaiting confirmation), Confirmed (accepted bookings), In Progress (ongoing services), and Completed. Use the queue to manage your daily workflow and track upcoming appointments.',
          category: 'Bookings',
          helpful_count: 234,
        },
        {
          id: '4',
          question: 'How do I handle payments and invoices?',
          answer: 'Qwiken handles payment processing securely. When a service is marked complete, payment is processed automatically. You can view earnings in the Earnings tab, generate invoices with your business details, and track payment history. Funds are transferred to your bank account within 2-3 business days.',
          category: 'Payment',
          helpful_count: 167,
        },
        {
          id: '5',
          question: 'What are the benefits of verification?',
          answer: 'Verified providers get a blue checkmark, appear higher in search results, and build more trust with customers. To get verified, submit your business registration, professional certifications, and complete identity verification. Premium providers get priority verification processing.',
          category: 'Verification',
          helpful_count: 98,
        },
        {
          id: '6',
          question: 'How do I manage my team/staff?',
          answer: 'Add team members in the Staff section of your shop management. For each staff member, add their name, role, specialties, and experience. Assign staff to specific services and manage their individual schedules. This helps customers choose their preferred service provider.',
          category: 'Team Management',
          helpful_count: 112,
        },
        {
          id: '7',
          question: 'What is the monthly earnings overview?',
          answer: 'The dashboard shows your monthly performance including total earnings, completed jobs, active bookings, customer ratings, and growth percentage. Use these insights to track your business performance and identify areas for improvement.',
          category: 'Analytics',
          helpful_count: 156,
        },
      ];

      return accountType === 'provider' ? providerFAQs : consumerFAQs;
    },

    async getContactMethods(): Promise<ContactMethod[]> {
      await new Promise(resolve => setTimeout(resolve, 500));
      return [
        {
          type: 'email',
          title: 'Email Support',
          description: 'Get help via email',
          value: 'support@qwiken.org',
          icon: 'mail-outline',
          available: true,
          response_time: '24 hours',
        },
        {
          type: 'help_desk',
          title: 'Help Desk Ticket',
          description: 'Submit a support ticket',
          value: 'Create Ticket',
          icon: 'document-text-outline',
          available: true,
          response_time: '1-2 business days',
        },
      ];
    },

    async getSupportTickets(userId: string): Promise<SupportTicket[]> {
      await new Promise(resolve => setTimeout(resolve, 800));
      return [
        {
          id: 'ticket_001',
          subject: 'Payment not received for completed service',
          status: 'pending',
          priority: 'high',
          created_at: '2025-07-15T10:30:00Z',
          last_updated: '2025-07-16T14:20:00Z',
          messages_count: 3,
        },
        {
          id: 'ticket_002',
          subject: 'Customer cancelled last minute',
          status: 'resolved',
          priority: 'normal',
          created_at: '2025-07-10T16:45:00Z',
          last_updated: '2025-07-12T11:30:00Z',
          messages_count: 5,
        },
        {
          id: 'ticket_003',
          subject: 'Unable to update service availability',
          status: 'open',
          priority: 'low',
          created_at: '2025-07-17T09:15:00Z',
          last_updated: '2025-07-17T09:15:00Z',
          messages_count: 1,
        },
      ];
    },

    async submitTicket(ticket: Partial<SupportTicket>): Promise<{ success: boolean; ticketId?: string }> {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true, ticketId: `ticket_${Date.now()}` };
    },

    async markFAQHelpful(faqId: string): Promise<{ success: boolean }> {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true };
    },
  };

  useEffect(() => {
    loadHelpData();
  }, [accountType]);

  useEffect(() => {
    filterFAQs();
  }, [searchQuery, selectedCategory, faqs]);

  const loadHelpData = async () => {
    try {
      // Load FAQs and contact methods from mock (can be moved to DB later)
      const [faqData, contactData] = await Promise.all([
        mockHelpAPI.getFAQs(accountType),
        mockHelpAPI.getContactMethods(),
      ]);
      
      setFaqs(faqData);
      setContactMethods(contactData);
      
      // Load real tickets from Supabase
      const shopService = await getShopService();
      const ticketResponse = await shopService.getSupportTickets();
      if (ticketResponse.success && ticketResponse.data) {
        // Map Supabase tickets to the expected format
        const mappedTickets = ticketResponse.data.map(ticket => ({
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          created_at: ticket.created_at,
          last_updated: ticket.updated_at,
          messages_count: ticket.messages_count || 0,
        }));
        setSupportTickets(mappedTickets);
      }
    } catch (error) {
      console.error('Error loading help data:', error);
      Alert.alert('Error', 'Failed to load help information');
    } finally {
      setIsLoading(false);
    }
  };

  const filterFAQs = () => {
    let filtered = faqs;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(faq => 
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );
    }
    
    setFilteredFaqs(filtered);
  };

  const toggleFAQ = (faqId: string) => {
    setFilteredFaqs(prev => prev.map(faq => ({
      ...faq,
      is_expanded: faq.id === faqId ? !faq.is_expanded : faq.is_expanded
    })));
  };

  const markFAQHelpful = async (faqId: string) => {
    try {
      const response = await mockHelpAPI.markFAQHelpful(faqId);
      if (response.success) {
        setFaqs(prev => prev.map(faq => 
          faq.id === faqId 
            ? { ...faq, helpful_count: faq.helpful_count + 1 }
            : faq
        ));
      }
    } catch (error) {
      console.error('Error marking FAQ as helpful:', error);
    }
  };

  const handleContactMethod = async (method: ContactMethod) => {
    try {
      switch (method.type) {
        case 'email':
          const emailSubject = `Qwiken Support - ${accountType === 'provider' ? 'Provider' : 'Consumer'} Help`;
          const emailBody = `Hello Qwiken Support Team,\n\nI need assistance with:\n\n[Please describe your issue here]\n\nAccount Type: ${accountType}\nApp Version: 1.0.0`;
          await Linking.openURL(`mailto:${method.value}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`);
          break;
        case 'help_desk':
          setShowContactModal(true);
          break;
      }
    } catch (error) {
      console.error('Error opening contact method:', error);
      Alert.alert('Error', 'Unable to open contact method. Please try another option.');
    }
  };

  const submitSupportTicket = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      Alert.alert('Required Fields', 'Please fill in both subject and message');
      return;
    }

    try {
      // Determine category based on subject keywords
      const subject = contactForm.subject.toLowerCase();
      let category = 'other';
      if (subject.includes('payment') || subject.includes('billing')) category = 'payment';
      else if (subject.includes('booking') || subject.includes('appointment')) category = 'booking';
      else if (subject.includes('technical') || subject.includes('bug') || subject.includes('error')) category = 'technical';
      else if (subject.includes('account') || subject.includes('profile')) category = 'account';
      else if (subject.includes('service') || subject.includes('quality')) category = 'service_quality';

      const ticketData = {
        subject: contactForm.subject,
        description: contactForm.message,
        category: category,
        priority: contactForm.priority,
      };

      const shopService = await getShopService();
      const response = await shopService.createSupportTicket(ticketData);

      if (response.success) {
        Alert.alert(
          'Ticket Submitted Successfully!',
          `Your support ticket has been created. Our team will respond within 1-2 business days.\n\nTicket ID: TICK-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`,
          [{ text: 'OK', onPress: () => {
            setShowContactModal(false);
            setContactForm({ subject: '', message: '', priority: 'normal' });
            loadHelpData(); // Refresh tickets
          }}]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to submit support ticket');
      }
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      Alert.alert('Error', 'Failed to submit support ticket. Please try again.');
    }
  };

  const getCategories = () => {
    const categories = ['all', ...new Set(faqs.map(faq => faq.category))];
    return categories;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return '#3B82F6'; // Info blue
      case 'pending':
        return '#1A2533'; // Primary Navy Blue
      case 'resolved':
        return '#10B981'; // Success emerald green
      case 'closed':
        return '#6B7280'; // Gray
      default:
        return '#6B7280'; // Gray
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#EF4444'; // Error red
      case 'high':
        return '#F97316'; // Warning orange
      case 'normal':
        return '#3B82F6'; // Info blue
      case 'low':
        return '#6B7280'; // Gray
      default:
        return '#6B7280'; // Gray
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderFAQItem = ({ item }: { item: FAQ }) => (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqHeader}
        onPress={() => toggleFAQ(item.id)}
      >
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <Ionicons 
          name={item.is_expanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#6B7280" 
        />
      </TouchableOpacity>
      
      {item.is_expanded && (
        <View style={styles.faqContent}>
          <Text style={styles.faqAnswer}>{item.answer}</Text>
          <View style={styles.faqActions}>
            <Text style={styles.helpfulCount}>
              {item.helpful_count} people found this helpful
            </Text>
            <TouchableOpacity
              style={styles.helpfulButton}
              onPress={() => markFAQHelpful(item.id)}
            >
              <Ionicons name="thumbs-up-outline" size={16} color="#3B82F6" />
              <Text style={styles.helpfulText}>Helpful</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderContactMethod = ({ item }: { item: ContactMethod }) => (
    <TouchableOpacity
      style={[styles.contactItem, !item.available && styles.disabledContactItem]}
      onPress={() => item.available && handleContactMethod(item)}
      disabled={!item.available}
    >
      <View style={[styles.contactIcon, { backgroundColor: item.available ? '#EBF4FF' : '#F3F4F6' }]}>
        <Ionicons 
          name={item.icon} 
          size={24} 
          color={item.available ? '#3B82F6' : '#9CA3AF'} 
        />
      </View>
      
      <View style={styles.contactContent}>
        <Text style={[styles.contactTitle, !item.available && styles.disabledText]}>
          {item.title}
        </Text>
        <Text style={[styles.contactDescription, !item.available && styles.disabledText]}>
          {item.description}
        </Text>
        {item.response_time && (
          <Text style={styles.responseTime}>{item.response_time}</Text>
        )}
      </View>
      
      <View style={styles.contactAction}>
        {!item.available ? (
          <Text style={styles.offlineText}>Offline</Text>
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSupportTicket = ({ item }: { item: SupportTicket }) => (
    <TouchableOpacity style={styles.ticketItem}>
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketSubject} numberOfLines={1}>
          {item.subject}
        </Text>
        <Text style={styles.ticketDate}>{formatDate(item.created_at)}</Text>
      </View>
      
      <View style={styles.ticketMeta}>
        <View style={styles.ticketBadges}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
          
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
              {item.priority.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <Text style={styles.messageCount}>
          {item.messages_count} message{item.messages_count !== 1 ? 's' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderContactModal = () => (
    <Modal
      visible={showContactModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create Support Ticket</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowContactModal(false);
              setContactForm({ subject: '', message: '', priority: 'normal' });
            }}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Subject *</Text>
            <TextInput
              style={styles.textInput}
              value={contactForm.subject}
              onChangeText={(text) => setContactForm(prev => ({ ...prev, subject: text }))}
              placeholder="Brief description of your issue"
              maxLength={100}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Priority</Text>
            <View style={styles.priorityContainer}>
              {['low', 'normal', 'high', 'urgent'].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityOption,
                    contactForm.priority === priority && styles.selectedPriority
                  ]}
                  onPress={() => setContactForm(prev => ({ ...prev, priority: priority as any }))}
                >
                  <Text style={[
                    styles.priorityOptionText,
                    contactForm.priority === priority && styles.selectedPriorityText
                  ]}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message *</Text>
            <TextInput
              style={[styles.textInput, styles.messageInput]}
              value={contactForm.message}
              onChangeText={(text) => setContactForm(prev => ({ ...prev, message: text }))}
              placeholder="Please describe your issue in detail..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
          
          <View style={styles.responseInfo}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.responseInfoText}>
              We typically respond to support tickets within 1-2 business days.
            </Text>
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              accountType === 'provider' && styles.providerSubmitButton
            ]}
            onPress={submitSupportTicket}
          >
            <Text style={styles.submitButtonText}>Submit Ticket</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading help center...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'faq' && styles.activeTab]}
          onPress={() => setActiveTab('faq')}
        >
          <Ionicons 
            name={activeTab === 'faq' ? 'help-circle' : 'help-circle-outline'} 
            size={20} 
            color={activeTab === 'faq' ? '#1A2533' : '#6B7280'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'faq' && styles.activeTabText
          ]}>
            FAQ
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'contact' && styles.activeTab]}
          onPress={() => setActiveTab('contact')}
        >
          <Ionicons 
            name={activeTab === 'contact' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} 
            size={20} 
            color={activeTab === 'contact' ? '#1A2533' : '#6B7280'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'contact' && styles.activeTabText
          ]}>
            Contact
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tickets' && styles.activeTab]}
          onPress={() => setActiveTab('tickets')}
        >
          <View style={styles.tabIconContainer}>
            <Ionicons 
              name={activeTab === 'tickets' ? 'ticket' : 'ticket-outline'} 
              size={20} 
              color={activeTab === 'tickets' ? '#1A2533' : '#6B7280'} 
            />
            {supportTickets.filter(t => t.status === 'open' || t.status === 'pending').length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>
                  {supportTickets.filter(t => t.status === 'open' || t.status === 'pending').length}
                </Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.tabText, 
            activeTab === 'tickets' && styles.activeTabText
          ]}>
            My Tickets
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'faq' && (
        <View style={styles.content}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search FAQs..."
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScrollView}
            contentContainerStyle={styles.categoryContainer}
          >
            {getCategories().map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.selectedCategory
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category && styles.selectedCategoryText
                ]}>
                  {category === 'all' ? 'All' : category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* FAQ List */}
          <FlatList
            data={filteredFaqs}
            renderItem={renderFAQItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.faqList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="help-circle-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No FAQs found</Text>
                <Text style={styles.emptyDescription}>
                  Try adjusting your search or category filter
                </Text>
              </View>
            )}
          />
        </View>
      )}

      {activeTab === 'contact' && (
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Get in Touch</Text>
            <Text style={styles.sectionDescription}>
              Choose the best way to contact our support team
            </Text>
            
            <FlatList
              data={contactMethods}
              renderItem={renderContactMethod}
              keyExtractor={(item) => item.type}
              scrollEnabled={false}
            />
          </View>
        </ScrollView>
      )}

      {activeTab === 'tickets' && (
        <View style={styles.content}>
          {supportTickets.length > 0 ? (
            <FlatList
              data={supportTickets}
              renderItem={renderSupportTicket}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.ticketList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="ticket-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No support tickets</Text>
              <Text style={styles.emptyDescription}>
                You haven't created any support tickets yet
              </Text>
              <TouchableOpacity
                style={styles.createTicketButton}
                onPress={() => setShowContactModal(true)}
              >
                <Text style={styles.createTicketText}>Create Ticket</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {renderContactModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE', // Light accent cream
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A2533', // Dark accent
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FFFE', // Secondary
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#1A2533', // Primary Navy Blue
  },
  tabIconContainer: {
    position: 'relative',
    marginRight: 8,
  },
  tabText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#1A2533', // Primary Navy Blue
    fontWeight: '600',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444', // Error red
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F8FFFE', // Secondary
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A2533', // Dark accent
    marginLeft: 8,
    paddingVertical: 4,
  },
  categoryScrollView: {
    marginTop: 12,
    maxHeight: 50,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  categoryChip: {
    backgroundColor: '#F0FFFE', // Light accent cream
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F8FFFE', // Secondary
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCategory: {
    backgroundColor: '#1A2533', // Primary Navy Blue
    borderColor: '#1A2533', // Primary Navy Blue
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  faqList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#1A2533', // Primary Navy Blue
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#1A2533', // Primary Navy Blue
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533', // Dark accent
    flex: 1,
    marginRight: 12,
  },
  faqContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F8FFFE', // Secondary
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 16,
  },
  faqActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpfulCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0FFFE', // Light accent cream
    borderRadius: 16,
  },
  helpfulText: {
    fontSize: 12,
    color: '#1A2533', // Primary Navy Blue
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2533', // Dark accent
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 16,
    lineHeight: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FFFE', // Secondary
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  disabledContactItem: {
    opacity: 0.6,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#F0FFFE', // Light accent cream
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  responseTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  contactAction: {
    alignItems: 'center',
  },
  offlineText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  ticketList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  ticketItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    flex: 1,
    marginRight: 12,
  },
  ticketDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ticketMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketBadges: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533', // Dark accent
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  createTicketButton: {
    backgroundColor: '#1A2533', // Primary Navy Blue
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  createTicketText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F0FFFE',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A2533',
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedPriority: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  priorityOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedPriorityText: {
    color: '#1A2533',
    fontWeight: '600',
  },
  responseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  responseInfoText: {
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#1A2533',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  providerSubmitButton: {
    backgroundColor: '#1A2533',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HelpCenterScreen;