import AsyncStorage from '@react-native-async-storage/async-storage';

export const profilePhotoKey = (storageId: string) => `queueease.profile-photo.${storageId}`;
export const readProfilePhoto = (storageId: string) => AsyncStorage.getItem(profilePhotoKey(storageId)).catch(() => null);
