// Comprehensive Mock Data for Development and Testing
import { DEV_CONFIG, logMockUsage } from '../config/devConfig';

// Mock User Data
export const MOCK_USERS = [
  {
    id: 'cc0e8400-e29b-41d4-a716-446655440001', // Valid UUID format
    email: 'sarah.johnson@example.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    phone: '+1-555-0123',
    avatar: 'https://randomuser.me/api/portraits/women/32.jpg',
    role: 'customer',
    location: 'New York, NY',
    joinedDate: '2024-01-15',
    preferences: {
      favoriteServices: ['Hair Styling', 'Manicure', 'Facial Treatment'],
      preferredStylists: ['660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003'],
      notifications: true,
      theme: 'light'
    }
  },
  {
    id: 'cc0e8400-e29b-41d4-a716-446655440002', // Valid UUID format
    email: 'mike.davis@example.com',
    firstName: 'Mike',
    lastName: 'Davis',
    phone: '+1-555-0456',
    avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
    role: 'provider',
    location: 'Los Angeles, CA',
    joinedDate: '2023-11-20',
    businessId: '550e8400-e29b-41d4-a716-446655440001'
  }
];

// Mock Shop/Business Data
export const MOCK_SHOPS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID format
    name: 'Luxe Beauty Studio',
    description: 'Premium beauty salon offering cutting-edge hair styling, nail care, and skincare treatments in a luxurious environment.',
    images: [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800',
      'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800'
    ],
    logo: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=200',
    rating: 4.8,
    reviewCount: 342,
    address: '123 Fashion Ave, New York, NY 10001',
    phone: '+1-555-BEAUTY',
    email: 'info@luxebeautystudio.com',
    website: 'https://luxebeautystudio.com',
    category: 'Hair Salon',
    isActive: true,
    featured: true,
    openingHours: {
      monday: { open: '09:00', close: '19:00', isOpen: true },
      tuesday: { open: '09:00', close: '19:00', isOpen: true },
      wednesday: { open: '09:00', close: '19:00', isOpen: true },
      thursday: { open: '09:00', close: '20:00', isOpen: true },
      friday: { open: '09:00', close: '20:00', isOpen: true },
      saturday: { open: '08:00', close: '18:00', isOpen: true },
      sunday: { open: '10:00', close: '17:00', isOpen: true }
    },
    amenities: ['WiFi', 'Parking', 'Refreshments', 'Music', 'Air Conditioning'],
    socialMedia: {
      instagram: '@luxebeautystudio',
      facebook: 'LuxeBeautyStudioNY',
      tiktok: '@luxebeauty'
    },
    discounts: {
      id: 'disc-001',
      title: 'New Customer Special',
      percentage: 20,
      description: 'Get 20% off your first visit!',
      validUntil: '2024-12-31',
      code: 'NEWCLIENT20'
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002', // Valid UUID format
    name: 'FitCore Gym & Wellness',
    description: 'State-of-the-art fitness facility with personal training, group classes, and wellness programs.',
    images: [
      'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800'
    ],
    logo: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=200',
    rating: 4.6,
    reviewCount: 198,
    address: '456 Fitness Blvd, Los Angeles, CA 90210',
    phone: '+1-555-FITCORE',
    email: 'hello@fitcoregym.com',
    website: 'https://fitcoregym.com',
    category: 'Fitness & Gym',
    isActive: true,
    featured: true,
    openingHours: {
      monday: { open: '05:00', close: '23:00', isOpen: true },
      tuesday: { open: '05:00', close: '23:00', isOpen: true },
      wednesday: { open: '05:00', close: '23:00', isOpen: true },
      thursday: { open: '05:00', close: '23:00', isOpen: true },
      friday: { open: '05:00', close: '22:00', isOpen: true },
      saturday: { open: '06:00', close: '21:00', isOpen: true },
      sunday: { open: '07:00', close: '20:00', isOpen: true }
    },
    amenities: ['Locker Rooms', 'Showers', 'Parking', 'Juice Bar', 'Towel Service'],
    socialMedia: {
      instagram: '@fitcoregym',
      facebook: 'FitCoreGymLA'
    },
    discounts: {
      id: 'disc-002',
      title: 'Monthly Membership Deal',
      percentage: 15,
      description: 'Save 15% on monthly memberships!',
      validUntil: '2024-12-31',
      code: 'FIT15'
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003', // Valid UUID format
    name: 'Serenity Spa Retreat',
    description: 'Tranquil spa offering massage therapy, aromatherapy, and holistic wellness treatments.',
    images: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
      'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800',
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800'
    ],
    logo: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=200',
    rating: 4.9,
    reviewCount: 267,
    address: '789 Wellness Way, Miami, FL 33139',
    phone: '+1-555-SERENE',
    email: 'relax@serenityspa.com',
    website: 'https://serenityspa.com',
    category: 'Spa & Massage',
    isActive: true,
    featured: false,
    openingHours: {
      monday: { open: '08:00', close: '20:00', isOpen: true },
      tuesday: { open: '08:00', close: '20:00', isOpen: true },
      wednesday: { open: '08:00', close: '20:00', isOpen: true },
      thursday: { open: '08:00', close: '21:00', isOpen: true },
      friday: { open: '08:00', close: '21:00', isOpen: true },
      saturday: { open: '09:00', close: '19:00', isOpen: true },
      sunday: { open: '10:00', close: '18:00', isOpen: true }
    },
    amenities: ['Relaxation Room', 'Steam Room', 'Herbal Tea', 'Meditation Space'],
    socialMedia: {
      instagram: '@serenityspa',
      facebook: 'SerenitySpaRetreat'
    },
    discounts: null
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Elite Barber Shop',
    description: 'Traditional barbershop offering premium grooming services for the modern gentleman.',
    images: [
      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800',
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800'
    ],
    logo: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=200',
    rating: 4.7,
    reviewCount: 189,
    address: '321 Style Street, Brooklyn, NY 11201',
    phone: '+1-555-BARBER',
    email: 'info@elitebarbershop.com',
    website: 'https://elitebarbershop.com',
    category: 'Barbershop',
    isActive: true,
    featured: true,
    openingHours: {
      monday: { open: '08:00', close: '19:00', isOpen: true },
      tuesday: { open: '08:00', close: '19:00', isOpen: true },
      wednesday: { open: '08:00', close: '19:00', isOpen: true },
      thursday: { open: '08:00', close: '20:00', isOpen: true },
      friday: { open: '08:00', close: '20:00', isOpen: true },
      saturday: { open: '07:00', close: '18:00', isOpen: true },
      sunday: { open: '09:00', close: '16:00', isOpen: true }
    },
    amenities: ['WiFi', 'Complimentary Drinks', 'TV', 'Air Conditioning'],
    socialMedia: {
      instagram: '@elitebarbershop',
      facebook: 'EliteBarberBK'
    },
    discounts: {
      id: 'disc-004',
      title: 'Student Discount',
      percentage: 10,
      description: 'Show your student ID for 10% off!',
      validUntil: '2024-12-31',
      code: 'STUDENT10'
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Zen Yoga Studio',
    description: 'Peaceful yoga and meditation center for all skill levels.',
    images: [
      'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800',
      'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=800'
    ],
    logo: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=200',
    rating: 4.9,
    reviewCount: 234,
    address: '567 Peace Ave, San Francisco, CA 94102',
    phone: '+1-555-ZENOGA',
    email: 'namaste@zenyogastudio.com',
    website: 'https://zenyogastudio.com',
    category: 'Yoga & Pilates',
    isActive: true,
    featured: false,
    openingHours: {
      monday: { open: '06:00', close: '21:00', isOpen: true },
      tuesday: { open: '06:00', close: '21:00', isOpen: true },
      wednesday: { open: '06:00', close: '21:00', isOpen: true },
      thursday: { open: '06:00', close: '21:00', isOpen: true },
      friday: { open: '06:00', close: '20:00', isOpen: true },
      saturday: { open: '07:00', close: '19:00', isOpen: true },
      sunday: { open: '08:00', close: '18:00', isOpen: true }
    },
    amenities: ['Mat Rental', 'Showers', 'Lockers', 'Tea Lounge', 'Parking'],
    socialMedia: {
      instagram: '@zenyogastudio',
      facebook: 'ZenYogaSF'
    },
    discounts: null
  }
];

