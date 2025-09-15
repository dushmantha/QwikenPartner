// Staff Availability Utility Functions

export interface StaffWorkSchedule {
  monday: { isWorking: boolean; startTime: string; endTime: string };
  tuesday: { isWorking: boolean; startTime: string; endTime: string };
  wednesday: { isWorking: boolean; startTime: string; endTime: string };
  thursday: { isWorking: boolean; startTime: string; endTime: string };
  friday: { isWorking: boolean; startTime: string; endTime: string };
  saturday: { isWorking: boolean; startTime: string; endTime: string };
  sunday: { isWorking: boolean; startTime: string; endTime: string };
}

export interface StaffLeaveDate {
  title: string;
  startDate: string;
  endDate: string;
  type: string;
}

export interface StaffMember {
  id: string;
  name: string;
  work_schedule: StaffWorkSchedule;
  leave_dates: StaffLeaveDate[];
  rating?: number;
  specialties?: string[];
  role?: string;
  avatar_url?: string;
  shop_id?: string;
}

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Convert time string to minutes for easier comparison
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Format minutes back to time string
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Check if a specific date is within staff's leave period
export const isOnLeave = (date: string, leaveDates: StaffLeaveDate[]): boolean => {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return leaveDates.some(leave => {
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return checkDate >= startDate && checkDate <= endDate;
  });
};

// Get staff availability for a specific date
export const getStaffAvailabilityForDate = (
  date: string,
  staff: StaffMember
): { isAvailable: boolean; workingHours?: { start: string; end: string }; reason?: string } => {
  // Safety check: If staff doesn't have work_schedule data yet (database migration not applied)
  if (!staff.work_schedule || typeof staff.work_schedule !== 'object') {
    console.warn(`⚠️ Staff ${staff.name} missing work_schedule data - database migration needed`);
    return { 
      isAvailable: true, 
      reason: 'No schedule data available (using default availability)' 
    };
  }

  const dateObj = new Date(date);
  const dayOfWeek = DAYS_OF_WEEK[dateObj.getDay()];
  
  // Check if staff is on leave (with safety check)
  if (staff.leave_dates && Array.isArray(staff.leave_dates) && isOnLeave(date, staff.leave_dates)) {
    return { 
      isAvailable: false, 
      reason: 'Staff member is on leave' 
    };
  }
  
  // Check regular work schedule
  const daySchedule = staff.work_schedule[dayOfWeek as keyof StaffWorkSchedule];
  
  // Safety check: If daySchedule is undefined
  if (!daySchedule || typeof daySchedule !== 'object') {
    console.warn(`⚠️ Staff ${staff.name} missing schedule for ${dayOfWeek}`);
    return { 
      isAvailable: true, 
      reason: `No ${dayOfWeek} schedule data available` 
    };
  }
  
  if (!daySchedule.isWorking) {
    return { 
      isAvailable: false, 
      reason: `Staff member doesn't work on ${dayOfWeek}s` 
    };
  }
  
  return {
    isAvailable: true,
    workingHours: {
      start: daySchedule.startTime,
      end: daySchedule.endTime
    }
  };
};

// Generate available time slots for a specific date and staff member
export const generateStaffTimeSlots = (
  date: string,
  staff: StaffMember,
  serviceDuration: number,
  bookedSlots: { start: string; end: string }[] = []
): Array<{
  id: string;
  startTime: string;
  endTime: string;
  available: boolean;
  staffAvailable: boolean;
  reason?: string;
}> => {
  const availability = getStaffAvailabilityForDate(date, staff);
  const slots: any[] = [];
  
  if (!availability.isAvailable || !availability.workingHours) {
    // Return empty array if staff is not available
    return [];
  }
  
  const workStart = timeToMinutes(availability.workingHours.start);
  const workEnd = timeToMinutes(availability.workingHours.end);
  
  // Generate slots within working hours
  for (let time = workStart; time <= workEnd - serviceDuration; time += 30) { // 30-minute intervals
    const slotEnd = time + serviceDuration;
    const startTimeStr = minutesToTime(time);
    const endTimeStr = minutesToTime(slotEnd);
    
    // Check if slot conflicts with existing bookings
    const isBooked = bookedSlots.some(booked => {
      const bookedStart = timeToMinutes(booked.start);
      const bookedEnd = timeToMinutes(booked.end);
      return (time < bookedEnd && slotEnd > bookedStart);
    });
    
    slots.push({
      id: startTimeStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      available: !isBooked,
      staffAvailable: true,
      reason: isBooked ? 'Staff member already booked during this time' : undefined
    });
  }
  
  return slots;
};

// Generate available time slots with booking conflict checking
export const generateStaffTimeSlotsWithBookings = async (
  date: string,
  staff: StaffMember,
  serviceDuration: number,
  getStaffBookingsCallback: (staffId: string, date: string) => Promise<Array<{ start: string; end: string }>>
): Promise<Array<{
  id: string;
  startTime: string;
  endTime: string;
  available: boolean;
  staffAvailable: boolean;
  reason?: string;
}>> => {
  try {
    // Fetch existing bookings for this staff member on this date
    const existingBookings = await getStaffBookingsCallback(staff.id, date);
    console.log('📅 Existing bookings for staff', staff.name, 'on', date, ':', existingBookings);
    
    // Generate time slots with conflict checking
    return generateStaffTimeSlots(date, staff, serviceDuration, existingBookings);
  } catch (error) {
    console.error('❌ Error fetching staff bookings, falling back to basic availability:', error);
    // Fallback to basic availability without booking conflict checking
    return generateStaffTimeSlots(date, staff, serviceDuration, []);
  }
};

