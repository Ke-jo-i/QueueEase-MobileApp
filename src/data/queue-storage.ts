import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDemoQueue, decodeQueueSnapshot, QueueSnapshot } from './queue-model';

export const QUEUE_STORAGE_KEY = 'queueease.queue.v1';
let pendingWrite = Promise.resolve();

export function saveQueue(snapshot: QueueSnapshot) {
  const serialized = JSON.stringify(snapshot);
  pendingWrite = pendingWrite.catch(() => {}).then(() => AsyncStorage.setItem(QUEUE_STORAGE_KEY, serialized));
  return pendingWrite;
}

export async function loadQueue() {
  await pendingWrite.catch(() => {});
  const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
  if (stored !== null) return decodeQueueSnapshot(stored);
  const initial = createDemoQueue(new Date().toISOString());
  await saveQueue(initial);
  return initial;
}