// Mock Staff Data
export const MOCK_STAFF = [
  {
    id: '660e8400-e29b-41d4-a716-446655440001', // Valid UUID format
    name: 'Emma Rodriguez',
    email: 'emma@luxebeautystudio.com',
    phone: '+1-555-0789',
    role: 'Senior Hair Stylist',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    shopId: '550e8400-e29b-41d4-a716-446655440001',
    bio: 'Emma has over 8 years of experience in hair styling and coloring. She specializes in modern cuts and vibrant color transformations.',
    specialties: ['Hair Cutting', 'Hair Coloring', 'Hair Styling', 'Highlights'],
    rating: 4.9,
    reviewCount: 156,
    experienceYears: 8,
    isActive: true,
    workSchedule: {
      monday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
      tuesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
      wednesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
      thursday: { isWorking: true, startTime: '09:00', endTime: '19:00' },
      friday: { isWorking: true, startTime: '09:00', endTime: '19:00' },
      saturday: { isWorking: true, startTime: '08:00', endTime: '17:00' },
      sunday: { isWorking: false, startTime: '10:00', endTime: '16:00' }
    },
    leaveDates: [],
    socialMedia: {
      instagram: '@emmahairartist'
    }
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002', // Valid UUID format
    name: 'Jason Chen',
    email: 'jason@fitcoregym.com',
    phone: '+1-555-0321',
    role: 'Personal Trainer',
    avatar: 'https://randomuser.me/api/portraits/men/42.jpg',
    shopId: '550e8400-e29b-41d4-a716-446655440002',
    bio: 'Certified personal trainer specializing in strength training, weight loss, and athletic performance.',
    specialties: ['Personal Training', 'Weight Training', 'Cardio Training', 'Nutrition Coaching'],
    rating: 4.7,
    reviewCount: 89,
    experienceYears: 5,
    isActive: true,
    workSchedule: {
      monday: { isWorking: true, startTime: '06:00', endTime: '14:00' },
      tuesday: { isWorking: true, startTime: '06:00', endTime: '14:00' },
      wednesday: { isWorking: true, startTime: '06:00', endTime: '14:00' },
      thursday: { isWorking: true, startTime: '06:00', endTime: '14:00' },
      friday: { isWorking: true, startTime: '06:00', endTime: '14:00' },
      saturday: { isWorking: true, startTime: '07:00', endTime: '15:00' },
      sunday: { isWorking: false, startTime: '08:00', endTime: '12:00' }
    },
    leaveDates: [],
    certifications: ['NASM-CPT', 'Nutrition Specialist', 'TRX Instructor']
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440003', // Valid UUID format
    name: 'Sophia Williams',
    email: 'sophia@luxebeautystudio.com',
    phone: '+1-555-0654',
    role: 'Nail Technician',
    avatar: 'https://randomuser.me/api/portraits/women/25.jpg',
    shopId: '550e8400-e29b-41d4-a716-446655440001',
    bio: 'Expert nail technician with a passion for nail art and the latest trends in manicure and pedicure.',
    specialties: ['Manicure', 'Pedicure', 'Nail Art', 'Gel Polish'],
    rating: 4.8,
    reviewCount: 203,
    experienceYears: 6,
    isActive: true,
    workSchedule: {
      monday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
      tuesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
      wednesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
      thursday: { isWorking: true, startTime: '09:00', endTime: '19:00' },
      friday: { isWorking: true, startTime: '09:00', endTime: '19:00' },
      saturday: { isWorking: true, startTime: '08:00', endTime: '18:00' },
      sunday: { isWorking: true, startTime: '10:00', endTime: '17:00' }
    },
    leaveDates: [],
    socialMedia: {
      instagram: '@sophianails'
    }
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440004', // Valid UUID format
    name: 'Maria Santos',
    email: 'maria@serenityspa.com',
    phone: '+1-555-0987',
    role: 'Massage Therapist',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    shopId: '550e8400-e29b-41d4-a716-446655440003',
    bio: 'Licensed massage therapist specializing in Swedish, deep tissue, and hot stone massage techniques.',
    specialties: ['Swedish Massage', 'Deep Tissue Massage', 'Hot Stone Massage', 'Aromatherapy'],
    rating: 4.9,
    reviewCount: 178,
    experienceYears: 10,
    isActive: true,
    workSchedule: {
      monday: { isWorking: true, startTime: '08:00', endTime: '16:00' },
      tuesday: { isWorking: true, startTime: '08:00', endTime: '16:00' },
      wednesday: { isWorking: true, startTime: '08:00', endTime: '16:00' },
      thursday: { isWorking: true, startTime: '10:00', endTime: '18:00' },
      friday: { isWorking: true, startTime: '10:00', endTime: '18:00' },
      saturday: { isWorking: true, startTime: '09:00', endTime: '17:00' },
      sunday: { isWorking: false, startTime: '10:00', endTime: '16:00' }
    },
    leaveDates: [],
    certifications: ['LMT', 'Hot Stone Certified', 'Aromatherapy Specialist']
  }
];

