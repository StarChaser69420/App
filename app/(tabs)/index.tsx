import React from 'react';
import {Text, View, Image} from 'react-native';
// Main page styling for text and image in main page
const YourApp = () => {
   return (
      <View style={{ flex: 1, paddingTop: 40 }}>
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={{ padding: 16 }}>
              <Text>{item.name}</Text>
            </View>
          )}
        />
      </View>
    );
  };

export default YourApp;