import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';
import { setNavigationRef } from '../services/api';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import LoaderOverlay from '../components/feedback/LoaderOverlay';

const Root = createStackNavigator();

const RootNavigator = () => {
  const { isLoggedIn, isBootstrapped, bootstrap } = useAuthStore();

  useEffect(() => { bootstrap(); }, []);

  if (!isBootstrapped) return <LoaderOverlay visible />;

  return (
    <Root.Navigator screenOptions={{ headerShown: false, animationEnabled: false }}>
      {isLoggedIn
        ? <Root.Screen name="App"  component={AppStack} />
        : <Root.Screen name="Auth" component={AuthStack} />
      }
    </Root.Navigator>
  );
};

const Navigation = ({ navigationRef }) => (
  <NavigationContainer
    ref={(ref) => {
      navigationRef.current = ref;
      setNavigationRef(ref);
    }}
  >
    <RootNavigator />
  </NavigationContainer>
);

export default Navigation;