// Mock Services Data
export const MOCK_SERVICES = [
  {
    id: '770e8400-e29b-41d4-a716-446655440001', // Valid UUID format
    name: 'Premium Hair Cut & Style',
    description: 'Professional haircut with wash, style, and finishing. Includes consultation for the perfect look.',
    price: 65,
    duration: 60,
    category: 'Hair Salon',
    image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400',
    shopId: '550e8400-e29b-41d4-a716-446655440001',
    staffIds: ['660e8400-e29b-41d4-a716-446655440001'],
    isActive: true,
    featured: true,
    tags: ['Popular', 'Hair', 'Styling'],
    requirements: ['Hair length consultation recommended'],
    includes: ['Shampoo', 'Cut', 'Style', 'Blow Dry'],
    rating: 4.8,
    reviews_count: 156
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440002', // Valid UUID format
    name: 'Hair Color & Highlights',
    description: 'Full color service with highlights or lowlights. Includes color consultation and aftercare advice.',
    price: 120,
    duration: 180,
    category: 'Hair Salon',
    image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400',
    shopId: '550e8400-e29b-41d4-a716-446655440001',
    staffIds: ['660e8400-e29b-41d4-a716-446655440001'],
    isActive: true,
    featured: true,
    tags: ['Color', 'Highlights', 'Premium'],
    requirements: ['Patch test 48 hours before treatment'],
    includes: ['Color consultation', 'Application', 'Toner', 'Style'],
    rating: 4.9,
    reviews_count: 203
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440003', // Valid UUID format
    name: 'Luxury Manicure',
    description: 'Complete nail care with cuticle treatment, shaping, polish, and hand massage.',
    price: 45,
    duration: 45,
    category: 'Nails & Manicure',
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400',
    shopId: '550e8400-e29b-41d4-a716-446655440001',
    staffIds: ['660e8400-e29b-41d4-a716-446655440003'],
    isActive: true,
    featured: false,
    tags: ['Nails', 'Relaxing', 'Beauty'],
    requirements: [],
    includes: ['Cuticle care', 'Nail shaping', 'Polish', 'Hand massage']
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440007',
    name: 'Deluxe Pedicure',
    description: 'Luxurious foot treatment with exfoliation, massage, and polish application.',
    price: 55,
    duration: 60,
    category: 'Nails & Manicure',
    image: 'https://images.unsplash.com/photo-1610992015332-c34271226b09?w=400',
    shopId: '550e8400-e29b-41d4-a716-446655440001',
    staffIds: ['660e8400-e29b-41d4-a716-446655440003'],
    isActive: true,
    featured: false,
    tags: ['Pedicure', 'Relaxing', 'Beauty'],
    requirements: [],
    includes: ['Foot soak', 'Exfoliation', 'Massage', 'Polish']
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440008',
    name: 'Facial Treatment',
    description: 'Deep cleansing facial with extraction, mask, and moisturizing treatment.',
    price: 85,
    duration: 75,
    category: 'Facial & Skincare',
    image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400',
    shopId: '550e8400-e29b-41d4-a716-446655440001',
    staffIds: ['660e8400-e29b-41d4-a716-446655440001'],
    isActive: true,
    featured: true,
    tags: ['Facial', 'Skincare', 'Relaxing'],
    requirements: ['No retinol 48 hours before'],
    includes: ['Cleansing', 'Extraction', 'Mask', 'Moisturizer']
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440009',
    name: 'Eyebrow Threading',
    description: 'Precise eyebrow shaping using traditional threading technique.',
    price: 25,
    duration: 20,
    category: 'Makeup & Lashes',
    image: 'https://images.unsplash.com/photo-1585233640299-e44fac62a0e0?w=400',
    shopId: '550e8400-e29b-41d4-a716-446655440001',
    staffIds: ['660e8400-e29b-41d4-a716-446655440001'],
    isActive: true,
    featured: false,
    tags: ['Threading', 'Eyebrows', 'Beauty'],
    requirements: [],
    includes: ['Consultation', 'Threading', 'Aftercare']
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440010',
    name: 'Makeup Application',
    description: 'Professional makeup application for special occasions or events.',
    price: 75,
    duration: 60,
    category: 'Makeup & Lashes',
    image: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=400',
    shopId: '550e8400-e29b-41d4-a716-446655440001',
    staffIds: ['660e8400-e29b-41d4-a716-446655440001'],
    isActive: true,
    featured: false,
    tags: ['Makeup', 'Beauty', 'Special Occasion'],
    requirements: ['Clean face'],
    includes: ['Consultation', 'Full makeup', 'Touch-up kit']
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440004', // Valid UUID format
    name: 'Personal Training Session',
    description: 'One-on-one personal training session customized to your fitness goals and current level.',
    price: 80,
    duration: 60,
    category: 'Fitness & Gym',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400',
    shopId: '550e8400-e29b-41d4-a716-446655440002',
    staffIds: ['660e8400-e29b-41d4-a716-446655440002'],
    isActive: true,
    featured: true,
    tags: ['Fitness', 'Personal Training', 'Health'],
    requirements: ['Health questionnaire', 'Comfortable workout attire'],
    includes: ['Workout plan', 'Form coaching', 'Progress tracking']
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440005', // Valid UUID format
    name: 'Swedish Relaxation Massage',
    description: 'Full-body Swedish massage designed to promote relaxation and relieve muscle tension.',
    price: 95,
    duration: 90,
    category: 'Spa & Massage',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
    shopId: '550e8400-e29b-41d4-a716-446655440003',
    staffIds: ['660e8400-e29b-41d4-a716-446655440004'],
    isActive: true,
    featured: true,
    tags: ['Massage', 'Relaxation', 'Wellness'],
    requirements: ['Please arrive 10 minutes early'],
    includes: ['Consultation', 'Full body massage', 'Relaxation time']
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440006', // Valid UUID format
    name: 'Deep Tissue Massage',
    description: 'Therapeutic deep tissue massage targeting specific muscle groups and tension areas.',
    price: 110,
    duration: 75,
    category: 'Spa & Massage',
    image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400',
    shopId: '550e8400-e29b-41d4-a716-446655440003',
    staffIds: ['660e8400-e29b-41d4-a716-446655440004'],
    isActive: true,
    featured: false,
    tags: ['Massage', 'Therapeutic', 'Deep Tissue'],
    requirements: ['Health questionnaire required'],
    includes: ['Assessment', 'Targeted massage', 'Aftercare advice']
  }
];