// Get staff availability status for calendar marking
export const getStaffDateStatus = (
  date: string,
  staff: StaffMember,
  bookedSlots: { start: string; end: string }[] = []
): 'available' | 'unavailable' | 'leave' | 'fully_booked' => {
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if date is in the past
  if (dateObj < today) {
    return 'unavailable';
  }
  
  // Check if staff is on leave
  if (staff.leave_dates && isOnLeave(date, staff.leave_dates)) {
    return 'leave';
  }
  
  // Check regular work schedule
  const availability = getStaffAvailabilityForDate(date, staff);
  if (!availability.isAvailable || !availability.workingHours) {
    return 'unavailable';
  }
  
  // Check if staff is fully booked
  if (bookedSlots.length > 0) {
    const workStart = timeToMinutes(availability.workingHours.start);
    const workEnd = timeToMinutes(availability.workingHours.end);
    const totalWorkMinutes = workEnd - workStart;
    
    // Calculate total booked minutes
    const totalBookedMinutes = bookedSlots.reduce((total, slot) => {
      const slotStart = Math.max(timeToMinutes(slot.start), workStart);
      const slotEnd = Math.min(timeToMinutes(slot.end), workEnd);
      return total + Math.max(0, slotEnd - slotStart);
    }, 0);
    
    // Consider fully booked if more than 80% of working hours are booked
    if (totalBookedMinutes / totalWorkMinutes > 0.8) {
      return 'fully_booked';
    }
  }
  
  return 'available';
};

// Get staff availability status with booking information
export const getStaffDateStatusWithBookings = async (
  date: string,
  staff: StaffMember,
  getStaffBookingsCallback: (staffId: string, date: string) => Promise<Array<{ start: string; end: string }>>
): Promise<'available' | 'unavailable' | 'leave' | 'fully_booked'> => {
  try {
    const existingBookings = await getStaffBookingsCallback(staff.id, date);
    return getStaffDateStatus(date, staff, existingBookings);
  } catch (error) {
    console.error('❌ Error fetching staff bookings for date status:', error);
    return getStaffDateStatus(date, staff, []);
  }
};

// Generate calendar marked dates for a staff member
export const generateStaffCalendarMarks = (
  staff: StaffMember,
  startDate: Date = new Date(),
  daysAhead: number = 60,
  bookingsByDate: Record<string, Array<{ start: string; end: string }>> = {}
): Record<string, any> => {
  const marks: Record<string, any> = {};
  
  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const bookedSlots = bookingsByDate[dateStr] || [];
    const status = getStaffDateStatus(dateStr, staff, bookedSlots);
    
    switch (status) {
      case 'unavailable':
        marks[dateStr] = {
          disabled: true,
          disableTouchEvent: true,
          customStyles: {
            container: { backgroundColor: '#E5E7EB' },
            text: { color: '#9CA3AF', fontWeight: '500' }
          },
          marked: true,
          dotColor: '#9CA3AF'
        };
        break;
        
      case 'leave':
        marks[dateStr] = {
          disabled: true,
          disableTouchEvent: true,
          customStyles: {
            container: { backgroundColor: '#FEE2E2' },
            text: { color: '#DC2626', fontWeight: '600' }
          },
          marked: true,
          dotColor: '#EF4444'
        };
        break;
        
      case 'fully_booked':
        marks[dateStr] = {
          disabled: true,
          disableTouchEvent: true,
          customStyles: {
            container: { backgroundColor: '#FEF3C7' },
            text: { color: '#D97706', fontWeight: '600' }
          },
          marked: true,
          dotColor: '#F59E0B'
        };
        break;
        
      case 'available':
        marks[dateStr] = {
          marked: true,
          dotColor: '#10B981',
          customStyles: {
            container: { backgroundColor: 'transparent' },
            text: { color: '#1F2937' }
          }
        };
        break;
    }
  }
  
  return marks;
};

// Generate calendar marked dates with booking information
export const generateStaffCalendarMarksWithBookings = async (
  staff: StaffMember,
  getStaffBookingsCallback: (staffId: string, date: string) => Promise<Array<{ start: string; end: string }>>,
  startDate: Date = new Date(),
  daysAhead: number = 60
): Promise<Record<string, any>> => {
  try {
    const bookingsByDate: Record<string, Array<{ start: string; end: string }>> = {};
    
    // Fetch bookings for all dates in the range
    const bookingPromises = [];
    for (let i = 0; i < daysAhead; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      bookingPromises.push(
        getStaffBookingsCallback(staff.id, dateStr).then(bookings => {
          bookingsByDate[dateStr] = bookings;
        }).catch(error => {
          console.error(`❌ Error fetching bookings for ${dateStr}:`, error);
          bookingsByDate[dateStr] = [];
        })
      );
    }
    
    await Promise.all(bookingPromises);
    
    return generateStaffCalendarMarks(staff, startDate, daysAhead, bookingsByDate);
  } catch (error) {
    console.error('❌ Error generating calendar marks with bookings:', error);
    return generateStaffCalendarMarks(staff, startDate, daysAhead, {});
  }
};