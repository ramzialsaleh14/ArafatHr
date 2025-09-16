import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import LoginScreen from './app/screens/LoginScreen';
import MainScreen from './app/screens/MainScreen';

const Stack = createNativeStackNavigator();

// Configure how notifications should be handled when the app is running
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export default function App() {
    useEffect(() => {
        // Set up notification listeners if needed
        const subscription = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received:', notification);
        });

        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification response:', response);
        });

        return () => {
            subscription.remove();
            responseSubscription.remove();
        };
    }, []);

    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Login"
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#007AFF',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            >
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Main"
                    component={MainScreen}
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
            <StatusBar style="auto" />
        </NavigationContainer>
    );
}