// Mock Categories
export const MOCK_CATEGORIES = [
  {
    id: '880e8400-e29b-41d4-a716-446655440001', // Valid UUID format
    name: 'Hair Salon',
    description: 'Haircuts, styling, coloring, and treatments',
    image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=300',
    color: '#E91E63',
    serviceCount: 45,
    featured: true
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440002', // Valid UUID format
    name: 'Spa & Massage',
    description: 'Relaxation massages, hot stone therapy, aromatherapy',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=300',
    color: '#9C27B0',
    serviceCount: 38,
    featured: true
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440003', // Valid UUID format
    name: 'Nails & Manicure',
    description: 'Manicure, pedicure, nail art, gel polish',
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300',
    color: '#FF9800',
    serviceCount: 32,
    featured: true
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440004', // Valid UUID format
    name: 'Facial & Skincare',
    description: 'Deep cleansing, anti-aging treatments, facials',
    image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=300',
    color: '#4CAF50',
    serviceCount: 28,
    featured: true
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440005', // Valid UUID format
    name: 'Fitness & Gym',
    description: 'Personal training, group classes, CrossFit',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300',
    color: '#FF5722',
    serviceCount: 42,
    featured: true
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440006', // Valid UUID format
    name: 'Yoga & Pilates',
    description: 'Yoga classes, meditation, Pilates sessions',
    image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=300',
    color: '#00BCD4',
    serviceCount: 25,
    featured: true
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440007', // Valid UUID format
    name: 'Barbershop',
    description: 'Men\'s haircuts, beard trimming, hot shaves',
    image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=300',
    color: '#795548',
    serviceCount: 30,
    featured: false
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440008', // Valid UUID format
    name: 'Makeup & Lashes',
    description: 'Professional makeup, lash extensions, eyebrow shaping',
    image: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=300',
    color: '#673AB7',
    serviceCount: 35,
    featured: false
  }
];

