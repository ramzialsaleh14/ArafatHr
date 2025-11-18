import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, Alert, RefreshControl, Linking, Modal, TextInput, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import i18n from '../languages/langStrings';
import * as Commons from '../utils/Commons';
import * as ServerOperations from '../utils/ServerOperations';
import * as Constants from '../utils/Constants';

export default function PendingRequestsScreen({ navigation }) {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showResponseDialog, setShowResponseDialog] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [responseNotes, setResponseNotes] = useState('');
    const [respondingToRequest, setRespondingToRequest] = useState(false);

    // Leaves Info Modal States
    const [openInfoModal, setOpenInfoModal] = useState(false);
    const [infoList, setInfoList] = useState([]);
    const [infoUser, setInfoUser] = useState('');
    const [infoTotLoans, setInfoTotLoans] = useState('');
    const [infoTotSickLoans, setInfoTotSickLoans] = useState('');
    const [infoUsedLoans, setInfoUsedLoans] = useState('');
    const [infoUsedSickLoans, setInfoUsedSickLoans] = useState('');
    const [loadingLeavesInfo, setLoadingLeavesInfo] = useState(false);

    const loadPendingRequests = async () => {
        try {
            const user = await Commons.getFromAS("userID");
            const response = await ServerOperations.getPendingRequests(user);

            if (response && Array.isArray(response)) {
                setPendingRequests(response);
            } else {
                setPendingRequests([]);
            }
        } catch (error) {
            console.error("Error loading pending requests:", error);
            Alert.alert(i18n.t('error'), i18n.t('failedToLoadPendingRequests'));
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadPendingRequests();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadPendingRequests();
    };

    const handleAttachmentPress = (filename) => {
        const attachmentUrl = `${Constants.attachmentPath}/${filename}`;
        Linking.openURL(attachmentUrl).catch((err) => {
            console.error("Failed to open attachment:", err);
            Alert.alert(i18n.t('error'), i18n.t('failedToOpenAttachment'));
        });
    };

    const handleRequestPress = (request) => {
        setSelectedRequest(request);
        setResponseNotes('');
        setShowResponseDialog(true);
    };

    const handleResponseSubmit = async (response) => {
        if (!selectedRequest) return;

        setRespondingToRequest(true);
        const user = await Commons.getFromAS("userID");
        try {
            const result = await ServerOperations.respondToRequest(
                selectedRequest.id,
                response,
                responseNotes,
                user
            );

            if (result) {
                // Update the request status locally
                setPendingRequests(prevRequests =>
                    prevRequests.map(req =>
                        req.id === selectedRequest.id
                            ? { ...req, status: response }
                            : req
                    )
                );

                setShowResponseDialog(false);
                Alert.alert(i18n.t('success'), i18n.t('responseSubmittedSuccessfully'));
            } else {
                Alert.alert(i18n.t('error'), i18n.t('failedToSubmitResponse'));
            }
        } catch (error) {
            console.error("Error responding to request:", error);
            Alert.alert(i18n.t('error'), i18n.t('failedToSubmitResponse'));
        } finally {
            setRespondingToRequest(false);
        }
    };

    const closeResponseDialog = () => {
        setShowResponseDialog(false);
        setSelectedRequest(null);
        setResponseNotes('');
    };

    const setLeavesInfo = async (user) => {
        setLoadingLeavesInfo(true);
        try {
            const info = await ServerOperations.getLeavesInfo(user);
            if (info && info.length > 0) {
                setInfoUser(info[0].userName);
                setInfoTotLoans(info[0].totLoans);
                setInfoTotSickLoans(info[0].totSickLoans);
                setInfoUsedLoans(info[0].usedLoans);
                setInfoUsedSickLoans(info[0].usedSickLoans);
                setInfoList(info);
                setOpenInfoModal(true);
            }
        } catch (error) {
            console.error("Error loading leaves info:", error);
            Alert.alert(i18n.t('error'), i18n.t('failedToLoadLeavesInfo'));
        } finally {
            setLoadingLeavesInfo(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return '#FF9500';
            case 'approved':
                return '#34C759';
            case 'rejected':
                return '#FF3B30';
            default:
                return '#8E8E93';
        }
    };

    const renderRequestItem = ({ item }) => (
        <TouchableOpacity
            style={styles.requestCard}
            onPress={() => handleRequestPress(item)}
            disabled={item.status.toLowerCase() !== 'pending'}
        >
            <View style={styles.requestHeader}>
                <View style={styles.requestTypeContainer}>
                    <Text style={styles.requestType}>{item.reqType}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.requestBody}>
                <View style={styles.dateTimeSection}>
                    <View style={styles.dateTimeRow}>
                        <MaterialIcons name="date-range" size={20} color="#007AFF" />
                        <Text style={styles.dateTimeLabel}>{i18n.t('fromDate')}:</Text>
                        <Text style={styles.dateTimeValue}>{item.fromDate}</Text>
                    </View>

                    {item.toDate && (
                        <View style={styles.dateTimeRow}>
                            <MaterialIcons name="date-range" size={20} color="#007AFF" />
                            <Text style={styles.dateTimeLabel}>{i18n.t('toDate')}:</Text>
                            <Text style={styles.dateTimeValue}>{item.toDate}</Text>
                        </View>
                    )}

                    {item.fromTime && (
                        <View style={styles.dateTimeRow}>
                            <MaterialIcons name="access-time" size={20} color="#007AFF" />
                            <Text style={styles.dateTimeLabel}>{i18n.t('fromTime')}:</Text>
                            <Text style={styles.dateTimeValue}>{item.fromTime}</Text>
                        </View>
                    )}

                    {item.toTime && (
                        <View style={styles.dateTimeRow}>
                            <MaterialIcons name="access-time" size={20} color="#007AFF" />
                            <Text style={styles.dateTimeLabel}>{i18n.t('toTime')}:</Text>
                            <Text style={styles.dateTimeValue}>{item.toTime}</Text>
                        </View>
                    )}
                </View>

                {item.notes && (
                    <View style={styles.notesSection}>
                        <Text style={styles.notesLabel}>{i18n.t('note')}:</Text>
                        <Text style={styles.notesText}>{item.notes}</Text>
                    </View>
                )}

                {item.attachments && (
                    <View style={styles.attachmentSection}>
                        <MaterialIcons name="attach-file" size={20} color="#666" />
                        <View style={styles.attachmentList}>
                            {item.attachments.split('@@').map((attachment, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleAttachmentPress(attachment.trim())}
                                    style={styles.attachmentTouchable}
                                >
                                    <Text style={styles.attachmentText}>
                                        {attachment.trim()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            <View style={styles.requestFooter}>
                <View style={styles.requestInfo}>
                    <Text style={styles.requestId}>ID: {item.id}</Text>
                    <View style={styles.userNameContainer}>
                        <Text style={styles.userName}>{item.userName}</Text>
                        <TouchableOpacity
                            style={styles.leavesBalanceButton}
                            onPress={() => setLeavesInfo(item.userID)}
                        >
                            <MaterialIcons name="account-balance-wallet" size={16} color="#2E7D32" />
                            <Text style={styles.leavesBalanceText}>{i18n.t('leavesBalance')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                {item.status.toLowerCase() === 'pending' && (
                    <View style={styles.responseIndicator}>
                        <MaterialIcons name="touch-app" size={16} color="#007AFF" />
                        <Text style={styles.responseText}>{i18n.t('tapToRespond')}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={80} color="#BDC3C7" />
            <Text style={styles.emptyTitle}>{i18n.t('noPendingRequests')}</Text>
            <Text style={styles.emptySubtitle}>{i18n.t('noPendingRequestsDescription')}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{i18n.t('pendingRequests')}</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                    <MaterialIcons name="refresh" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>{i18n.t('loadingPendingRequests')}</Text>
                </View>
            ) : (
                <FlatList
                    data={pendingRequests}
                    renderItem={renderRequestItem}
                    keyExtractor={(item) => item.id}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#007AFF']}
                            tintColor="#007AFF"
                        />
                    }
                    ListEmptyComponent={renderEmptyState}
                />
            )}

            {/* Response Dialog */}
            <Modal
                visible={showResponseDialog}
                transparent={true}
                animationType="fade"
                onRequestClose={closeResponseDialog}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.responseDialog}>
                        <Text style={styles.dialogTitle}>{i18n.t('respondToRequest')}</Text>

                        {selectedRequest && (
                            <View style={styles.requestSummary}>
                                <Text style={styles.summaryText}>
                                    {selectedRequest.reqType} - {selectedRequest.fromDate}
                                    {selectedRequest.toDate && ` to ${selectedRequest.toDate}`}
                                </Text>
                                <Text style={styles.summarySubtext}>
                                    {i18n.t('by')}: {selectedRequest.userName}
                                </Text>
                            </View>
                        )}

                        <Text style={styles.notesLabel}>{i18n.t('responseNotes')} </Text>
                        <TextInput
                            style={styles.notesInput}
                            placeholder={i18n.t('enterRejectionReason')}
                            value={responseNotes}
                            onChangeText={setResponseNotes}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />

                        <View style={styles.dialogButtons}>
                            <TouchableOpacity
                                style={[styles.dialogButton, styles.rejectButton]}
                                onPress={() => handleResponseSubmit('Rejected')}
                                disabled={respondingToRequest}
                            >
                                {respondingToRequest ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <MaterialIcons name="close" size={20} color="#FFFFFF" />
                                        <Text style={styles.buttonText}>{i18n.t('reject')}</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.dialogButton, styles.acceptButton]}
                                onPress={() => handleResponseSubmit('Approved')}
                                disabled={respondingToRequest}
                            >
                                {respondingToRequest ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <MaterialIcons name="check" size={20} color="#FFFFFF" />
                                        <Text style={styles.buttonText}>{i18n.t('accept')}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={closeResponseDialog}
                        >
                            <Text style={styles.cancelButtonText}>{i18n.t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Leaves Info Modal */}
            <Modal
                visible={openInfoModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setOpenInfoModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.infoModalContainer}>
                        <MaterialIcons
                            name="close"
                            size={24}
                            style={{
                                padding: 10,
                                paddingTop: 15,
                                alignSelf: "flex-end",
                                position: "absolute",
                                marginTop: -10,
                                color: "#808080",
                                marginRight: 5,
                            }}
                            onPress={() => setOpenInfoModal(false)}
                        />
                        <Text
                            style={[
                                styles.cardTitle,
                                { color: "#A91B0D", position: "absolute", padding: 15 },
                            ]}
                        >
                            {infoUser}
                        </Text>

                        {loadingLeavesInfo ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#007AFF" />
                                <Text style={styles.loadingText}>{i18n.t('loadingLeavesInfo')}</Text>
                            </View>
                        ) : (
                            <FlatList
                                style={{ marginTop: 60 }}
                                keyExtractor={(item) => item.id}
                                data={infoList}
                                extraData={infoList}
                                ListHeaderComponent={() => (
                                    <View>
                                        <Text style={[styles.cardTitle, { padding: 10, fontSize: 16 }]}>
                                            {i18n.t("totalLoans")}: {infoTotLoans}
                                        </Text>
                                        <Text style={[styles.cardTitle, { padding: 10, fontSize: 16 }]}>
                                            {i18n.t("totalSickLoans")}: {infoTotSickLoans}
                                        </Text>
                                        <Text style={[styles.cardTitle, { padding: 10, fontSize: 16 }]}>
                                            {i18n.t("usedLoans")}: {infoUsedLoans}
                                        </Text>
                                        <Text style={[styles.cardTitle, { padding: 10, fontSize: 16 }]}>
                                            {i18n.t("usedSickLoans")}: {infoUsedSickLoans}
                                        </Text>

                                        <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 10 }}>
                                            <View style={{ flex: 1, height: 1, backgroundColor: "black" }} />
                                        </View>
                                    </View>
                                )}
                                renderItem={({ item }) => (
                                    <View style={styles.leaveRecordCard}>
                                        {!!(item.type != "" && item.type != null) ? (
                                            <Text style={styles.reqTypeStyle}> {item.type} </Text>
                                        ) : null}
                                        {!!(item.fromDate != "" && item.fromDate != null) ? (
                                            <Text style={styles.textItemsStyle}>
                                                {i18n.t("fromDate")}: {item.fromDate}
                                            </Text>
                                        ) : null}
                                        {!!(item.toDate != "" && item.toDate != null) ? (
                                            <Text style={styles.textItemsStyle}>
                                                {i18n.t("toDate")}: {item.toDate}
                                            </Text>
                                        ) : null}
                                        {!!(
                                            item.days != "" &&
                                            item.days != 0 &&
                                            item.days != null
                                        ) ? (
                                            <Text style={styles.textItemsStyle}>
                                                {i18n.t("days")}: {item.days}
                                            </Text>
                                        ) : null}
                                        {!!(
                                            item.hours != "" &&
                                            item.hours != 0 &&
                                            item.hours != null
                                        ) ? (
                                            <Text style={styles.textItemsStyle}>
                                                {i18n.t("hours")}: {item.hours}
                                            </Text>
                                        ) : null}
                                    </View>
                                )}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
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
    refreshButton: {
        padding: 8,
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
    list: {
        flex: 1,
    },
    listContent: {
        padding: 20,
    },
    requestCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        overflow: 'hidden',
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#F8F9FA',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    requestTypeContainer: {
        flex: 1,
    },
    requestType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    requestBody: {
        padding: 15,
    },
    dateTimeSection: {
        marginBottom: 15,
    },
    dateTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    dateTimeLabel: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
        marginRight: 8,
        minWidth: 80,
    },
    dateTimeValue: {
        fontSize: 14,
        color: '#2C3E50',
        fontWeight: '500',
        flex: 1,
    },
    notesSection: {
        marginBottom: 15,
        padding: 12,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#007AFF',
    },
    notesLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 4,
    },
    notesText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    attachmentSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 10,
        backgroundColor: '#FFF3CD',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFEAA7',
    },
    attachmentList: {
        flex: 1,
        marginLeft: 8,
    },
    attachmentTouchable: {
        marginBottom: 2,
    },
    attachmentText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    requestFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#F8F9FA',
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    requestInfo: {
        flex: 1,
    },
    requestId: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '500',
    },
    userName: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '500',
    },
    responseIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    responseText: {
        fontSize: 11,
        color: '#007AFF',
        fontWeight: '500',
        marginLeft: 4,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2C3E50',
        marginTop: 20,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#7F8C8D',
        textAlign: 'center',
        lineHeight: 24,
    },
    // Response Dialog Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    responseDialog: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        width: '100%',
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
    dialogTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2C3E50',
        textAlign: 'center',
        marginBottom: 16,
    },
    requestSummary: {
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    summaryText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2C3E50',
        marginBottom: 4,
    },
    summarySubtext: {
        fontSize: 14,
        color: '#7F8C8D',
    },
    notesLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2C3E50',
        marginBottom: 8,
    },
    notesInput: {
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#2C3E50',
        backgroundColor: '#FFFFFF',
        minHeight: 80,
        marginBottom: 20,
    },
    dialogButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    dialogButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginHorizontal: 6,
    },
    acceptButton: {
        backgroundColor: '#34C759',
    },
    rejectButton: {
        backgroundColor: '#FF3B30',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 6,
    },
    cancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '500',
    },
    // Leaves Info Styles
    userNameContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        flex: 1,
    },
    leavesBalanceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 4,
    },
    leavesBalanceText: {
        fontSize: 10,
        color: '#2E7D32',
        marginLeft: 3,
        fontWeight: '500',
    },
    infoModalContainer: {
        width: "90%",
        height: "80%",
        backgroundColor: "white",
        paddingHorizontal: 10,
        paddingVertical: 50,
        marginVertical: 10,
        borderRadius: 10,
        elevation: 20,
    },
    cardTitle: {
        color: "#000",
        fontWeight: "bold",
        alignSelf: "center",
        fontSize: 18,
        padding: 15,
    },
    leaveRecordCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 10,
        marginVertical: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(102, 126, 234, 0.1)',
    },
    textItemsStyle: {
        fontSize: 15,
        fontWeight: "bold",
        padding: 5,
    },
    reqTypeStyle: {
        color: "#A91B0D",
        fontSize: 16,
        alignSelf: "center",
        fontWeight: "bold",
    },
});