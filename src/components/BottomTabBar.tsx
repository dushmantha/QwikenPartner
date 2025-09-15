import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';

interface TabBarItemProps {
  iconName: string;
  iconLib: 'Ionicons' | 'MaterialCommunityIcons';
  label: string;
  isFocused: boolean;
  hasBadge?: boolean;
}

const TabBarItem: React.FC<TabBarItemProps> = ({ iconName, iconLib, label, isFocused, hasBadge }) => {
  const color = isFocused ? '#1A2533' : '#8E8E93';
  const IconComponent = iconLib === 'MaterialCommunityIcons' ? MaterialCommunityIcon : Icon;

  return (
    <TouchableOpacity style={styles.tabItem}>
      <View style={styles.iconContainer}>
        <IconComponent name={iconName} size={24} color={color} />
        {hasBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>1</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const BottomTabBar = () => {
  return (
    <View style={styles.container}>
      <TabBarItem iconName="search" iconLib="Ionicons" label="Search" isFocused={true} />
      <TabBarItem iconName="calendar-outline" iconLib="Ionicons" label="Bookings" isFocused={false} hasBadge={true} />
      <TabBarItem iconName="percent-outline" iconLib="MaterialCommunityIcons" label="Last Minute" isFocused={false} />
      <TabBarItem iconName="heart-outline" iconLib="Ionicons" label="Favorites" isFocused={false} />
      <TabBarItem iconName="person-outline" iconLib="Ionicons" label="Profile" isFocused={false} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: 85,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: 'white',
    paddingTop: 10,
    paddingBottom: 25, // Safe area for home indicator
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#E53935',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default BottomTabBar;