// Mock Bookings
export const MOCK_BOOKINGS = [
  {
    id: '990e8400-e29b-41d4-a716-446655440001', // Valid UUID format
    customerId: 'cc0e8400-e29b-41d4-a716-446655440001',
    shopId: '550e8400-e29b-41d4-a716-446655440001',
    staffId: '660e8400-e29b-41d4-a716-446655440001',
    serviceIds: ['770e8400-e29b-41d4-a716-446655440001'],
    bookingDate: '2025-08-25',
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    totalPrice: 65,
    notes: 'Looking for a modern, layered cut',
    createdAt: '2025-08-18T14:30:00Z',
    // Enriched data for display
    shopName: 'Luxe Beauty Studio',
    staffName: 'Emma Rodriguez',
    serviceNames: ['Premium Hair Cut & Style'],
    shopImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
    staffAvatar: 'https://randomuser.me/api/portraits/women/68.jpg'
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440002', // Valid UUID format
    customerId: 'cc0e8400-e29b-41d4-a716-446655440001',
    shopId: '550e8400-e29b-41d4-a716-446655440003',
    staffId: '660e8400-e29b-41d4-a716-446655440004',
    serviceIds: ['770e8400-e29b-41d4-a716-446655440005'],
    bookingDate: '2025-08-28',
    startTime: '14:00',
    endTime: '15:30',
    status: 'pending',
    totalPrice: 95,
    notes: 'First time visit, prefer medium pressure',
    createdAt: '2025-08-19T09:15:00Z',
    // Enriched data for display
    shopName: 'Serenity Spa Retreat',
    staffName: 'Maria Santos',
    serviceNames: ['Swedish Relaxation Massage'],
    shopImage: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400',
    staffAvatar: 'https://randomuser.me/api/portraits/women/44.jpg'
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440003', // Valid UUID format
    customerId: 'cc0e8400-e29b-41d4-a716-446655440001',
    shopId: '550e8400-e29b-41d4-a716-446655440001',
    staffId: '660e8400-e29b-41d4-a716-446655440003',
    serviceIds: ['770e8400-e29b-41d4-a716-446655440003'],
    bookingDate: '2025-08-30',
    startTime: '16:00',
    endTime: '16:45',
    status: 'confirmed',
    totalPrice: 45,
    notes: 'Gel polish in coral color please',
    createdAt: '2025-08-17T16:45:00Z',
    // Enriched data for display
    shopName: 'Luxe Beauty Studio',
    staffName: 'Sophia Williams',
    serviceNames: ['Luxury Manicure'],
    shopImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
    staffAvatar: 'https://randomuser.me/api/portraits/women/25.jpg'
  }
];

