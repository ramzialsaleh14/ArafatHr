import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Modal, ActivityIndicator, Platform, TextInput, FlatList, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DropDownPicker from 'react-native-dropdown-picker';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import i18n from '../languages/langStrings';
import * as Commons from '../utils/Commons';
import * as ServerOperations from '../utils/ServerOperations';
import * as Constants2 from '../utils/Constants';
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
    const [loadingStatus, setLoadingStatus] = useState('');
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownValue, setDropdownValue] = useState(null);
    const [dropdownItems, setDropdownItems] = useState([]);
    const [isHr, setIsHr] = useState(false);
    const [isManager, setIsManager] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [username, setUsername] = useState('');

    // HR Filter Dialog States
    const [showHRFilterDialog, setShowHRFilterDialog] = useState(false);
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [activePicker, setActivePicker] = useState(null); // 'from' | 'to' | null
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employeeText, setEmployeeText] = useState('');
    const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    // Notes Dialog States
    const [showNotesDialog, setShowNotesDialog] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);

    const route = useRoute();

    // Status options for filtering
    const statusOptions = [
        { id: 'All', name: i18n.t('all') },
        { id: 'Pending', name: i18n.t('pending') },
        { id: 'Approved', name: i18n.t('approved') },
        { id: 'Rejected', name: i18n.t('rejected') }
    ];

    // Helper function to replace placeholders In translations
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
            console.error("Error In registerUserToken:", error);
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

    const getAllLocations = async () => {
        try {
            const userID = await Commons.getFromAS("userID");
            const response = await ServerOperations.getLocations(userID);
            if (response) {
                setLocations(response);

                // Set up dropdown items
                const items = response.map(location => ({
                    label: location.name,
                    value: location.id,
                    location: location
                }));
                setDropdownItems(items);

                // Set the first location as default if available
                if (response.length > 0) {
                    setSelectedLocation(response[0]);
                    setDropdownValue(response[0].id);
                }
            }
        } catch (error) {
            console.error("Error getting locations:", error);
        }
    };

    useEffect(() => {
        const isHrParam = route.params?.isHr || false;
        const isManagerParam = route.params?.isManager || false;
        const userNameParam = route.params?.userName;

        setIsHr(isHrParam);
        setIsManager(isManagerParam);

        // Set username from route params first, then fallback to AsyncStorage
        if (userNameParam) {
            setUsername(userNameParam);
        } else {
            // Only get from AsyncStorage if not provided in route params
            (async () => {
                const storedUsername = await Commons.getFromAS("userName");
                console.log('Stored username:', storedUsername);
                if (storedUsername) setUsername(storedUsername);
            })();
        }

        registerUserToken();
        getAllLocations();

        // Update time every second - use callback to prevent unnecessary re-renders
        const timeInterval = setInterval(() => {
            setCurrentTime(prevTime => {
                const newTime = new Date();
                // Only update if minute has changed to reduce re-renders
                if (newTime.getMinutes() !== prevTime.getMinutes() ||
                    newTime.getHours() !== prevTime.getHours()) {
                    return newTime;
                }
                return prevTime;
            });
        }, 1000);

        return () => {
            if (timeInterval) {
                clearInterval(timeInterval);
            }
        };
    }, [route.params?.userName]); // Add dependency to re-run when userName changes


    function onTakeLeave() {
        navigation.navigate('TakeLeave');
    }

    function onCheckInOut() {
        setShowCheckInOutModal(true);
    }

    function onPendingRequests() {
        navigation.navigate('PendingRequests');
    }

    function onMyRequests() {
        const today = new Date();
        const todayStr = today.toLocaleDateString('en-GB'); // DD/MM/YYYY format

        navigation.navigate('MyRequestsScreen', {
            fromDate: todayStr,
            toDate: todayStr,
            empId: null, // Will be set in MyRequestsScreen
            status: 'All'
        });
    }

    function onViewAllRequestsHR() {
        setShowHRFilterDialog(true);
    }

    function onCloseModal() {
        setDropdownOpen(false);
        setShowCheckInOutModal(false);
    }

    function onCloseHRFilterDialog() {
        setShowHRFilterDialog(false);
        setSelectedEmployee(null);
        setEmployeeText('');
        setSelectedStatus('All');
    }

    const loadEmployees = async () => {
        setLoadingEmployees(true);
        try {
            const response = await ServerOperations.getNameslist();
            if (response && Array.isArray(response)) {
                setEmployees(response);
            } else {
                setEmployees([]);
            }
        } catch (error) {
            console.error("Error loading employees:", error);
            Alert.alert(i18n.t('error'), i18n.t('failedToLoadEmployees'));
        } finally {
            setLoadingEmployees(false);
        }
    };

    const onEmployeeTextPress = () => {
        setShowEmployeeDialog(true);
        loadEmployees();
    };

    const onEmployeeSelect = (employee) => {
        setSelectedEmployee(employee);
        setEmployeeText(employee.name);
        setShowEmployeeDialog(false);
    };

    const onStatusSelect = (status) => {
        setSelectedStatus(status.id);
        setShowStatusDialog(false);
    };

    const onSubmitHRFilter = () => {
        const fromDateStr = fromDate.toLocaleDateString('en-GB'); // DD/MM/YYYY format
        const toDateStr = toDate.toLocaleDateString('en-GB'); // DD/MM/YYYY format
        const empId = selectedEmployee ? selectedEmployee.id : '';

        setShowHRFilterDialog(false);
        navigation.navigate('AllRequestsHr', {
            fromDate: fromDateStr,
            toDate: toDateStr,
            empId: empId,
            status: selectedStatus
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString();
    };

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
            setLoadingStatus(i18n.t('gettingUserInfo'));
            const user = await Commons.getFromAS("userID");
            if (!user) {
                Alert.alert(i18n.t('error'), i18n.t('userNotFound'));
                setIsProcessing(false);
                setLoadingStatus('');
                return;
            }

            // Validate selected location
            if (!selectedLocation) {
                Alert.alert(i18n.t('error'), i18n.t('noLocationSelected'));
                setIsProcessing(false);
                setLoadingStatus('');
                return;
            }

            // Parse the selected location coordinates
            const officeCoords = LocationUtils.parseLocation(selectedLocation.location);
            if (!officeCoords) {
                Alert.alert(i18n.t('error'), i18n.t('invalidLocationData'));
                setIsProcessing(false);
                setLoadingStatus('');
                return;
            }

            // Check location
            setLoadingStatus(i18n.t('gettingLocation'));
            const locationCheck = await LocationUtils.isWithinOfficeRange(
                officeCoords,
                selectedLocation.allowedRadius || 150
            );
            if (!locationCheck.isWithinRange) {
                Alert.alert(
                    i18n.t('locationError'),
                    formatTranslation('locationTooFarFromLocation', {
                        distance: Math.round(locationCheck.distance),
                        locationName: selectedLocation.name,
                        allowedRadius: selectedLocation.allowedRadius || 150
                    })
                );
                setIsProcessing(false);
                setLoadingStatus('');
                return;
            }

            // Get current date and time
            setLoadingStatus(i18n.t('preparingData'));
            const now = new Date();
            const date = now.toLocaleDateString('en-GB'); // DD/MM/YYYY format
            const time = now.toLocaleTimeString('en-GB', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            }); // HH:mm format

            setLoadingStatus(i18n.t('checkingPreviousRecords'));
            const respChecked = await ServerOperations.CheckIsChecked(user, date, type);
            if (respChecked.res == "alreadyChecked") {
                setIsProcessing(false);
                setLoadingStatus('');
                Commons.okAlert("توجد بصمة سابقة لك اليوم");
                return;
            }
            if (respChecked.res == "alreadyCheckedOut") {
                setIsProcessing(false);
                setLoadingStatus('');
                Commons.okAlert("توجد بصمة خروج سابقة لك اليوم");
                return;
            }

            // Format location
            const location = LocationUtils.formatLocation(
                locationCheck.location.latitude,
                locationCheck.location.longitude
            );

            // Call server function
            setLoadingStatus(type === 'in' ? i18n.t('checkingIn') : i18n.t('checkingOut'));
            const response = await ServerOperations.checkInOrOut(
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
                    formatTranslation(type === 'In' ? 'checkInSuccess' : 'checkOutSuccess', { time })
                );
            } else if (response && response.res === 'notCheckedIn' && type === 'Out') {
                // Special case: trying to check Out when not checked In
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
                    response?.error || i18n.t(type === 'In' ? 'checkInFailed' : 'checkOutFailed')
                );
            }

        } catch (error) {
            console.error('Check in/out error:', error);
            Alert.alert(i18n.t('error'), i18n.t('requestFailed'));
        } finally {
            setIsProcessing(false);
            setLoadingStatus('');
        }
    };

    const onLogout = async () => {
        await Commons.removeFromAS("userID");
        await Commons.removeFromAS("userName");
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

    const handleSendNote = async () => {
        if (!noteText.trim()) {
            Alert.alert(i18n.t('error'), i18n.t('pleaseEnterNote'));
            return;
        }

        try {
            setIsSubmittingNote(true);
            const user = await Commons.getFromAS("userID");
            const currentDate = new Date();
            const formattedDate = `${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;

            const response = await ServerOperations.sendAppNotes(user, formattedDate, noteText.trim());

            if (response && response.res === 'ok') {
                Alert.alert(i18n.t('success'), i18n.t('notesSentSuccessfully'));
                setNoteText('');
                setShowNotesDialog(false);
            } else {
                Alert.alert(i18n.t('error'), i18n.t('failedToSendNote'));
            }
        } catch (error) {
            console.error('Error sending note:', error);
            Alert.alert(i18n.t('error'), i18n.t('failedToSendNote'));
        } finally {
            setIsSubmittingNote(false);
        }
    };

    function toggleLanguage() {
        const newLanguage = currentLanguage === 'en' ? 'ar' : 'en';
        i18n.locale = newLanguage;
        setCurrentLanguage(newLanguage);

        // Force re-render by navigating to self, preserve parameters
        const currentUserName = route.params?.userName || username;
        navigation.replace('Main', {
            isHr: isHr,
            isManager: isManager,
            userName: currentUserName
        });
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Loading Overlay */}
                {isProcessing && !showCheckInOutModal && (
                    <View style={styles.loadingOverlay}>
                        <View style={styles.loadingContent}>
                            <ActivityIndicator size="large" color="#007AFF" />
                            <Text style={styles.loadingText}>{loadingStatus || i18n.t('processing')}</Text>
                        </View>
                    </View>
                )}

                {/* Header Section */}
                <View style={styles.headerSection}>
                    <View style={styles.logoContainer}>
                        <Image source={require('../../assets/logo.png')} style={styles.logo} />
                    </View>
                    <View style={styles.userInfoContainer}>
                        <Text style={styles.welcomeText}>{i18n.t('welcome')}</Text>
                        <Text style={styles.usernameText}>{route.params?.userName || username}</Text>
                        <Text style={styles.timeText}>{currentTime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        })}</Text>
                        <Text style={styles.dateText}>{currentTime.toLocaleDateString('en-GB')}</Text>
                    </View>
                </View>

                <View style={styles.content}>
                    <TouchableOpacity style={styles.optionButton} onPress={onTakeLeave}>
                        <MaterialIcons name="event-available" size={24} color="#007AFF" style={styles.optionButtonIcon} />
                        <Text style={styles.optionButtonText}>{i18n.t('takeLeaveBtn')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionButton} onPress={onCheckInOut}>
                        <MaterialIcons name="access-time" size={24} color="#007AFF" style={styles.optionButtonIcon} />
                        <Text style={styles.optionButtonText}>{i18n.t('checkInOutBtn')}</Text>
                    </TouchableOpacity>

                    {isManager && (
                        <TouchableOpacity style={styles.optionButton} onPress={onPendingRequests}>
                            <MaterialIcons name="pending-actions" size={24} color="#007AFF" style={styles.optionButtonIcon} />
                            <Text style={styles.optionButtonText}>{i18n.t('pendingRequestsBtn')}</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.optionButton} onPress={onMyRequests}>
                        <MaterialIcons name="history" size={24} color="#007AFF" style={styles.optionButtonIcon} />
                        <Text style={styles.optionButtonText}>{i18n.t('myRequestsBtn')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionButton} onPress={() => setShowNotesDialog(true)}>
                        <MaterialIcons name="note-add" size={24} color="#007AFF" style={styles.optionButtonIcon} />
                        <Text style={styles.optionButtonText}>{i18n.t('inputNotes')}</Text>
                    </TouchableOpacity>

                    {isHr && (
                        <TouchableOpacity style={styles.optionButton} onPress={onViewAllRequestsHR}>
                            <MaterialIcons name="assignment" size={24} color="#007AFF" style={styles.optionButtonIcon} />
                            <Text style={styles.optionButtonText}>{i18n.t('viewAllRequestsHR')}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.footerButton} onPress={onLogout}>
                        <View style={styles.footerButtonContent}>
                            <MaterialIcons name="exit-to-app" size={18} color="#E74C3C" />
                            <Text style={[styles.footerButtonText, { color: '#E74C3C' }]}>{i18n.t('logout')}</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.versionContainer}>
                        <Text style={styles.versionText}> {Constants2.appVersion} </Text>
                    </View>

                    <TouchableOpacity style={styles.footerButton} onPress={toggleLanguage}>
                        <View style={styles.footerButtonContent}>
                            <MaterialIcons name="language" size={18} color="#3498DB" />
                            <Text style={[styles.footerButtonText, { color: '#3498DB' }]}>
                                {currentLanguage === 'en' ? 'العربية' : 'English'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Check In/Out Modal */}
                <Modal
                    visible={showCheckInOutModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={onCloseModal}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{i18n.t('checkInOutModalTitle')}</Text>
                            <Text style={styles.modalSubtitle}>{i18n.t('checkInOutModalSubtitle')}</Text>

                            {/* Location Picker */}
                            <View style={styles.pickerContainer}>
                                <Text style={styles.pickerLabel}>{i18n.t('selectLocation')}</Text>
                                <DropDownPicker
                                    open={dropdownOpen}
                                    value={dropdownValue}
                                    items={dropdownItems}
                                    setOpen={setDropdownOpen}
                                    setValue={setDropdownValue}
                                    setItems={setDropdownItems}
                                    onChangeValue={(value) => {
                                        const selected = locations.find(loc => loc.id === value);
                                        setSelectedLocation(selected);
                                    }}
                                    disabled={isProcessing}
                                    placeholder={i18n.t('selectLocation')}
                                    style={styles.dropdown}
                                    dropDownContainerStyle={styles.dropdownContainer}
                                    textStyle={styles.dropdownText}
                                    zIndex={3000}
                                    zIndexInverse={1000}
                                />
                            </View>

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
                                onPress={onCloseModal}
                                disabled={isProcessing}
                            >
                                <Text style={styles.cancelButtonText}>{i18n.t('cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* HR Filter Dialog */}
                <Modal
                    visible={showHRFilterDialog}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={onCloseHRFilterDialog}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.filterDialog}>
                            <Text style={styles.dialogTitle}>{i18n.t('filterRequests')}</Text>

                            <View style={styles.filterRow}>
                                <Text style={styles.filterLabel}>{i18n.t('fromDate')}:</Text>
                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => {
                                        setActivePicker('from');
                                        setShowDatePicker(true);
                                    }}
                                >
                                    <Text style={styles.dateButtonText}>{formatDate(fromDate)}</Text>
                                    <MaterialIcons name="date-range" size={20} color="#007AFF" />
                                </TouchableOpacity>
                            </View>

                            {/* DateTimePicker under fromDate */}
                            {showDatePicker && activePicker === 'from' && (
                                <View style={styles.datePickerContainer}>
                                    <DateTimePicker
                                        value={fromDate}
                                        mode="date"
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            if (event.type === 'set' && selectedDate) {
                                                setFromDate(selectedDate);
                                            }
                                            setShowDatePicker(false);
                                            setActivePicker(null);
                                        }}
                                        style={styles.datePicker}
                                    />
                                </View>
                            )}

                            <View style={styles.filterRow}>
                                <Text style={styles.filterLabel}>{i18n.t('toDate')}:</Text>
                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => {
                                        setActivePicker('to');
                                        setShowDatePicker(true);
                                    }}
                                >
                                    <Text style={styles.dateButtonText}>{formatDate(toDate)}</Text>
                                    <MaterialIcons name="date-range" size={20} color="#007AFF" />
                                </TouchableOpacity>
                            </View>

                            {/* DateTimePicker under toDate */}
                            {showDatePicker && activePicker === 'to' && (
                                <View style={styles.datePickerContainer}>
                                    <DateTimePicker
                                        value={toDate}
                                        mode="date"
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            if (event.type === 'set' && selectedDate) {
                                                setToDate(selectedDate);
                                            }
                                            setShowDatePicker(false);
                                            setActivePicker(null);
                                        }}
                                        style={styles.datePicker}
                                    />
                                </View>
                            )}

                            {/* Employee Selection */}
                            <View style={styles.filterRow}>
                                <Text style={styles.filterLabel}>{i18n.t('employee')}:</Text>
                                <TouchableOpacity
                                    style={styles.employeeButton}
                                    onPress={onEmployeeTextPress}
                                >
                                    <Text style={[styles.employeeButtonText, !selectedEmployee && styles.placeholderText]}>
                                        {selectedEmployee ? selectedEmployee.name : i18n.t('selectEmployee')}
                                    </Text>
                                    <MaterialIcons name="arrow-drop-down" size={20} color="#007AFF" />
                                </TouchableOpacity>
                            </View>

                            {/* Status Selection */}
                            <View style={styles.filterRow}>
                                <Text style={styles.filterLabel}>{i18n.t('status')}:</Text>
                                <TouchableOpacity
                                    style={styles.employeeButton}
                                    onPress={() => setShowStatusDialog(true)}
                                >
                                    <Text style={styles.employeeButtonText}>
                                        {statusOptions.find(s => s.id === selectedStatus)?.name || i18n.t('all')}
                                    </Text>
                                    <MaterialIcons name="arrow-drop-down" size={20} color="#007AFF" />
                                </TouchableOpacity>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.filterButtonsRow}>
                                <TouchableOpacity
                                    style={styles.filterCancelButton}
                                    onPress={onCloseHRFilterDialog}
                                >
                                    <Text style={styles.filterCancelButtonText}>{i18n.t('cancel')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.filterSubmitButton}
                                    onPress={onSubmitHRFilter}
                                >
                                    <Text style={styles.filterSubmitButtonText}>{i18n.t('viewRequests')}</Text>
                                </TouchableOpacity>
                            </View>

                        </View>
                    </View>
                </Modal>

                {/* Employee Selection Dialog */}
                <Modal
                    visible={showEmployeeDialog}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowEmployeeDialog(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.employeeDialog}>
                            <Text style={styles.dialogTitle}>{i18n.t('selectEmployee')}</Text>

                            {loadingEmployees ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#007AFF" />
                                    <Text style={styles.loadingText}>{i18n.t('loadingEmployees')}</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={employees}
                                    keyExtractor={(item) => item.id.toString()}
                                    style={styles.employeeList}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.employeeItem}
                                            onPress={() => onEmployeeSelect(item)}
                                        >
                                            <Text style={styles.employeeItemText}>{item.name}</Text>
                                        </TouchableOpacity>
                                    )}
                                    ListEmptyComponent={() => (
                                        <Text style={styles.emptyEmployeeText}>{i18n.t('noEmployeesFound')}</Text>
                                    )}
                                />
                            )}

                            <TouchableOpacity
                                style={styles.filterCancelButton}
                                onPress={() => setShowEmployeeDialog(false)}
                            >
                                <Text style={styles.filterCancelButtonText}>{i18n.t('cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Status Selection Dialog */}
                <Modal
                    visible={showStatusDialog}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowStatusDialog(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.employeeDialog}>
                            <Text style={styles.dialogTitle}>{i18n.t('selectStatus')}</Text>

                            <FlatList
                                data={statusOptions}
                                keyExtractor={(item) => item.id}
                                style={styles.employeeList}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.employeeItem}
                                        onPress={() => onStatusSelect(item)}
                                    >
                                        <Text style={styles.employeeItemText}>{item.name}</Text>
                                    </TouchableOpacity>
                                )}
                            />

                            <TouchableOpacity
                                style={styles.filterCancelButton}
                                onPress={() => setShowStatusDialog(false)}
                            >
                                <Text style={styles.filterCancelButtonText}>{i18n.t('cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Notes Dialog */}
                <Modal
                    visible={showNotesDialog}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowNotesDialog(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.notesDialog}>
                            <Text style={styles.dialogTitle}>{i18n.t('inputNotes')}</Text>

                            <TextInput
                                style={styles.notesTextInput}
                                placeholder={i18n.t('enterNotesPlaceholder')}
                                placeholderTextColor="#999"
                                value={noteText}
                                onChangeText={setNoteText}
                                multiline={true}
                                numberOfLines={6}
                                textAlignVertical="top"
                                editable={!isSubmittingNote}
                            />

                            <View style={styles.notesButtonsRow}>
                                <TouchableOpacity
                                    style={styles.filterCancelButton}
                                    onPress={() => {
                                        setShowNotesDialog(false);
                                        setNoteText('');
                                    }}
                                    disabled={isSubmittingNote}
                                >
                                    <Text style={styles.filterCancelButtonText}>{i18n.t('cancel')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.filterSubmitButton, isSubmittingNote && styles.filterSubmitButtonDisabled]}
                                    onPress={handleSendNote}
                                    disabled={isSubmittingNote || !noteText.trim()}
                                >
                                    {isSubmittingNote ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator size="small" color="#fff" />
                                            <Text style={[styles.filterSubmitButtonText, { marginLeft: 8 }]}>
                                                {i18n.t('sending')}
                                            </Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.filterSubmitButtonText}>{i18n.t('send')}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#e1e7f0',
    },
    container: {
        flex: 1,
        backgroundColor: '#e1e7f0',
        paddingHorizontal: 20,
    },
    headerSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        backgroundColor: 'white',
        borderRadius: 16,
        marginTop: 8,
        marginBottom: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        width: 68,
        height: 68,
        marginRight: 12,
    },
    appName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2C3E50',
    },
    userInfoContainer: {
        alignItems: 'flex-end',
    },
    welcomeText: {
        fontSize: 12,
        color: '#7F8C8D',
        fontWeight: '500',
    },
    usernameText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 4,
    },
    timeText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#3498DB',
        marginBottom: 2,
    },
    dateText: {
        fontSize: 12,
        color: '#7F8C8D',
        fontWeight: '500',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingBottom: 60, // Reduced space for footer
        paddingTop: 10, // Add small top padding
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
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        elevation: 4,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(102, 126, 234, 0.1)',
        minHeight: 58,
    },
    optionButtonIcon: {
        marginRight: 15,
        backgroundColor: 'rgba(102, 126, 234, 0.12)',
        borderRadius: 12,
        padding: 10,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(102, 126, 234, 0.2)',
    },
    optionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C1C1E',
        flex: 1,
        lineHeight: 20,
    },
    optionDescription: {
        fontSize: 14,
        color: '#666',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 22 : 18,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(15px)',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(102, 126, 234, 0.08)',
    },
    footerButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        marginHorizontal: 4,
    },
    footerButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    footerButtonText: {
        color: '#2C3E50',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 3,
        letterSpacing: 0.2,
    },
    versionContainer: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
    },
    versionText: {
        color: '#7F8C8D',
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.5,
        opacity: 0.8,
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
    pickerContainer: {
        width: '100%',
        marginBottom: 20,
        zIndex: 3000,
    },
    pickerLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    dropdown: {
        borderColor: '#E5E5EA',
        borderRadius: 8,
        backgroundColor: '#F9F9F9',
        minHeight: 50,
    },
    dropdownContainer: {
        borderColor: '#E5E5EA',
        backgroundColor: '#F9F9F9',
        borderRadius: 8,
    },
    dropdownText: {
        fontSize: 16,
        color: '#333',
    },
    locationInfo: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
        fontStyle: 'italic',
    },
    // HR Filter Dialog Styles
    filterDialog: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    filterRow: {
        marginBottom: 16,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2C3E50',
        marginBottom: 8,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#F9F9F9',
    },
    dateButtonText: {
        fontSize: 16,
        color: '#2C3E50',
    },
    employeeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#F9F9F9',
    },
    employeeButtonText: {
        fontSize: 16,
        color: '#2C3E50',
    },
    placeholderText: {
        color: '#999',
    },
    filterButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    filterCancelButton: {
        backgroundColor: '#E5E5EA',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginRight: 8,
        alignItems: 'center',
    },
    filterCancelButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '500',
    },
    filterSubmitButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        flex: 1,
        marginLeft: 8,
        alignItems: 'center',
    },
    filterSubmitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Employee Dialog Styles
    employeeDialog: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    employeeList: {
        maxHeight: 300,
        marginBottom: 16,
    },
    employeeItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    employeeItemText: {
        fontSize: 16,
        color: '#2C3E50',
    },
    emptyEmployeeText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 16,
        padding: 20,
    },
    datePickerContainer: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        marginHorizontal: 10,
        marginVertical: 5,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        overflow: 'hidden',
    },
    datePicker: {
        backgroundColor: '#FFFFFF',
    },
    notesDialog: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    notesTextInput: {
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#F8F9FA',
        minHeight: 120,
        maxHeight: 200,
        marginVertical: 15,
    },
    notesButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    filterSubmitButtonDisabled: {
        backgroundColor: '#BDC3C7',
        opacity: 0.6,
    },
});