import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, Alert, RefreshControl, Linking, Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import i18n from '../languages/langStrings';
import * as ServerOperations from '../utils/ServerOperations';
import * as Constants from '../utils/Constants';
import * as Commons from '../utils/Commons';

export default function MyRequestsScreen({ navigation, route }) {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const { fromDate, toDate, empId, status } = route.params;

    const loadRequests = async () => {
        try {
            // Get current user ID if not provided in params
            const currentUser = empId || await Commons.getFromAS("userID");

            const response = await ServerOperations.getAllRequestsHr(fromDate, toDate, currentUser, status);

            if (response && Array.isArray(response)) {
                setRequests(response);
            } else {
                setRequests([]);
            }
        } catch (error) {
            console.error("Error loading requests:", error);
            Alert.alert(i18n.t('error'), i18n.t('failedToLoadRequests'));
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadRequests();
    };

    const handleAttachmentPress = (filename) => {
        const attachmentUrl = `${Constants.attachmentPath}/${filename}`;
        Linking.openURL(attachmentUrl).catch((err) => {
            console.error("Failed to open attachment:", err);
            Alert.alert(i18n.t('error'), i18n.t('failedToOpenAttachment'));
        });
    };

    const renderRequestItem = ({ item }) => (
        <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
                <View style={styles.requestTypeContainer}>
                    <Text style={styles.requestType}>{item.reqType}</Text>
                    <Text style={styles.requestId}>ID: {item.id}</Text>
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
                <Text style={styles.statusText}>{item.status || 'N/A'}</Text>
                {item.respnotes && (
                    <Text style={styles.responseNotesText}>{item.respnotes}</Text>
                )}
            </View>

        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={80} color="#BDC3C7" />
            <Text style={styles.emptyTitle}>{i18n.t('noRequestsFound')}</Text>
            <Text style={styles.emptySubtitle}>{i18n.t('noRequestsFoundDescription')}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{i18n.t('myRequests')}</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                    <MaterialIcons name="refresh" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>

            {/* Filter Info */}
            <View style={styles.filterInfo}>
                <Text style={styles.filterText}>
                    {i18n.t('period')}: {fromDate} - {toDate}
                    {status && status !== 'All' && ` | ${i18n.t('status')}: ${status}`}
                </Text>
            </View>

            {/* Content */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>{i18n.t('loadingRequests')}</Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderRequestItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContainer}
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
        flex: 1,
        textAlign: 'center',
        marginRight: 40,
    },
    refreshButton: {
        padding: 8,
    },
    filterInfo: {
        backgroundColor: '#E8F4FD',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    filterText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
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
    listContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    requestCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    requestTypeContainer: {
        flex: 1,
    },
    requestType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    requestId: {
        fontSize: 12,
        color: '#666',
    },
    requestIdContainer: {
        alignItems: 'flex-end',
    },
    requestBody: {
        padding: 16,
    },
    dateTimeSection: {
        marginBottom: 12,
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
        fontWeight: '500',
    },
    dateTimeValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
    notesSection: {
        marginBottom: 12,
    },
    notesLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
        marginBottom: 4,
    },
    notesText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    attachmentSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    attachmentList: {
        flex: 1,
        marginLeft: 8,
    },
    attachmentTouchable: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 4,
    },
    attachmentText: {
        fontSize: 12,
        color: '#007AFF',
        textDecorationLine: 'underline',
    },
    requestFooter: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
        backgroundColor: '#F8F9FA',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        alignItems: 'center',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
    },
    responseNotesText: {
        fontSize: 12,
        fontWeight: '400',
        color: '#666',
        marginTop: 4,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});