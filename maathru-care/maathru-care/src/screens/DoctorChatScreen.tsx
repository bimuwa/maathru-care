import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Send, Mic, Image as ImageIcon, Paperclip, Phone, X, ZoomIn } from 'lucide-react-native';
import { api, ChatMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');

export default function DoctorChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const patientId = (params.patientId as string) ?? '';
  const patientName = (params.patientName as string) ?? 'Patient';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const doctorId = user?.id ?? '';

  const loadMessages = useCallback(async () => {
    try {
      const res = await api.getMessages(doctorId, patientId);
      if (res.success) setMessages((res.messages ?? []).slice().reverse());
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [doctorId, patientId]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 8000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const sendText = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setIsSending(true);
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      senderId: doctorId,
      receiverId: patientId,
      messageText: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [optimistic, ...prev]);
    try {
      await api.sendMessage(doctorId, patientId, text);
      await loadMessages();
    } catch {
      Alert.alert('Error', 'Failed to send message.');
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setIsSending(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery access is required to send photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setIsSending(true);
      try {
        const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        const dataUri = asset.base64
          ? `data:${mime};base64,${asset.base64}`
          : asset.uri; // fallback

        await api.sendMessage(doctorId, patientId, '📷 Photo', dataUri, 'image');
        await loadMessages();
      } catch {
        Alert.alert('Error', 'Failed to send photo. Try a smaller image.');
      } finally {
        setIsSending(false);
      }
    }
  };

  const pickVideo = async () => {
    Alert.alert(
      'Video Sharing',
      'Video files are too large to send directly. Please share a video link or paste it as a message.',
      [{ text: 'OK' }]
    );
  };

  const recordVoice = () => {
    Alert.alert('Voice Messages', 'Voice recording coming soon! Use text chat for now.');
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.senderId === doctorId;
    const hasImage = item.attachmentUrl && item.attachmentType === 'image';

    return (
      <View className={`flex-row mb-3 px-4 ${isMine ? 'justify-end' : 'justify-start'}`}>
        {!isMine && (
          <View className="w-8 h-8 rounded-full bg-slate-200 items-center justify-center mr-2 self-end">
            <Text className="text-slate-500 font-bold text-xs">
              {patientName.charAt(0)}
            </Text>
          </View>
        )}
        <View
          className="max-w-[75%] rounded-[18px] overflow-hidden"
          style={{
            backgroundColor: isMine ? '#15803D' : '#FFFFFF',
            borderBottomRightRadius: isMine ? 4 : 18,
            borderBottomLeftRadius: isMine ? 18 : 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.07,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          {hasImage && (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewUri(item.attachmentUrl!)}>
              <Image
                source={{ uri: item.attachmentUrl }}
                style={{ width: SCREEN_W * 0.58, height: SCREEN_W * 0.45 }}
                resizeMode="cover"
              />
              <View className="absolute bottom-2 right-2 bg-black/40 rounded-full p-1">
                <ZoomIn color="#fff" size={14} />
              </View>
            </TouchableOpacity>
          )}
          {item.messageText ? (
            <View className="px-4 py-3">
              <Text style={{ color: isMine ? '#FFFFFF' : '#1E293B', fontSize: 14, lineHeight: 20 }}>
                {item.messageText}
              </Text>
              <Text style={{ color: isMine ? '#BBF7D0' : '#94A3B8', fontSize: 10, marginTop: 4, textAlign: 'right' }}>
                {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ) : hasImage ? (
            <View className="px-3 pb-2">
              <Text style={{ color: isMine ? '#BBF7D0' : '#94A3B8', fontSize: 10, textAlign: 'right' }}>
                {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-50"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View className="bg-emerald-700 pt-14 pb-4 px-5 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft color="#FFFFFF" size={22} />
        </TouchableOpacity>
        <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
          <Text className="text-white font-bold text-lg">{patientName.charAt(0)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold text-base">{patientName}</Text>
          <Text className="text-emerald-200 text-xs">Patient</Text>
        </View>
        <TouchableOpacity>
          <Phone color="#FFFFFF" size={20} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#15803D" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-4xl mb-3">💬</Text>
              <Text className="text-slate-500 font-semibold">No messages yet</Text>
              <Text className="text-slate-400 text-sm text-center mt-1 px-8">
                Start the conversation with {patientName}
              </Text>
            </View>
          }
        />
      )}

      {/* Input Bar */}
      <View
        className="bg-white border-t border-slate-100 px-3 py-3 flex-row items-end gap-2"
        style={{ paddingBottom: Platform.OS === 'ios' ? 24 : 12 }}
      >
        <TouchableOpacity
          onPress={pickImage}
          disabled={isSending}
          className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
        >
          <ImageIcon color={isSending ? '#CBD5E1' : '#64748B'} size={18} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={pickVideo}
          disabled={isSending}
          className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
        >
          <Paperclip color={isSending ? '#CBD5E1' : '#64748B'} size={18} />
        </TouchableOpacity>
        <View className="flex-1 bg-slate-100 rounded-[24px] px-4 py-2.5 max-h-28">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#94A3B8"
            multiline
            className="text-slate-800 text-sm"
            style={{ maxHeight: 80 }}
            editable={!isSending}
          />
        </View>
        {inputText.trim().length > 0 ? (
          <TouchableOpacity
            onPress={sendText}
            disabled={isSending}
            className="w-10 h-10 rounded-full bg-emerald-700 items-center justify-center"
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send color="#FFFFFF" size={18} />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={recordVoice}
            className="w-10 h-10 rounded-full bg-emerald-700 items-center justify-center"
          >
            <Mic color="#FFFFFF" size={18} />
          </TouchableOpacity>
        )}
      </View>

      {/* Full-screen Image Preview Modal */}
      <Modal visible={!!previewUri} transparent animationType="fade">
        <View className="flex-1 bg-black items-center justify-center">
          <TouchableOpacity
            onPress={() => setPreviewUri(null)}
            className="absolute top-14 right-5 z-10 bg-white/20 w-10 h-10 rounded-full items-center justify-center"
          >
            <X color="#fff" size={22} />
          </TouchableOpacity>
          {previewUri && (
            <Image
              source={{ uri: previewUri }}
              style={{ width: SCREEN_W, height: SCREEN_W }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