// Mock Reviews
export const MOCK_REVIEWS = [
  {
    id: 'aa0e8400-e29b-41d4-a716-446655440001', // Valid UUID format
    customerId: 'cc0e8400-e29b-41d4-a716-446655440001',
    shopId: '550e8400-e29b-41d4-a716-446655440001',
    staffId: '660e8400-e29b-41d4-a716-446655440001',
    serviceId: '770e8400-e29b-41d4-a716-446655440001',
    rating: 5,
    comment: 'Emma is absolutely amazing! She gave me exactly the cut I wanted and the experience was so relaxing. Highly recommend!',
    images: ['https://images.unsplash.com/photo-1562322140-8baeececf3df?w=300'],
    date: '2024-12-15',
    customerName: 'Sarah J.',
    customerAvatar: 'https://randomuser.me/api/portraits/women/32.jpg',
    verified: true,
    helpful: 15
  },
  {
    id: 'aa0e8400-e29b-41d4-a716-446655440002', // Valid UUID format
    customerId: 'cc0e8400-e29b-41d4-a716-446655440001',
    shopId: '550e8400-e29b-41d4-a716-446655440003',
    staffId: '660e8400-e29b-41d4-a716-446655440004',
    serviceId: '770e8400-e29b-41d4-a716-446655440005',
    rating: 5,
    comment: 'Maria has magic hands! The massage was exactly what I needed after a stressful week. The spa environment is so peaceful.',
    images: [],
    date: '2024-12-10',
    customerName: 'Sarah J.',
    customerAvatar: 'https://randomuser.me/api/portraits/women/32.jpg',
    verified: true,
    helpful: 8
  },
  {
    id: 'aa0e8400-e29b-41d4-a716-446655440003', // Valid UUID format
    customerId: 'cc0e8400-e29b-41d4-a716-446655440002',
    shopId: '550e8400-e29b-41d4-a716-446655440002',
    staffId: '660e8400-e29b-41d4-a716-446655440002',
    serviceId: '770e8400-e29b-41d4-a716-446655440004',
    rating: 4,
    comment: 'Jason really knows his stuff. Great workout and he pushed me just the right amount. Seeing results already!',
    images: [],
    date: '2024-12-08',
    customerName: 'Mike D.',
    customerAvatar: 'https://randomuser.me/api/portraits/men/22.jpg',
    verified: true,
    helpful: 12
  }
];

