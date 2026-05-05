import React from 'react';
import {Text, View, Image} from 'react-native';

const YourApp = () => {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Text>Hello World</Text>

      <Image
        source={require('../../assets/images/icon.png')}
        style={{ width: 200, height: 200 }}
      />
    </View>
  );
};

export default YourApp;