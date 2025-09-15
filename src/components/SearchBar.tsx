import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const SearchBar = () => {
  return (
    <View style={styles.container}>
      <Icon name="search-outline" size={24} color="#8E8E93" style={styles.icon} />
      <View style={styles.textContainer}>
        <TextInput
          placeholder="Sök tjänst eller kategori"
          placeholderTextColor="#3C3C4399"
          style={styles.textInput}
        />
        <Text style={styles.subtext}>Hela Sverige</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.0,
    elevation: 2,
  },
  icon: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  textInput: {
    fontSize: 17,
    color: '#1A2533',
    padding: 0, // Remove default padding
  },
  subtext: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
});

export default SearchBar;