// Mock Notifications
export const MOCK_NOTIFICATIONS = [
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440001', // Valid UUID format
    type: 'booking_reminder',
    title: 'Upcoming Appointment',
    message: 'Your hair appointment with Emma at Luxe Beauty Studio is tomorrow at 10:00 AM',
    time: '2024-12-24T18:00:00Z',
    read: false,
    actionData: {
      bookingId: '990e8400-e29b-41d4-a716-446655440001',
      type: 'view_booking'
    }
  },
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440002', // Valid UUID format
    type: 'booking_confirmed',
    title: 'Booking Confirmed',
    message: 'Your massage appointment with Maria has been confirmed for Dec 28 at 2:00 PM',
    time: '2024-12-22T09:30:00Z',
    read: false,
    actionData: {
      bookingId: '990e8400-e29b-41d4-a716-446655440002',
      type: 'view_booking'
    }
  },
  {
    id: 'bb0e8400-e29b-41d4-a716-446655440003', // Valid UUID format
    type: 'promotion',
    title: 'Special Offer',
    message: '20% off your next spa treatment at Serenity Spa Retreat. Book now!',
    time: '2024-12-20T12:00:00Z',
    read: true,
    actionData: {
      shopId: '550e8400-e29b-41d4-a716-446655440003',
      type: 'view_shop'
    }
  }
];

// Helper functions to get mock data with logging
export const getMockUsers = () => {
  logMockUsage('Users');
  return MOCK_USERS;
};

export const getMockShops = () => {
  logMockUsage('Shops');
  return MOCK_SHOPS;
};

export const getMockStaff = (shopId?: string) => {
  logMockUsage('Staff', shopId ? `for shop ${shopId}` : 'all');
  return shopId ? MOCK_STAFF.filter(staff => staff.shopId === shopId) : MOCK_STAFF;
};

export const getMockServices = (shopId?: string) => {
  logMockUsage('Services', shopId ? `for shop ${shopId}` : 'all');
  return shopId ? MOCK_SERVICES.filter(service => service.shopId === shopId) : MOCK_SERVICES;
};

export const getMockCategories = () => {
  logMockUsage('Categories');
  return MOCK_CATEGORIES;
};

export const getMockBookings = (customerId?: string) => {
  logMockUsage('Bookings', customerId ? `for customer ${customerId}` : 'all');
  return customerId ? MOCK_BOOKINGS.filter(booking => booking.customerId === customerId) : MOCK_BOOKINGS;
};

export const getMockReviews = (shopId?: string) => {
  logMockUsage('Reviews', shopId ? `for shop ${shopId}` : 'all');
  return shopId ? MOCK_REVIEWS.filter(review => review.shopId === shopId) : MOCK_REVIEWS;
};

export const getMockNotifications = () => {
  logMockUsage('Notifications');
  return MOCK_NOTIFICATIONS;
};

// Search mock data
export const searchMockData = (query: string) => {
  logMockUsage('Search', query);
  const lowerQuery = query.toLowerCase();
  
  const matchingShops = MOCK_SHOPS.filter(shop => 
    shop.name.toLowerCase().includes(lowerQuery) ||
    shop.description.toLowerCase().includes(lowerQuery) ||
    shop.category.toLowerCase().includes(lowerQuery)
  );
  
  const matchingServices = MOCK_SERVICES.filter(service =>
    service.name.toLowerCase().includes(lowerQuery) ||
    service.description.toLowerCase().includes(lowerQuery) ||
    service.category.toLowerCase().includes(lowerQuery)
  );
  
  const matchingStaff = MOCK_STAFF.filter(staff =>
    staff.name.toLowerCase().includes(lowerQuery) ||
    staff.role.toLowerCase().includes(lowerQuery) ||
    staff.specialties.some(specialty => specialty.toLowerCase().includes(lowerQuery))
  );
  
  return {
    shops: matchingShops,
    services: matchingServices,
    staff: matchingStaff,
    total: matchingShops.length + matchingServices.length + matchingStaff.length
  };
};