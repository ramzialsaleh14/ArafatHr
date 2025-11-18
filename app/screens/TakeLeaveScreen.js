import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, Platform, ScrollView, TextInput, Dimensions, Modal, Keyboard } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import AttachmentPicker from '../components/AttachmentPicker';
import i18n from '../languages/langStrings';
import * as Commons from '../utils/Commons';
import * as ServerOperations from '../utils/ServerOperations';
import * as Constants from '../utils/Constants';

export default function TakeLeaveScreen({ navigation }) {
    const [currentLanguage, setCurrentLanguage] = useState(i18n.locale || 'en');
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [selectedLeaveType, setSelectedLeaveType] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownValue, setDropdownValue] = useState(null);
    const [dropdownItems, setDropdownItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedAttachments, setSelectedAttachments] = useState([]);
    const [note, setNote] = useState('');
    const pickerRef = useRef(null);
    const [pickerY, setPickerY] = useState(0);
    // Date and time state variables
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());
    const [fromTime, setFromTime] = useState(new Date());
    const [toTime, setToTime] = useState(new Date());
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [showFromTimePicker, setShowFromTimePicker] = useState(false);
    const [showToTimePicker, setShowToTimePicker] = useState(false);
    // Temporary states for iOS picker browsing
    const [tempFromDate, setTempFromDate] = useState(new Date());
    const [tempToDate, setTempToDate] = useState(new Date());
    const [tempFromTime, setTempFromTime] = useState(new Date());
    const [tempToTime, setTempToTime] = useState(new Date());

    // Date exclusion state variables
    const [excludeEarlyFrom, setExcludeEarlyFrom] = useState(null);
    const [excludeEarlyTo, setExcludeEarlyTo] = useState(null);
    const [excludeLateFrom, setExcludeLateFrom] = useState(null);
    const [excludeLateTo, setExcludeLateTo] = useState(null);
    const [hasExclusionRules, setHasExclusionRules] = useState(false);
    const [excludeThSat, setExcludeThSat] = useState(false);

    const getLeaveTypes = async () => {
        try {
            setIsLoading(true);
            const response = await ServerOperations.getLeaveTypes();

            if (response && Array.isArray(response)) {
                setLeaveTypes(response);

                // Set up dropdown items
                const items = response.map(leaveType => ({
                    label: leaveType.desc,
                    value: leaveType.id,
                    leaveType: leaveType
                }));
                setDropdownItems(items);

                // Set the first leave type as default if available
                if (response.length > 0) {
                    setSelectedLeaveType(response[0]);
                    setDropdownValue(response[0].id);
                }
            }
        } catch (error) {
            console.error("Error getting leave types:", error);
            Alert.alert(i18n.t('error'), i18n.t('failedToLoadLeaveTypes'));
        } finally {
            setIsLoading(false);
        }
    };

    const getUserGroupDetails = async () => {
        try {
            const user = await Commons.getFromAS("userID");
            if (!user) return;

            const response = await ServerOperations.getUserGroupDetails(user);

            if (response && response.res === 'ok') {
                setExcludeEarlyFrom(response.EXCLUDE_EARLY_FROM);
                setExcludeEarlyTo(response.EXCLUDE_EARLY_TO);
                setExcludeLateFrom(response.EXCLUDE_LATE_FROM);
                setExcludeLateTo(response.EXCLUDE_LATE_TO);
                setExcludeThSat(!!response.EXCLUDE_TH_SAT);
                setHasExclusionRules(true);
                console.log('Group exclusion rules loaded:', {
                    earlyFrom: response.EXCLUDE_EARLY_FROM,
                    earlyTo: response.EXCLUDE_EARLY_TO,
                    lateFrom: response.EXCLUDE_LATE_FROM,
                    lateTo: response.EXCLUDE_LATE_TO,
                    excludeThSat: response.EXCLUDE_TH_SAT
                });

                // Reset dates to valid ones after exclusion rules are loaded
                setTimeout(() => {
                    resetDateTimeSelections();
                }, 100);
            } else if (response && response.res === 'noGroup') {
                // No group exclusion rules, keep everything the same
                setHasExclusionRules(false);
                setExcludeThSat(false);
                console.log('No group exclusion rules found');
            }
        } catch (error) {
            console.error("Error getting user group details:", error);
            setHasExclusionRules(false);
            setExcludeThSat(false);
        }
    }; const isDateDisabled = (date) => {
        if (!hasExclusionRules) return false;

        const day = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();
        const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

        // Disable past dates (earlier than today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateStartOfDay = new Date(date);
        dateStartOfDay.setHours(0, 0, 0, 0);
        if (dateStartOfDay < today) {
            return true;
        }

        // Get the last day of the month
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

        // Exclude Thursdays and Saturdays if flag is enabled
        if (excludeThSat && (dayOfWeek === 4 || dayOfWeek === 6)) {
            return true;
        }

        // Check early exclusion (beginning of month)
        if (excludeEarlyFrom !== null && excludeEarlyTo !== null) {
            if (day >= excludeEarlyFrom && day <= excludeEarlyTo) {
                return true;
            }
        }

        // Check late exclusion (end of month)
        if (excludeLateFrom !== null && excludeLateTo !== null) {
            let lateToDay = excludeLateTo;

            // If excludeLateTo is 30, make it end of month (30 or 31 depending on the month)
            if (excludeLateTo === 30) {
                lateToDay = lastDayOfMonth;
            }

            if (day >= excludeLateFrom && day <= lateToDay) {
                return true;
            }
        }

        return false;
    };

    const handleDateChange = (selectedDate, setDate, setTempDate, isTemp = false, isFromDate = false) => {
        if (selectedDate && isDateDisabled(selectedDate)) {
            Alert.alert(
                i18n.t('error'),
                i18n.t('dateNotAllowed') || 'This date is not allowed for leave requests.',
                [{ text: i18n.t('ok') || 'OK' }]
            );
            return;
        }

        if (isTemp) {
            setTempDate(selectedDate);
            // For iOS temporary dates, also sync toDate when fromDate changes
            if (isFromDate) {
                setTempToDate(selectedDate);
            }
        } else {
            setDate(selectedDate);
            // Automatically set toDate to match fromDate when fromDate changes
            if (isFromDate) {
                setToDate(selectedDate);
            }
        }
    };

    const handleAttachmentSelected = (filename) => {
        // Keep backward compatibility
        console.log('Single attachment selected:', filename);
    };

    const handleAttachmentsChanged = (attachments) => {
        setSelectedAttachments(attachments);
        console.log('Attachments updated:', attachments);
    };

    const clearAttachment = () => {
        setSelectedAttachments([]);
    };

    // Date and time helper functions
    const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const resetDateTimeSelections = () => {
        const now = new Date();

        // Find a valid date that's not excluded
        let validDate = new Date(now);
        if (hasExclusionRules && isDateDisabled(validDate)) {
            // Try to find the next valid date within the current month
            validDate = findNextValidDate(now);
        }

        setFromDate(validDate);
        setToDate(validDate);
        setFromTime(now);
        setToTime(now);
    };

    const findNextValidDate = (startDate) => {
        const currentMonth = startDate.getMonth();
        const currentYear = startDate.getFullYear();

        // Try next 31 days to find a valid date
        for (let i = 0; i < 31; i++) {
            const testDate = new Date(startDate);
            testDate.setDate(startDate.getDate() + i);

            // If we've moved to the next month, try the first day of next month
            if (testDate.getMonth() !== currentMonth) {
                const nextMonth = new Date(currentYear, currentMonth + 1, 1);
                if (!isDateDisabled(nextMonth)) {
                    return nextMonth;
                }
            }

            if (!isDateDisabled(testDate)) {
                return testDate;
            }
        }

        // If no valid date found, return the original date
        // (user will get validation error when trying to submit)
        return startDate;
    };

    const validateDateTimeSelections = () => {
        if (!selectedLeaveType) {
            return false;
        }

        const item = selectedLeaveType;

        if (item.holidayOrLeave === 'اجازة') {
            // For holidays, both from and to dates are required
            return fromDate && toDate && fromDate <= toDate;
        } else {
            // For leaves, date and both times are required
            console.log('Validating date/time:', { fromDate, fromTime, toTime });
            return fromDate && fromTime && toTime && fromTime < toTime;
        }
    };

    useEffect(() => {
        getLeaveTypes();
        getUserGroupDetails();
    }, []);
    useEffect(() => {
        if (pickerRef.current) {
            pickerRef.current.measure((fx, fy, width, height, px, py) => {
                setPickerY(py - 30); // py is the Y position, height is the picker height
            });
        }
    }, [dropdownOpen]);

    const handleSubmitLeave = async () => {
        if (!selectedLeaveType) {
            Alert.alert(i18n.t('error'), i18n.t('pleaseSelectLeaveType'));
            return;
        }

        if (!validateDateTimeSelections()) {
            const item = selectedLeaveType;
            console.log('Invalid date/time selection for item:', item);

            let errorMessage;
            if (item?.holidayOrLeave === 'اجازة') {
                errorMessage = i18n.t('pleaseSelectValidDates');
            } else {
                // Check if it's specifically a time range issue
                const fromTimeMinutes = fromTime.getHours() * 60 + fromTime.getMinutes();
                const toTimeMinutes = toTime.getHours() * 60 + toTime.getMinutes();

                if (fromTimeMinutes >= toTimeMinutes) {
                    errorMessage = i18n.t('fromTimeMustBeEarlier');
                } else {
                    errorMessage = i18n.t('pleaseSelectValidDateTimeRange');
                }
            }
            Alert.alert(i18n.t('error'), errorMessage, [{ text: i18n.t('ok') }]);
            return;
        }

        // Validate that selected dates are not excluded
        if (isDateDisabled(fromDate)) {
            Alert.alert(
                i18n.t('error'),
                i18n.t('dateNotAllowed') || 'This date is not allowed for leave requests.',
                [{ text: i18n.t('ok') || 'OK' }]
            );
            return;
        }

        // For holidays, also check the toDate
        if (selectedLeaveType.holidayOrLeave === 'اجازة' && isDateDisabled(toDate)) {
            Alert.alert(
                i18n.t('error'),
                i18n.t('dateNotAllowed') || 'This date is not allowed for leave requests.',
                [{ text: i18n.t('ok') || 'OK' }]
            );
            return;
        }

        if (selectedLeaveType.attachmentRequired && selectedAttachments.length === 0) {
            Alert.alert(i18n.t('error'), i18n.t('attachmentRequired'));
            return;
        }

        setIsProcessing(true);
        try {
            // Format dates and times for server
            const formatDateForServer = (date) => {
                return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            };

            const formatTimeForServer = (time) => {
                return `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
            };
            const curUser = await Commons.getFromAS("userID");

            // Prepare attachments string
            const attachmentsString = Array.isArray(selectedAttachments)
                ? selectedAttachments.map(attachment => attachment.filename || attachment.name || attachment).join('@@')
                : (selectedAttachments || '');

            // Call the server function
            const result = await ServerOperations.submitLeaveRequest(
                selectedLeaveType.id,
                formatDateForServer(fromDate),
                formatDateForServer(toDate),
                formatTimeForServer(fromTime),
                formatTimeForServer(toTime),
                note,
                attachmentsString,
                curUser
            );

            // Check if request failed (network error or server error)
            if (!result) {
                Alert.alert(
                    i18n.t('error'),
                    i18n.t('failedToSubmitLeave'),
                    [{ text: i18n.t('ok') }]
                );
                return;
            }

            // Handle response
            if (result.res) {
                Alert.alert(
                    i18n.t('success'),
                    i18n.t('leaveRequestSubmitted'),
                    [
                        { text: i18n.t('ok'), onPress: () => navigation.goBack() }
                    ]
                );
            } else {
                Alert.alert(
                    i18n.t('error'),
                    result.msg || i18n.t('failedToSubmitLeave'),
                    [{ text: i18n.t('ok') }]
                );
            }
        } catch (error) {
            console.error("Error submitting leave:", error);
            Alert.alert(i18n.t('error'), i18n.t('failedToSubmitLeave'));
        } finally {
            setIsProcessing(false);
        }
    };

    const onGoBack = () => {
        setDropdownOpen(false);
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
                    <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{i18n.t('takeLeaveTitle')}</Text>
                <View style={styles.placeholder} />
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>{i18n.t('loadingLeaveTypes')}</Text>
                </View>
            ) : (
                <View style={styles.content}>
                    <Text style={styles.instructionText}>{i18n.t('selectLeaveTypeInstruction')}</Text>

                    {/* Leave Type Picker */}
                    <View ref={pickerRef} style={styles.pickerContainer}>
                        <DropDownPicker
                            open={dropdownOpen}
                            value={dropdownValue}
                            items={dropdownItems}
                            setOpen={setDropdownOpen}
                            setValue={setDropdownValue}
                            setItems={setDropdownItems}
                            onChangeValue={(value) => {
                                const selected = leaveTypes.find(type => type.id === value);
                                setSelectedLeaveType(selected);
                                setSelectedAttachments([]);
                                resetDateTimeSelections();
                            }}
                            disabled={isProcessing}
                            placeholder={i18n.t('selectLeaveType')}
                            style={styles.dropdown}
                            dropDownContainerStyle={[
                                styles.dropdownContainer,
                                { maxHeight: Dimensions.get("window").height * 0.5 }
                            ]}
                            textStyle={styles.dropdownText}
                            zIndex={3000}
                            zIndexInverse={1000}
                            searchable={true}
                            searchPlaceholder="اختر نوع الاجازة/المغادرة"
                            listMode="MODAL"
                            modalProps={{
                                transparent: true,
                                animationType: 'fade',
                                presentationStyle: Platform.OS === 'ios' ? 'overFullScreen' : undefined,
                            }}
                            modalContentContainerStyle={{
                                position: 'absolute',
                                left: '5%',
                                width: '90%',
                                maxHeight: Dimensions.get('window').height * 0.5,
                                top: pickerY, // Adjust this value to match the vertical position of your picker
                                backgroundColor: '#fff',
                                borderRadius: 16,
                                padding: 12,
                                elevation: 8,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.2,
                                shadowRadius: 6,
                            }}
                            closeOnBackPressed={true}
                            closeOnBackdropPress={true}
                        />
                    </View>

                    {/* Scrollable Content Area */}
                    <ScrollView
                        style={styles.scrollableSection}
                        contentContainerStyle={styles.scrollableContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        scrollEnabled={!dropdownOpen}
                    >
                        {/* Date Exclusion Info */}
                        {selectedLeaveType && hasExclusionRules && (
                            <View style={styles.exclusionInfoContainer}>
                                <Text style={styles.exclusionInfoTitle}>{i18n.t('dateRestrictions') || 'Date Restrictions'}</Text>
                                <Text style={styles.exclusionInfoText}>
                                    {i18n.t('excludedDatesInfo') || 'Some dates may not be available for leave requests due to company policy.'}
                                </Text>
                                {excludeThSat && (
                                    <Text style={styles.exclusionDetailText}>
                                        • {i18n.t('weeklyThuSat') || 'Weekly: Days Thu, Sat'}
                                    </Text>
                                )}
                                {(excludeEarlyFrom !== null && excludeEarlyTo !== null) && (
                                    <Text style={styles.exclusionDetailText}>
                                        • {i18n.t('earlyMonth') || 'Early month'}: {i18n.t('days')} {excludeEarlyFrom}-{excludeEarlyTo}
                                    </Text>
                                )}
                                {(excludeLateFrom !== null && excludeLateTo !== null) && (
                                    <Text style={styles.exclusionDetailText}>
                                        • {i18n.t('lateMonth') || 'Late month'}: {i18n.t('days')} {excludeLateFrom}-{(() => {
                                            if (excludeLateTo === 30) {
                                                return i18n.t('endOfMonth') || 'end of month';
                                            } else if (excludeLateTo === 31) {
                                                // Get current month's last day
                                                const currentMonth = new Date().getMonth();
                                                const currentYear = new Date().getFullYear();
                                                const lastDayOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                                                return lastDayOfCurrentMonth < 31 ? lastDayOfCurrentMonth : excludeLateTo;
                                            } else {
                                                return excludeLateTo;
                                            }
                                        })()}
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Date and Time Selection - Show based on holidayOrLeave */}
                        {selectedLeaveType && (
                            <View style={styles.dateTimeContainer}>
                                {selectedLeaveType.holidayOrLeave === 'اجازة' ? (
                                    // Holiday: From Date to To Date
                                    <View>
                                        <Text style={styles.sectionLabel}>{i18n.t('selectDateRange')}</Text>

                                        <View style={styles.dateColumn}>
                                            <Text style={styles.dateLabel}>{i18n.t('fromDate')}</Text>
                                            <TouchableOpacity
                                                style={styles.dateButton}
                                                onPress={() => {
                                                    setTempFromDate(fromDate);
                                                    setShowFromDatePicker(true);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.iconContainer}>
                                                    <MaterialIcons name="date-range" size={22} color="#007AFF" />
                                                </View>
                                                <Text style={styles.dateButtonText}>{formatDate(fromDate)}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.dateColumn}>
                                            <Text style={styles.dateLabel}>{i18n.t('toDate')}</Text>
                                            <TouchableOpacity
                                                style={styles.dateButton}
                                                onPress={() => {
                                                    setTempToDate(toDate);
                                                    setShowToDatePicker(true);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.iconContainer}>
                                                    <MaterialIcons name="date-range" size={22} color="#007AFF" />
                                                </View>
                                                <Text style={styles.dateButtonText}>{formatDate(toDate)}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    // Leave: Date + From Time to To Time
                                    <View>
                                        <Text style={styles.sectionLabel}>{i18n.t('selectDateTime')}</Text>

                                        <View style={styles.dateTimeRow}>
                                            <View style={styles.fullWidth}>
                                                <Text style={styles.dateLabel}>{i18n.t('date')}</Text>
                                                <TouchableOpacity
                                                    style={styles.dateButton}
                                                    onPress={() => {
                                                        setTempFromDate(fromDate);
                                                        setShowFromDatePicker(true);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.iconContainer}>
                                                        <MaterialIcons name="date-range" size={22} color="#007AFF" />
                                                    </View>
                                                    <Text style={styles.dateButtonText}>{formatDate(fromDate)}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={styles.timeRow}>
                                            <View style={styles.timeColumn}>
                                                <Text style={styles.dateLabel}>{i18n.t('fromTime')}</Text>
                                                <TouchableOpacity
                                                    style={styles.timeButton}
                                                    onPress={() => {
                                                        setTempFromTime(fromTime);
                                                        setShowFromTimePicker(true);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.iconContainer}>
                                                        <MaterialIcons name="access-time" size={22} color="#007AFF" />
                                                    </View>
                                                    <Text style={styles.timeButtonText}>{formatTime(fromTime)}</Text>
                                                </TouchableOpacity>
                                            </View>

                                            <View style={styles.timeColumn}>
                                                <Text style={styles.dateLabel}>{i18n.t('toTime')}</Text>
                                                <TouchableOpacity
                                                    style={styles.timeButton}
                                                    onPress={() => {
                                                        setTempToTime(toTime);
                                                        setShowToTimePicker(true);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.iconContainer}>
                                                        <MaterialIcons name="access-time" size={22} color="#007AFF" />
                                                    </View>
                                                    <Text style={styles.timeButtonText}>{formatTime(toTime)}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Notes Field */}
                        {selectedLeaveType && (
                            <View style={styles.notesContainer}>
                                <Text style={styles.notesLabel}>{i18n.t('note')}</Text>
                                <TextInput
                                    style={styles.notesInput}
                                    value={note}
                                    onChangeText={setNote}
                                    placeholder={i18n.t('enterNote')}
                                    placeholderTextColor="#999"
                                    multiline={true}
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>
                        )}

                        {/* Attachment Picker - Only show if attachment is required */}
                        {selectedLeaveType && selectedLeaveType.attachmentRequired && (
                            <View style={styles.attachmentContainer}>
                                <Text style={styles.attachmentLabel}>{i18n.t('attachmentRequired')} *</Text>

                                <AttachmentPicker
                                    onAttachmentSelected={handleAttachmentSelected}
                                    onAttachmentsChanged={handleAttachmentsChanged}
                                />
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
                            onPress={handleSubmitLeave}
                            disabled={isProcessing || !selectedLeaveType}
                            activeOpacity={0.8}
                        >
                            {isProcessing ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color="#fff" />
                                    <Text style={styles.submitButtonText}>{i18n.t('processing')}</Text>
                                </View>
                            ) : (
                                <Text style={styles.submitButtonText}>{i18n.t('submitLeaveRequest')}</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            )}

            {/* Date Time Pickers */}
            {showFromDatePicker && (
                Platform.OS === 'ios' ? (
                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={showFromDatePicker}
                        onRequestClose={() => setShowFromDatePicker(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity
                                        style={styles.modalButton}
                                        onPress={() => setShowFromDatePicker(false)}
                                    >
                                        <Text style={styles.modalButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.modalTitle}>Select Date</Text>
                                    <TouchableOpacity
                                        style={styles.modalButton}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            if (!isDateDisabled(tempFromDate)) {
                                                setFromDate(tempFromDate);
                                                setToDate(tempFromDate); // Automatically set toDate to match fromDate
                                                setShowFromDatePicker(false);
                                            } else {
                                                Alert.alert(
                                                    i18n.t('error'),
                                                    i18n.t('dateNotAllowed') || 'This date is not allowed for leave requests.',
                                                    [{ text: i18n.t('ok') || 'OK' }]
                                                );
                                            }
                                        }}
                                    >
                                        <Text style={[styles.modalButtonText, { color: '#007AFF' }]}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={tempFromDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={(event, selectedDate) => {
                                        if (selectedDate) {
                                            handleDateChange(selectedDate, setFromDate, setTempFromDate, true, true);
                                        }
                                    }}
                                    style={styles.datePicker}
                                />
                            </View>
                        </View>
                    </Modal>
                ) : (
                    <DateTimePicker
                        value={fromDate}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowFromDatePicker(false);
                            if (selectedDate) {
                                handleDateChange(selectedDate, setFromDate, setTempFromDate, false, true);
                            }
                        }}
                    />
                )
            )}

            {showToDatePicker && (
                Platform.OS === 'ios' ? (
                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={showToDatePicker}
                        onRequestClose={() => setShowToDatePicker(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity
                                        style={styles.modalButton}
                                        onPress={() => setShowToDatePicker(false)}
                                    >
                                        <Text style={styles.modalButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.modalTitle}>Select Date</Text>
                                    <TouchableOpacity
                                        style={styles.modalButton}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            if (!isDateDisabled(tempToDate)) {
                                                setToDate(tempToDate);
                                                setShowToDatePicker(false);
                                            } else {
                                                Alert.alert(
                                                    i18n.t('error'),
                                                    i18n.t('dateNotAllowed') || 'This date is not allowed for leave requests.',
                                                    [{ text: i18n.t('ok') || 'OK' }]
                                                );
                                            }
                                        }}
                                    >
                                        <Text style={[styles.modalButtonText, { color: '#007AFF' }]}>{i18n.t("done")}</Text>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={tempToDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={(event, selectedDate) => {
                                        if (selectedDate) {
                                            handleDateChange(selectedDate, setToDate, setTempToDate, true);
                                        }
                                    }}
                                    style={styles.datePicker}
                                />
                            </View>
                        </View>
                    </Modal>
                ) : (
                    <DateTimePicker
                        value={toDate}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowToDatePicker(false);
                            if (selectedDate) {
                                handleDateChange(selectedDate, setToDate, setTempToDate, false);
                            }
                        }}
                    />
                )
            )}

            {showFromTimePicker && (
                Platform.OS === 'ios' ? (
                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={showFromTimePicker}
                        onRequestClose={() => setShowFromTimePicker(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity
                                        style={styles.modalButton}
                                        onPress={() => setShowFromTimePicker(false)}
                                    >
                                        <Text style={styles.modalButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.modalTitle}>Select Time</Text>
                                    <TouchableOpacity
                                        style={styles.modalButton}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            setFromTime(tempFromTime);
                                            setShowFromTimePicker(false);
                                        }}
                                    >
                                        <Text style={[styles.modalButtonText, { color: '#007AFF' }]}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={tempFromTime}
                                    mode="time"
                                    display="spinner"
                                    onChange={(event, selectedTime) => {
                                        if (selectedTime) {
                                            setTempFromTime(selectedTime);
                                        }
                                    }}
                                    style={styles.datePicker}
                                />
                            </View>
                        </View>
                    </Modal>
                ) : (
                    <DateTimePicker
                        value={fromTime}
                        mode="time"
                        display="default"
                        onChange={(event, selectedTime) => {
                            setShowFromTimePicker(false);
                            if (selectedTime) {
                                setFromTime(selectedTime);
                            }
                        }}
                    />
                )
            )}

            {showToTimePicker && (
                Platform.OS === 'ios' ? (
                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={showToTimePicker}
                        onRequestClose={() => setShowToTimePicker(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity
                                        style={styles.modalButton}
                                        onPress={() => setShowToTimePicker(false)}
                                    >
                                        <Text style={styles.modalButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.modalTitle}>Select Time</Text>
                                    <TouchableOpacity
                                        style={styles.modalButton}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            setToTime(tempToTime);
                                            setShowToTimePicker(false);
                                        }}
                                    >
                                        <Text style={[styles.modalButtonText, { color: '#007AFF' }]}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={tempToTime}
                                    mode="time"
                                    display="spinner"
                                    onChange={(event, selectedTime) => {
                                        if (selectedTime) {
                                            setTempToTime(selectedTime);
                                        }
                                    }}
                                    style={styles.datePicker}
                                />
                            </View>
                        </View>
                    </Modal>
                ) : (
                    <DateTimePicker
                        value={toTime}
                        mode="time"
                        display="default"
                        onChange={(event, selectedTime) => {
                            setShowToTimePicker(false);
                            if (selectedTime) {
                                setToTime(selectedTime);
                            }
                        }}
                    />
                )
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    scrollableSection: {
        flex: 1,
        marginTop: 10,
    },
    scrollableContent: {
        paddingBottom: 30,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    instructionText: {
        fontSize: 17,
        color: '#5D6D7E',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
        fontWeight: '500',
        paddingHorizontal: 10,
    },
    pickerContainer: {
        marginBottom: 25,
        zIndex: 3000,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 3,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    pickerLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    dropdown: {
        borderColor: '#E5E5EA',
        borderRadius: 10,
        backgroundColor: '#fff',
        minHeight: 55,
        borderWidth: 1.5,
        paddingHorizontal: 15,
    },
    dropdownContainer: {
        borderColor: '#E5E5EA',
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
    },
    dropdownText: {
        fontSize: 16,
        color: '#2C3E50',
        fontWeight: '500',
    },
    selectedTypeInfo: {
        backgroundColor: '#E8F4FD',
        padding: 15,
        borderRadius: 8,
        marginBottom: 30,
    },
    selectedTypeText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '500',
        textAlign: 'center',
    },

    // Notes Field Styles
    notesContainer: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    notesLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2C3E50',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    notesInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E3E8ED',
        padding: 15,
        fontSize: 16,
        color: '#2C3E50',
        minHeight: 100,
        maxHeight: 150,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    attachmentContainer: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    attachmentLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2C3E50',
        marginBottom: 15,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    submitButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 30,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
        shadowColor: '#007AFF',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#BDC3C7',
        shadowOpacity: 0.1,
        elevation: 2,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    // Date/Time Container Styles
    dateTimeContainer: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2C3E50',
        marginBottom: 15,
        textAlign: 'center',
        letterSpacing: 0.5,
    },

    // Holiday Date Selection Styles
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    dateColumn: {
        width: '100%',
        marginBottom: 15,
    },
    dateLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#34495E',
        marginBottom: 10,
        textAlign: 'center',
    },
    dateButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 15,
        borderWidth: 1.5,
        borderColor: '#E3E8ED',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
        minHeight: 55,
    },
    dateButtonText: {
        fontSize: 15,
        color: '#2C3E50',
        fontWeight: '500',
        marginLeft: 10,
        textAlign: 'center',
    },

    // Leave Date and Time Selection Styles
    dateTimeRow: {
        marginBottom: 20,
    },
    fullWidth: {
        width: '100%',
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
        marginTop: 15,
    },
    timeColumn: {
        flex: 1,
    },
    timeButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 15,
        borderWidth: 1.5,
        borderColor: '#E3E8ED',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
        minHeight: 55,
    },
    timeButtonText: {
        fontSize: 15,
        color: '#2C3E50',
        fontWeight: '500',
        marginLeft: 10,
        textAlign: 'center',
    },

    // Active/Pressed States
    buttonPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },

    // Enhanced Visual Elements
    iconContainer: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Loading and Processing States
    processingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },

    // Legacy Date/Time Picker Styles (kept for compatibility)
    dateTimeSection: {
        marginTop: 20,
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 15,
    },
    dateTimeSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
        textAlign: 'center',
    },
    dateTimeItem: {
        flex: 1,
        marginHorizontal: 5,
    },
    dateTimeLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
        marginBottom: 8,
    },
    dateTimeButton: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateTimeIcon: {
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '85%',
        maxWidth: 350,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
        backgroundColor: '#F8F8F8',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    modalButton: {
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    modalButtonText: {
        fontSize: 16,
        color: '#333',
    },
    datePicker: {
        backgroundColor: '#fff',
    },

    // Date Exclusion Info Styles
    exclusionInfoContainer: {
        backgroundColor: '#FFF3CD',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        borderLeftWidth: 4,
        borderLeftColor: '#FF9500',
    },
    exclusionInfoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#B76E00',
        marginBottom: 6,
    },
    exclusionInfoText: {
        fontSize: 13,
        color: '#B76E00',
        marginBottom: 8,
        lineHeight: 18,
    },
    exclusionDetailText: {
        fontSize: 12,
        color: '#B76E00',
        marginBottom: 2,
        fontWeight: '500',
    },
});