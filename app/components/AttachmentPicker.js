import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Image, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
//import { useAudioRecorder, RecordingOptions, AudioModule, RecordingPresets } from 'expo-audio';
import i18n from "../languages/langStrings";
import * as Constants from "../utils/Constants";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ServerOperations from "../utils/ServerOperations";

const AttachmentPicker = ({ onAttachmentSelected }) => {
    const [attachment, setAttachment] = useState(null);
    const [menuVisible, setMenuVisible] = useState(false);
    //const [audio, setAudio] = useState(null);
    const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
    const [imageUri, setImageUri] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [cameraPermission, setCameraPermission] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Add this function after your existing functions
    const takePicture = async () => {
        setMenuVisible(false);

        // Request camera permission
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert("Permission Required", "Permission to access the camera is required!");
            return;
        }

        // Launch camera
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

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
                setAttachment(file);

                const res = await ServerOperations.pickUploadHttpRequest(file, 1);
                console.log('Camera upload response:', res);
                // Use the generated filename, not server response
                onAttachmentSelected(generatedName);
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
        setMenuVisible(false);
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert("Permission Required", "Permission to access the gallery is required!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

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
                setAttachment(file);

                const res = await ServerOperations.pickUploadHttpRequest(file, 1);
                console.log('Image upload response:', res);
                // Use the generated filename, not server response
                onAttachmentSelected(generatedName);
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
                setAttachment(file);

                const res = await ServerOperations.pickUploadHttpRequest(file, 1);
                console.log('File upload response:', res);
                // Use the generated filename, not server response
                onAttachmentSelected(generatedName);
            } catch (error) {
                console.error('File upload error:', error);
                Alert.alert("Upload Error", "Failed to upload file. Please try again.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    // Handle attachment press
    const handleAttachmentPress = () => {
        if (attachment.type.startsWith("image")) {
            previewImage(attachment.uri);
        } else {
            Alert.alert("Unsupported File", "This file type is not supported for preview.");
        }
    };

    const previewImage = (uri) => {
        setImageUri(uri);
        setImagePreviewVisible(true);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.menuButton, isUploading && styles.menuButtonDisabled]}
                onPress={() => !isUploading && setMenuVisible(true)}
                disabled={isUploading}
            >
                {isUploading ? (
                    <ActivityIndicator size="small" color="#fff" style={{ marginHorizontal: 5 }} />
                ) : (
                    <Ionicons name="attach" size={24} color="#fff" style={{ marginHorizontal: 5 }} />
                )}
                <Text style={styles.menuButtonText}>
                    {isUploading ? i18n.t("uploading") || "Uploading..." : i18n.t("addAttachment")}
                </Text>
            </TouchableOpacity>

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
                onRequestClose={() => setMenuVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.menu}>
                        <TouchableOpacity style={styles.menuItem} onPress={takePicture}>
                            <Ionicons name="camera" size={20} color="#007bff" style={{ marginRight: 10 }} />
                            <Text style={styles.menuItemText}>{i18n.t("takePhoto")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={pickImage}>
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
});

export default AttachmentPicker;