import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface BusinessHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  isAlwaysOpen?: boolean;
}

interface SpecialDay {
  id: string;
  name: string;
  date: string;
  type: string;
  recurring: string;
}

interface FriendlyScheduleDisplayProps {
  businessHours: BusinessHours[];
  specialDays?: SpecialDay[];
  compact?: boolean;
}

export const FriendlyScheduleDisplay: React.FC<FriendlyScheduleDisplayProps> = ({
  businessHours,
  specialDays = [],
  compact = false
}) => {
  // Get today's day name
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  
  // Group consecutive days with same hours
  const groupedHours = businessHours.reduce((acc, curr, index) => {
    if (index === 0) {
      acc.push({ days: [curr.day], ...curr });
      return acc;
    }
    
    const lastGroup = acc[acc.length - 1];
    if (
      lastGroup.isOpen === curr.isOpen &&
      lastGroup.openTime === curr.openTime &&
      lastGroup.closeTime === curr.closeTime
    ) {
      lastGroup.days.push(curr.day);
    } else {
      acc.push({ days: [curr.day], ...curr });
    }
    
    return acc;
  }, [] as Array<BusinessHours & { days: string[] }>);

  // Format time in a friendly way
  const formatTime = (time: string) => {
    if (!time) return '';
    
    // Convert 24h to 12h format with AM/PM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    
    // Remove :00 for on-the-hour times
    if (minutes === '00') {
      return `${displayHour}${ampm}`;
    }
    
    return `${displayHour}:${minutes}${ampm}`;
  };

  // Format day range
  const formatDayRange = (days: string[]) => {
    if (days.length === 1) {
      return days[0];
    }
    
    if (days.length === 7) {
      return 'Every day';
    }
    
    if (days.length === 5 && !days.includes('Saturday') && !days.includes('Sunday')) {
      return 'Weekdays';
    }
    
    if (days.length === 2 && days.includes('Saturday') && days.includes('Sunday')) {
      return 'Weekends';
    }
    
    // For consecutive days
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const indices = days.map(day => dayOrder.indexOf(day)).sort((a, b) => a - b);
    
    let isConsecutive = true;
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] - indices[i - 1] !== 1) {
        isConsecutive = false;
        break;
      }
    }
    
    if (isConsecutive && days.length > 2) {
      return `${days[0].slice(0, 3)} - ${days[days.length - 1].slice(0, 3)}`;
    }
    
    // Otherwise show abbreviated list
    return days.map(d => d.slice(0, 3)).join(', ');
  };

  // Get current status
  const getCurrentStatus = () => {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const todayHours = businessHours.find(h => h.day === currentDay);
    
    if (!todayHours || !todayHours.isOpen) {
      return { isOpen: false, text: 'Closed', color: '#EF4444' };
    }
    
    if (currentTime >= todayHours.openTime && currentTime < todayHours.closeTime) {
      return { 
        isOpen: true, 
        text: `Open until ${formatTime(todayHours.closeTime)}`, 
        color: '#059669' 
      };
    }
    
    if (currentTime < todayHours.openTime) {
      return { 
        isOpen: false, 
        text: `Opens at ${formatTime(todayHours.openTime)}`, 
        color: '#1A2533' 
      };
    }
    
    return { isOpen: false, text: 'Closed', color: '#EF4444' };
  };

  const status = getCurrentStatus();

  // Format special days
  const formatSpecialDay = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if it's today
    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    // Check if it's tomorrow
    if (d.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    // Check if it's within the next 7 days
    const daysFromNow = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysFromNow > 0 && daysFromNow <= 7) {
      return d.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    // Otherwise show date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get upcoming special days
  const upcomingSpecialDays = specialDays
    .filter(day => new Date(day.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 2);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
        {upcomingSpecialDays.length > 0 && (
          <Text style={styles.compactSpecialDay}>
            ⚠️ {upcomingSpecialDays[0].name} - {formatSpecialDay(upcomingSpecialDays[0].date)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Current Status */}
      <View style={styles.currentStatus}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIndicator, { backgroundColor: status.color }]} />
          <Text style={[styles.statusMainText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      {/* Business Hours */}
      <View style={styles.hoursSection}>
        <Text style={styles.sectionTitle}>Business Hours</Text>
        {groupedHours.map((group, index) => (
          <View key={index} style={styles.hoursRow}>
            <Text style={[
              styles.dayText,
              group.days.includes(today) && styles.todayText
            ]}>
              {formatDayRange(group.days)}
            </Text>
            <View style={styles.timeContainer}>
              {group.isOpen ? (
                <>
                  <Text style={styles.timeText}>{formatTime(group.openTime)}</Text>
                  <Text style={styles.timeSeparator}>-</Text>
                  <Text style={styles.timeText}>{formatTime(group.closeTime)}</Text>
                </>
              ) : (
                <Text style={styles.closedText}>Closed</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Upcoming Special Days */}
      {upcomingSpecialDays.length > 0 && (
        <View style={styles.specialDaysSection}>
          <Text style={styles.sectionTitle}>Upcoming Special Days</Text>
          {upcomingSpecialDays.map((day) => (
            <View key={day.id} style={styles.specialDayRow}>
              <Ionicons 
                name={day.type === 'holiday' ? 'calendar-outline' : 'information-circle-outline'} 
                size={16} 
                color="#1A2533" 
              />
              <Text style={styles.specialDayText}>
                {day.name} - {formatSpecialDay(day.date)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  compactContainer: {
    paddingVertical: 8,
  },
  currentStatus: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusMainText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hoursSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2533',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayText: {
    fontSize: 15,
    color: '#1A2533',
    flex: 1,
  },
  todayText: {
    fontWeight: '600',
    color: '#111827',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 15,
    color: '#1A2533',
  },
  timeSeparator: {
    marginHorizontal: 8,
    color: '#9CA3AF',
  },
  closedText: {
    fontSize: 15,
    color: '#EF4444',
    fontStyle: 'italic',
  },
  specialDaysSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  specialDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  specialDayText: {
    fontSize: 14,
    color: '#1A2533',
    marginLeft: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  compactSpecialDay: {
    fontSize: 12,
    color: '#1A2533',
    marginTop: 4,
  },
});