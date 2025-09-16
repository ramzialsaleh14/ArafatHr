import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../languages/langStrings';
import * as ServerOperations from '../utils/ServerOperations';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [userNoStorage, setUserNoStorage] = useState("");
    const [passwordStorage, setPasswordStorage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const onChangeUser = (text) => {
        setUsername(text);
    };

    const onChangePassword = (text) => {
        setPassword(text);
    };

    // Get login info from storage
    const getLoginInfo = async () => {
        try {
            const userFromStorage = await Commons.getFromAS("userID");
            const passFromStorage = await Commons.getFromAS("password");

            if (userFromStorage && passFromStorage) {
                setUserNoStorage(userFromStorage);
                setPasswordStorage(passFromStorage);
                onChangeUser(userFromStorage);
                onChangePassword(passFromStorage);
            }
        } catch (error) {
            console.error("Error loading credentials:", error);
        }
    };

    // Load credentials on mount
    useEffect(() => {
        getLoginInfo();
    }, []);

    // Auto-login effect when storage credentials are loaded
    useEffect(() => {
        if (userNoStorage && passwordStorage) {
            const autoLogin = async () => {
                try {
                    const resp = await ServerOperations.checkLogin(userNoStorage, passwordStorage, Constants.appVersion);
                    if (resp && resp.result === true) {
                        await Commons.saveToAS("userID", userNoStorage);
                        await Commons.saveToAS("password", passwordStorage);

                        // Save user info for check-in/out system
                        await AsyncStorage.setItem('currentUser', userNoStorage);
                        if (resp.userdevId) {
                            await AsyncStorage.setItem('userdevId', resp.userdevId.toString());
                        }

                        const isHr = resp.isHr === "Y";
                        navigation.navigate("Main", { isHr });
                    } else {
                        Alert.alert(i18n.t('loginFailed'), i18n.t('invalidCredentials'));
                    }
                } catch (error) {
                    console.error("Auto-login error:", error);
                }
            };
            autoLogin();
        }
    }, [userNoStorage, passwordStorage, navigation]);

    const onLogin = async () => {
        setIsLoading(true);
        try {
            const response = await ServerOperations.checkLogin(username, password);
            if (response.result) {
                // Save credentials
                await Commons.saveToAS("userID", username);
                await Commons.saveToAS("password", password);

                // Save user info for check-in/out system
                await AsyncStorage.setItem('currentUser', username);
                if (response.userdevId) {
                    await AsyncStorage.setItem('userdevId', response.userdevId.toString());
                }

                const isHr = response.isHr === "Y";
                navigation.navigate('Main', { isHr });
            } else {
                Alert.alert(i18n.t('loginFailed'), i18n.t('invalidCredentials'));
            }
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert(i18n.t('loginFailed'), i18n.t('networkError'));
        } finally {
            setIsLoading(false);
        }
    }

    // tiny 1x1 PNG (transparent) embedded so project runs without external assets
    const tinyPngDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

    return (
        <View style={styles.container}>
            <Image source={{ uri: tinyPngDataUri }} style={styles.logo} />
            <Text style={styles.title}>{i18n.t('appTitle')}</Text>

            <TextInput
                style={styles.input}
                placeholder={i18n.t('username')}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />

            <TextInput
                style={styles.input}
                placeholder={i18n.t('password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={onLogin}>
                <Text style={styles.buttonText}>{i18n.t('login')}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 16,
        borderRadius: 60,
        backgroundColor: '#eee'
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 24,
    },
    input: {
        width: '100%',
        height: 48,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    button: {
        width: '100%',
        height: 48,
        backgroundColor: '#007AFF',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});