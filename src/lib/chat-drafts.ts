import AsyncStorage from '@react-native-async-storage/async-storage';

import { draftStore } from '@/lib/draft-store';

export const chatDrafts = draftStore(AsyncStorage);
