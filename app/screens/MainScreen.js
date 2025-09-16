import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Modal, ActivityIndicator, Platform } from 'react-native';
import i18n from '../languages/langStrings';
import * as Commons from '../utils/Commons';
import * as ServerOperations from '../utils/ServerOperations';
import * as LocationUtils from '../utils/LocationUtils';
import { v4 as uuidv4 } from 'uuid';
import * as Notifications from "expo-notifications";
import { useNavigation, useRoute } from "@react-navigation/native";
import Constants from "expo-constants";

export default function MainScreen({ navigation }) {
    const [currentLanguage, setCurrentLanguage] = useState(i18n.locale || 'en');
    const [userDevId, setUserDevId] = useState(null);
    const [showCheckInOutModal, setShowCheckInOutModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isHr, setIsHr] = useState(false);
    const route = useRoute();

    // Helper function to replace placeholders in translations
    const formatTranslation = (key, replacements = {}) => {
        let text = i18n.t(key);
        Object.keys(replacements).forEach(placeholder => {
            text = text.replace(`{${placeholder}}`, replacements[placeholder]);
        });
        return text;
    };
    async function registerForPushNotificationsAsync() {
        let token;
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== "granted") {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== "granted") {
                Alert.alert("Failed to get push token for push notification!");
                return;
            }

            // For development, skip projectId and use basic Expo push tokens
            try {
                // First, try without projectId for development
                token = (
                    await Notifications.getExpoPushTokenAsync()
                ).data;
                console.log("Got token without projectId (development mode)");
            } catch (error) {
                console.log("Failed to get push token:", error.message);
                // If we can't get a token at all, log the error but continue
                return null;
            }
            
            console.log("Push token:", token);
            console.log("Using development mode (no EAS projectId)");

            if (Platform.OS === "android") {
                Notifications.setNotificationChannelAsync("default", {
                    name: "default",
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: "#FF231F7C",
                });
            }

            return token;
        } catch (error) {
            console.error("Error getting push token:", error);
            return null;
        }
    }

    const registerUserToken = async () => {
        setIsProcessing(true);
        try {
            const devId = uuidv4();
            setUserDevId(devId);
            const userID = await Commons.getFromAS("userID");
            const curDevId = await Commons.getFromAS("devId");

            if (curDevId == null) {
                const token = await registerForPushNotificationsAsync();
                if (token) {
                    console.log(token);
                    await callSendUserToken(userID, token, devId);
                }
            } else {
                const serverToken = await ServerOperations.getServerToken(userID);
                if (serverToken.res != curDevId) {
                    if (serverToken.res == "") {
                        await Commons.removeFromAS("devId");
                        await registerUserToken();
                    } else {
                        await Commons.removeFromAS("userID");
                        await Commons.removeFromAS("password");
                        navigation.navigate("Login");
                        Commons.okMsgAlert(i18n.t("tokenNotRegistered"));
                    }
                } else {
                    const userToken = await Commons.getFromAS("devId");
                    console.log("devId:  " + userToken);
                    setUserDevId(userToken);
                }
            }
        } catch (error) {
            console.error("Error in registerUserToken:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const callSendUserToken = async (userID, token, devId) => {
        const resp = await ServerOperations.sendUserToken(userID, token, devId);
        if (resp.res == "ok") {
            await Commons.saveToAS("devId", devId);
        } else if (resp.res == "exists") {
            Commons.okAlert("", i18n.t("tokenNotRegistered"));
            await Commons.removeFromAS("userID");
            await Commons.removeFromAS("password");
            navigation.navigate("Login");
        }
    };

    useEffect(() => {
        const isHrParam = route.params?.isHr || false;
        setIsHr(isHrParam);
        registerUserToken();

        // Location permissions can be requested here if needed
        (async () => {
            // Future location permission requests can go here
        })();
    }, []);


    function onTakeLeave() {
        Alert.alert(i18n.t('takeLeaveAlert'), i18n.t('takeLeaveComingSoon'));
    }

    function onCheckInOut() {
        setShowCheckInOutModal(true);
    }

    const handleCheckIn = async () => {
        await handleCheckInOut('In');
    };

    const handleCheckOut = async () => {
        await handleCheckInOut('Out');
    };

    const handleCheckInOut = async (type) => {
        if (isProcessing) return;

        setIsProcessing(true);
        setShowCheckInOutModal(false);

        try {
            // Get user from storage
            const user = await Commons.getFromAS("userID");
            if (!user) {
                Alert.alert(i18n.t('error'), i18n.t('userNotFound'));
                setIsProcessing(false);
                return;
            }

            // Check location
            const locationCheck = await LocationUtils.isWithinOfficeRange();
            if (!locationCheck.isWithinRange) {
                Alert.alert(
                    i18n.t('locationError'),
                    formatTranslation('locationTooFar', { distance: Math.round(locationCheck.distance) })
                );
                setIsProcessing(false);
                return;
            }

            // Get current date and time
            const now = new Date();
            const date = now.toLocaleDateString('en-GB'); // DD/MM/YYYY format
            const time = now.toLocaleTimeString('en-GB', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            }); // HH:mm format

            // Format location
            const location = LocationUtils.formatLocation(
                locationCheck.location.latitude,
                locationCheck.location.longitude
            );

            // Call server function
            const response = await ServerOperations.checkinorout(
                user,
                date,
                time,
                location,
                type,
                userDevId
            );

            if (response.res == "ok") {
                Alert.alert(
                    i18n.t('success'),
                    formatTranslation(type === 'in' ? 'checkInSuccess' : 'checkOutSuccess', { time })
                );
            } else if (response && response.res === 'notCheckedIn' && type === 'out') {
                // Special case: trying to check out when not checked in
                Alert.alert(
                    i18n.t('error'),
                    i18n.t('notCheckedIn')
                );
            } else if (response && response.res === 'tokenExists') {
                // Special case: device token not registered for this user
                Alert.alert(
                    i18n.t('error'),
                    i18n.t('tokenNotRegistered')
                );
            } else {
                Alert.alert(
                    i18n.t('error'),
                    response?.error || i18n.t(type === 'in' ? 'checkInFailed' : 'checkOutFailed')
                );
            }

        } catch (error) {
            console.error('Check in/out error:', error);
            Alert.alert(i18n.t('error'), i18n.t('requestFailed'));
        } finally {
            setIsProcessing(false);
        }
    };

    const onLogout = async () => {
        await Commons.removeFromAS("userID");
        await Commons.removeFromAS("password");
        Alert.alert(
            i18n.t('logout'),
            i18n.t('logoutConfirm'),
            [
                { text: i18n.t('cancel'), style: 'cancel' },
                { text: i18n.t('logout'), onPress: () => navigation.navigate('Login') }
            ]
        );
    }

    function toggleLanguage() {
        const newLanguage = currentLanguage === 'en' ? 'ar' : 'en';
        i18n.locale = newLanguage;
        setCurrentLanguage(newLanguage);

        // Force re-render by navigating to self
        navigation.replace('Main');
    }

    return (
        <View style={styles.container}>
            {/* Loading Overlay */}
            {isProcessing && !showCheckInOutModal && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContent}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.loadingText}>{i18n.t('processing')}</Text>
                    </View>
                </View>
            )}

            <View style={styles.header}>
                <TouchableOpacity style={styles.languageButton} onPress={toggleLanguage}>
                    <Text style={styles.languageButtonText}>
                        {currentLanguage === 'en' ? '🌐 العربية' : '🌐 English'}
                    </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.optionButton} onPress={onTakeLeave}>
                <Text style={styles.optionButtonText}>{i18n.t('takeLeaveBtn')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton} onPress={onCheckInOut}>
                <Text style={styles.optionButtonText}>{i18n.t('checkInOutBtn')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                <Text style={styles.logoutButtonText}>{i18n.t('logout')}</Text>
            </TouchableOpacity>

            {/* Check In/Out Modal */}
            <Modal
                visible={showCheckInOutModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowCheckInOutModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{i18n.t('checkInOutModalTitle')}</Text>
                        <Text style={styles.modalSubtitle}>{i18n.t('checkInOutModalSubtitle')}</Text>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.checkInButton, isProcessing && styles.checkInButtonDisabled]}
                                onPress={handleCheckIn}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                                            {i18n.t('processing')}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={[styles.buttonText, isProcessing && styles.buttonTextDisabled]}>
                                        {i18n.t('checkInBtn')}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.checkOutButton, isProcessing && styles.checkOutButtonDisabled]}
                                onPress={handleCheckOut}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                                            {i18n.t('processing')}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={[styles.buttonText, isProcessing && styles.buttonTextDisabled]}>
                                        {i18n.t('checkOutBtn')}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setShowCheckInOutModal(false)}
                            disabled={isProcessing}
                        >
                            <Text style={styles.cancelButtonText}>{i18n.t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
        justifyContent: 'center',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    loadingContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    header: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 1,
    },
    languageButton: {
        backgroundColor: '#007AFF',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
    },
    languageButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 40,
        color: '#666',
    },
    optionButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    optionButtonText: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
        color: '#007AFF',
    },
    optionDescription: {
        fontSize: 14,
        color: '#666',
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
        borderRadius: 8,
        padding: 16,
        marginTop: 20,
        alignItems: 'center',
    },
    logoutButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        maxWidth: 350,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        color: '#333',
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
        gap: 12,
    },
    checkInButton: {
        backgroundColor: '#34C759',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 20,
        flex: 1,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    checkInButtonDisabled: {
        backgroundColor: '#A0A0A0',
    },
    checkOutButton: {
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 20,
        flex: 1,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    checkOutButtonDisabled: {
        backgroundColor: '#A0A0A0',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonTextDisabled: {
        color: '#666',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#E5E5EA',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 30,
        alignItems: 'center',
        minWidth: 100,
    },
    cancelButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
});