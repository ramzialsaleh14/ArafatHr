import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Image, ActivityIndicator, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
//import { useAudioRecorder, RecordingOptions, AudioModule, RecordingPresets } from 'expo-audio';
import i18n from "../languages/langStrings";
import * as Constants from "../utils/Constants";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ServerOperations from "../utils/ServerOperations";

const AttachmentPicker = ({ onAttachmentSelected, onAttachmentsChanged }) => {
    const [attachments, setAttachments] = useState([]);
    const [menuVisible, setMenuVisible] = useState(false);
    //const [audio, setAudio] = useState(null);
    const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
    const [imageUri, setImageUri] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [cameraPermission, setCameraPermission] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const addAttachment = (filename, fileData) => {
        const newAttachment = {
            id: Date.now().toString(),
            filename: filename,
            data: fileData,
            type: fileData.type
        };

        const updatedAttachments = [...attachments, newAttachment];
        setAttachments(updatedAttachments);

        // Call both callbacks for backward compatibility
        if (onAttachmentSelected) {
            onAttachmentSelected(filename);
        }
        if (onAttachmentsChanged) {
            onAttachmentsChanged(updatedAttachments);
        }
    };

    const removeAttachment = (attachmentId) => {
        const updatedAttachments = attachments.filter(att => att.id !== attachmentId);
        setAttachments(updatedAttachments);

        if (onAttachmentsChanged) {
            onAttachmentsChanged(updatedAttachments);
        }
    };

    // Add this function after your existing functions
    const takePicture = async () => {
        console.log('Take picture function called');
        setMenuVisible(false);

        // Request camera permission
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        console.log('Camera permission result:', permissionResult);
        if (!permissionResult.granted) {
            Alert.alert("Permission Required", "Permission to access the camera is required!");
            return;
        }

        // Launch camera
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'Images',
            quality: 1,
        });

        console.log('Camera result:', result);

        if (!result.canceled && result.assets.length > 0) {
            setIsUploading(true);
            try {
                // Generate filename like in the working code
                const originalName = result.assets[0].fileName || "camera_photo.jpg";
                const extension = originalName.substring(originalName.lastIndexOf("."));
                const generatedName = new Date().getTime() + extension;

                const file = {
                    type: "image/*",
                    uri: result.assets[0].uri,
                    name: generatedName
                };

                const res = await ServerOperations.pickUploadHttpRequest(file);
                console.log('Camera upload response:', res);
                // Add to attachments list
                addAttachment(generatedName, file);
            } catch (error) {
                console.error('Camera upload error:', error);
                Alert.alert("Upload Error", "Failed to upload image. Please try again.");
            } finally {
                setIsUploading(false);
            }
        }
    };


    // Initialize audio recorder with high quality preset
    //const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    // Request recording permissions on component mount
    // useEffect(() => {
    //     (async () => {
    //         const status = await AudioModule.requestRecordingPermissionsAsync();
    //         if (!status.granted) {
    //             Alert.alert('Permission Required', 'Permission to access microphone was denied');
    //         }
    //     })();
    // }, []);

    // Start audio recording
    // const startRecording = async () => {
    //     try {
    //         // Check permission first
    //         const status = await AudioModule.requestRecordingPermissionsAsync();
    //         if (!status.granted) {
    //             Alert.alert("Permission Required", "Permission to access the microphone is required!");
    //             return;
    //         }

    //         // Prepare and start recording
    //         await audioRecorder.prepareToRecordAsync();
    //         audioRecorder.record();
    //         setIsRecording(true);
    //     } catch (error) {
    //         console.error("Failed to start recording", error);
    //         Alert.alert("Recording Error", "Failed to start recording. Please try again.");
    //     }
    // };

    // Stop audio recording
    // const stopRecording = async () => {
    //     try {
    //         if (!isRecording) {
    //             return;
    //         }

    //         // Stop recording - the recording will be available on audioRecorder.uri
    //         await audioRecorder.stop();
    //         setIsRecording(false);

    //         // Get the recorded file URI
    //         const uri = audioRecorder.uri;

    //         if (uri) {
    //             // Use more specific MIME type for audio
    //             const file = { type: "audio/m4a", uri, name: "recording.m4a" };
    //             setAttachment(file);

    //             const res = await ServerOperations.pickUploadHttpRequest(file);
    //             if (res.URL != null && res.URL != "") {
    //                 onAttachmentSelected(res.URL);
    //             }
    //         }

    //         setMenuVisible(false);
    //     } catch (error) {
    //         console.error("Failed to stop recording", error);
    //         Alert.alert("Recording Error", "Failed to stop recording. Please try again.");
    //         setIsRecording(false);
    //     }
    // };

    // Function to play audio with proper cleanup
    // const playAudio = async () => {
    //     try {
    //         if (audio) {
    //             await audio.unloadAsync();
    //             setAudio(null);
    //             return;
    //         }

    //         // Use AudioModule to create and play sound
    //         const { sound } = await AudioModule.Sound.createAsync(
    //             { uri: attachment.uri },
    //             { shouldPlay: true }
    //         );

    //         setAudio(sound);

    //         // Set up playback status listener for cleanup
    //         sound.setOnPlaybackStatusUpdate((status) => {
    //             if (status.didJustFinish) {
    //                 sound.unloadAsync();
    //                 setAudio(null);
    //             }
    //         });
    //     } catch (error) {
    //         console.error("Failed to play audio", error);
    //         Alert.alert("Playback Error", "Failed to play audio file.");
    //     }
    // };

    // Cleanup function when component unmounts
    // useEffect(() => {
    //     return () => {
    //         if (audio) {
    //             audio.unloadAsync();
    //         }
    //         if (isRecording) {
    //             audioRecorder.stop();
    //         }
    //     };
    // }, [audio, isRecording]);

    // Function to pick an image
    const pickImage = async () => {
        console.log('Pick image function called');
        setMenuVisible(false);
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('Media library permission result:', permissionResult);
        if (!permissionResult.granted) {
            Alert.alert("Permission Required", "Permission to access the gallery is required!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'Images',
            quality: 1,
        });

        console.log('Gallery result:', result);

        if (!result.canceled && result.assets.length > 0) {
            setIsUploading(true);
            try {
                // Generate filename like in the working code
                const originalName = result.assets[0].fileName || "image.jpg";
                const extension = originalName.substring(originalName.lastIndexOf("."));
                const generatedName = new Date().getTime() + extension;

                const file = {
                    type: "image/*",
                    uri: result.assets[0].uri,
                    name: generatedName
                };

                const res = await ServerOperations.pickUploadHttpRequest(file);
                console.log('Image upload response:', res);
                // Add to attachments list
                addAttachment(generatedName, file);
            } catch (error) {
                console.error('Image upload error:', error);
                Alert.alert("Upload Error", "Failed to upload image. Please try again.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    // Function to pick a file
    const pickFile = async () => {
        setMenuVisible(false);
        const result = await DocumentPicker.getDocumentAsync({
            type: "*/*",
            copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets.length > 0) {
            setIsUploading(true);
            try {
                // Generate filename like in the working code
                const originalName = result.assets[0].name;
                const extension = originalName.substring(originalName.lastIndexOf("."));
                const generatedName = new Date().getTime() + extension;

                const file = {
                    type: result.assets[0].mimeType || "*/*",
                    uri: result.assets[0].uri,
                    name: generatedName
                };

                const res = await ServerOperations.pickUploadHttpRequest(file);
                console.log('File upload response:', res);
                // Add to attachments list
                addAttachment(generatedName, file);
            } catch (error) {
                console.error('File upload error:', error);
                Alert.alert("Upload Error", "Failed to upload file. Please try again.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    // Handle attachment press
    const handleAttachmentPress = (attachment) => {
        const attachmentUrl = `${Constants.attachmentPath}/${attachment.filename}`;
        console.log('Opening attachment URL:', attachmentUrl);
        Linking.openURL(attachmentUrl).catch((err) => {
            console.error("Failed to open attachment:", err);
            Alert.alert("Error", "Failed to open attachment. Please try again.");
        });
    };

    const previewImage = (uri) => {
        setImageUri(uri);
        setImagePreviewVisible(true);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.menuButton, isUploading && styles.menuButtonDisabled]}
                onPress={() => {
                    console.log('Attachment button pressed, isUploading:', isUploading);
                    if (!isUploading) {
                        console.log('Setting menu visible to true');
                        setMenuVisible(true);
                    }
                }}
                disabled={isUploading}
            >
                {isUploading ? (
                    <ActivityIndicator size="small" color="#fff" style={{ marginHorizontal: 5 }} />
                ) : (
                    <Ionicons name="attach" size={24} color="#fff" style={{ marginHorizontal: 5 }} />
                )}
                <Text style={styles.menuButtonText}>
                    {isUploading ? i18n.t("uploading") || "Uploading..." :
                        attachments.length > 0 ? `${i18n.t("addAttachment")} (${attachments.length})` : i18n.t("addAttachment")}
                </Text>
            </TouchableOpacity>

            {/* Attachments List */}
            {attachments.length > 0 && (
                <View style={styles.attachmentsList}>
                    {attachments.map((attachment) => (
                        <View key={attachment.id} style={styles.attachmentItem}>
                            <TouchableOpacity
                                style={styles.attachmentContent}
                                onPress={() => handleAttachmentPress(attachment)}
                            >
                                <Ionicons
                                    name={attachment.type.startsWith('image') ? "image" : "document"}
                                    size={20}
                                    color="#007bff"
                                />
                                <Text style={styles.attachmentText} numberOfLines={1}>
                                    {attachment.filename}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => removeAttachment(attachment.id)}
                            >
                                <Ionicons name="close-circle" size={20} color="#ff4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {/* Loading Modal */}
            <Modal
                transparent={true}
                visible={isUploading}
                animationType="fade"
            >
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007bff" />
                        <Text style={styles.loadingText}>{i18n.t("uploading") || "Uploading..."}</Text>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent={true}
                visible={menuVisible}
                animationType="slide"
                onRequestClose={() => {
                    console.log('Modal closing');
                    setMenuVisible(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.menu}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => {
                            console.log('Take picture button pressed');
                            takePicture();
                        }}>
                            <Ionicons name="camera" size={20} color="#007bff" style={{ marginRight: 10 }} />
                            <Text style={styles.menuItemText}>{i18n.t("takePhoto")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => {
                            console.log('Pick image button pressed');
                            pickImage();
                        }}>
                            <Text style={styles.menuItemText}>{i18n.t("attachPhoto")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={pickFile}>
                            <Text style={styles.menuItemText}>{i18n.t("attachFile")}</Text>
                        </TouchableOpacity>
                        {/* {isRecording ? (
                            <TouchableOpacity
                                style={[styles.menuItem, { backgroundColor: "#ffcccc" }]}
                                onPress={stopRecording}
                            >
                                <Text style={[styles.menuItemText, { color: "red" }]}>
                                    {i18n.t("stopRecording")}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.menuItem} onPress={startRecording}>
                                <Text style={styles.menuItemText}>{i18n.t("recordAudio")}</Text>
                            </TouchableOpacity>
                        )} */}
                        <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                            <Text style={styles.menuItemText}>{i18n.t("cancel")}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Image Preview Modal */}
            <Modal
                visible={imagePreviewVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setImagePreviewVisible(false)}
            >
                <View style={styles.previewOverlay}>
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: imageUri }} style={styles.previewImage} />
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setImagePreviewVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        margin: 10,
    },
    menuButton: {
        padding: 10,
        backgroundColor: Constants.darkBlueColor,
        borderRadius: 5,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        marginHorizontal: 50
    },
    menuButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    menuButtonDisabled: {
        opacity: 0.7,
    },
    loadingOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    loadingContainer: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 30,
        alignItems: "center",
        minWidth: 150,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: "#333",
        textAlign: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    menu: {
        backgroundColor: "#fff",
        borderRadius: 10,
        width: 250,
        padding: 20,
        alignItems: "center",
    },
    menuItem: {
        padding: 15,
        width: "100%",
        alignItems: "center",
        marginVertical: 5,
        flexDirection: "row",
        justifyContent: "center",
    },
    menuItemText: {
        fontSize: 16,
        color: "#007bff",
    },
    attachmentInfo: {
        marginTop: 10,
    },
    previewOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center",
    },
    previewContainer: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 10,
        alignItems: "center",
    },
    previewImage: {
        width: 300,
        height: 300,
        resizeMode: "contain",
    },
    closeButton: {
        marginTop: 10,
        padding: 10,
        backgroundColor: Constants.darkBlueColor,
        borderRadius: 5,
    },
    closeButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    attachmentsList: {
        marginTop: 10,
    },
    attachmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 10,
        marginVertical: 2,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    attachmentContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    attachmentText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    removeButton: {
        padding: 5,
    },
});

export default AttachmentPicker;