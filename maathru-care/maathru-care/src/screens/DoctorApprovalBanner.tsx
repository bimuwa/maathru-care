import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import {
  Bell, CheckCircle, XCircle, User, Droplet, Calendar,
  Phone, Clock, X, ChevronRight, AlertTriangle,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface ApprovalRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientBloodGroup: string;
  patientGestationalWeeks: number;
  patientPhone: string;
  patientEmail: string;
  status: string;
  createdAt: string;
}

interface Props {
  onApproved?: () => void;
}

export default function DoctorApprovalBanner({ onApproved }: Props) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const hasAutoOpenedRef = useRef(false);   // ensures auto-popup only fires ONCE per session
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the bell badge
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    );
    if (requests.length > 0) pulse.start();
    else pulse.stop();
    return () => pulse.stop();
  }, [requests.length, pulseAnim]);

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.getPendingApprovalRequests(user.id);
      if (res.success) {
        const incoming = res.requests || [];
        setRequests(incoming);

        // ── AUTO-POPUP on first load if there are pending requests ──────────
        if (incoming.length > 0 && !hasAutoOpenedRef.current) {
          hasAutoOpenedRef.current = true;
          // If exactly one request, go straight into its detail view
          if (incoming.length === 1) {
            setSelectedRequest(incoming[0]);
          }
          setModalVisible(true);
        }
      }
    } catch {
      // network error — silent fail, keep showing whatever was there
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 15000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleRespond = async (request: ApprovalRequest, action: 'approve' | 'reject') => {
    const confirmTitle = action === 'approve'
      ? `Approve ${request.patientName}?`
      : `Decline ${request.patientName}?`;
    const confirmMsg = action === 'approve'
      ? `${request.patientName} will be added to your patient roster and can fully use the app.`
      : `${request.patientName}'s request will be declined. They can choose a different doctor.`;

    Alert.alert(confirmTitle, confirmMsg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action === 'approve' ? 'Approve' : 'Decline',
        style: action === 'approve' ? 'default' : 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.respondToApprovalRequest(request.id, action);
            // Remove this request from local list immediately
            setRequests(prev => prev.filter(r => r.id !== request.id));
            setSelectedRequest(null);

            if (action === 'approve') {
              Alert.alert(
                '✅ Patient Approved!',
                `${request.patientName} has been notified and can now access all Maathru Care features.`,
                [{ text: 'OK', onPress: () => { setModalVisible(false); onApproved?.(); } }]
              );
            } else {
              Alert.alert(
                'Request Declined',
                `${request.patientName} has been notified. They can select a different doctor.`,
                [{ text: 'OK', onPress: () => setModalVisible(false) }]
              );
            }
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to respond. Please try again.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // Nothing to show — no pending requests
  if (requests.length === 0) return null;

  return (
    <>
      {/* ── Amber notification banner (always visible, tappable) ─────────── */}
      <TouchableOpacity
        onPress={() => {
          if (requests.length === 1) setSelectedRequest(requests[0]);
          else setSelectedRequest(null);
          setModalVisible(true);
        }}
        activeOpacity={0.85}
        className="mx-5 mb-4 rounded-[20px] overflow-hidden"
        style={{
          backgroundColor: '#FFFBEB',
          borderWidth: 1.5,
          borderColor: '#FCD34D',
          shadowColor: '#F59E0B',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <View className="px-5 py-4 flex-row items-center">
          <Animated.View
            className="w-11 h-11 rounded-full bg-amber-100 items-center justify-center mr-3"
            style={{ transform: [{ scale: pulseAnim }] }}
          >
            <Bell color="#F59E0B" size={20} />
          </Animated.View>
          <View className="flex-1">
            <Text className="text-amber-900 font-bold text-sm">
              {requests.length === 1
                ? '1 New Patient Approval Request'
                : `${requests.length} Patients Requesting Approval`}
            </Text>
            <Text className="text-amber-700 text-xs mt-0.5" numberOfLines={1}>
              {requests.map(r => r.patientName).join(', ')} — tap to review
            </Text>
          </View>
          <View className="bg-amber-400 rounded-[10px] px-3 py-1.5 flex-row items-center ml-2">
            <Text className="text-white font-bold text-xs">Review</Text>
            <ChevronRight color="#fff" size={13} />
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Full-screen modal popup ───────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent statusBarTranslucent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-[32px]" style={{ maxHeight: '92%' }}>

            {/* Handle bar */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-slate-200" />
            </View>

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pt-3 pb-4 border-b border-slate-100">
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-full bg-amber-100 items-center justify-center mr-3">
                  <Bell color="#F59E0B" size={18} />
                </View>
                <View>
                  <Text className="text-slate-800 font-bold text-base">Patient Approval Requests</Text>
                  <Text className="text-slate-400 text-xs">
                    {selectedRequest ? 'Patient Details' : `${requests.length} pending review`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => { setModalVisible(false); setSelectedRequest(null); }}
                className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
              >
                <X color="#64748B" size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── DETAIL VIEW: one patient selected ─────────────────────── */}
              {selectedRequest ? (
                <View className="p-6">
                  {/* Back to list (only if multiple requests) */}
                  {requests.length > 1 && (
                    <TouchableOpacity onPress={() => setSelectedRequest(null)} className="flex-row items-center mb-4">
                      <ChevronRight color="#94A3B8" size={16} style={{ transform: [{ rotate: '180deg' }] }} />
                      <Text className="text-slate-500 text-sm ml-1">Back to list</Text>
                    </TouchableOpacity>
                  )}

                  {/* Patient avatar + name */}
                  <View className="items-center mb-5">
                    <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-3">
                      <Text className="text-emerald-700 font-bold text-3xl">
                        {selectedRequest.patientName.charAt(0)}
                      </Text>
                    </View>
                    <Text className="text-slate-800 font-bold text-xl">{selectedRequest.patientName}</Text>
                    <Text className="text-slate-400 text-xs mt-1">
                      Requested {new Date(selectedRequest.createdAt).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric',
                      })}
                    </Text>
                  </View>

                  {/* Patient clinical details */}
                  <View className="bg-slate-50 rounded-[20px] p-5 mb-5">
                    <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">
                      Patient Profile
                    </Text>
                    <View className="gap-3">
                      {[
                        {
                          icon: <User color="#15803D" size={18} />,
                          label: 'Full Name',
                          value: selectedRequest.patientName,
                          highlight: false,
                        },
                        {
                          icon: <Calendar color="#15803D" size={18} />,
                          label: 'Age',
                          value: `${selectedRequest.patientAge} years old`,
                          highlight: false,
                        },
                        {
                          icon: <Droplet color="#E11D48" size={18} />,
                          label: 'Blood Group',
                          value: selectedRequest.patientBloodGroup || '—',
                          highlight: true,
                        },
                        {
                          icon: <AlertTriangle color="#F59E0B" size={18} />,
                          label: 'Gestational Age',
                          value: `Week ${selectedRequest.patientGestationalWeeks} of pregnancy`,
                          highlight: true,
                        },
                        {
                          icon: <Phone color="#15803D" size={18} />,
                          label: 'Phone',
                          value: selectedRequest.patientPhone || '—',
                          highlight: false,
                        },
                      ].map((item, i) => (
                        <View
                          key={i}
                          className="flex-row items-center rounded-[14px] px-4 py-3.5"
                          style={{ backgroundColor: item.highlight ? '#ECFDF5' : '#fff' }}
                        >
                          <View className="w-9 h-9 rounded-full bg-white items-center justify-center mr-3"
                            style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                            {item.icon}
                          </View>
                          <View className="flex-1">
                            <Text className="text-slate-400 text-xs">{item.label}</Text>
                            <Text className="text-slate-800 font-bold text-sm mt-0.5">{item.value}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Info note */}
                  <View className="bg-blue-50 border border-blue-100 rounded-[14px] p-4 mb-6 flex-row">
                    <CheckCircle color="#3B82F6" size={16} />
                    <Text className="text-blue-700 text-xs ml-3 flex-1 leading-4">
                      If you approve, this patient will be added to your patient roster. You will receive alerts for high-risk assessments and can communicate via chat.
                    </Text>
                  </View>

                  {/* Action buttons */}
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => handleRespond(selectedRequest, 'reject')}
                      disabled={actionLoading}
                      className="flex-1 py-4 rounded-[16px] border border-red-200 items-center flex-row justify-center"
                      style={{ backgroundColor: '#FFF1F2' }}
                    >
                      {actionLoading
                        ? <ActivityIndicator size="small" color="#EF4444" />
                        : (
                          <>
                            <XCircle color="#EF4444" size={18} />
                            <Text className="text-red-500 font-bold ml-2 text-base">Decline</Text>
                          </>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRespond(selectedRequest, 'approve')}
                      disabled={actionLoading}
                      className="flex-2 py-4 rounded-[16px] items-center flex-row justify-center px-8"
                      style={{ backgroundColor: '#15803D', flex: 1.6 }}
                    >
                      {actionLoading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : (
                          <>
                            <CheckCircle color="#FFFFFF" size={18} />
                            <Text className="text-white font-bold ml-2 text-base">Approve</Text>
                          </>
                        )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* ── LIST VIEW: multiple requests ─────────────────────────── */
                <View className="p-5">
                  <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4 px-1">
                    Tap a patient to view their full details before deciding
                  </Text>
                  {requests.map((req) => (
                    <TouchableOpacity
                      key={req.id}
                      onPress={() => setSelectedRequest(req)}
                      activeOpacity={0.8}
                      className="bg-white border border-slate-100 rounded-[18px] p-4 mb-3 flex-row items-center"
                      style={{
                        elevation: 2,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.06,
                        shadowRadius: 8,
                      }}
                    >
                      <View className="w-12 h-12 bg-emerald-50 rounded-full items-center justify-center mr-3">
                        <Text className="text-emerald-700 font-bold text-lg">{req.patientName.charAt(0)}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-slate-800 font-bold text-base">{req.patientName}</Text>
                        <View className="flex-row items-center gap-3 mt-0.5 flex-wrap">
                          <Text className="text-slate-400 text-xs">Age {req.patientAge}</Text>
                          <Text className="text-red-500 text-xs font-semibold">{req.patientBloodGroup}</Text>
                          <Text className="text-slate-400 text-xs">Week {req.patientGestationalWeeks}</Text>
                        </View>
                      </View>
                      <View className="flex-row items-center bg-amber-50 px-2.5 py-1 rounded-full mr-2">
                        <Clock color="#F59E0B" size={11} />
                        <Text className="text-amber-600 text-[10px] font-bold ml-1">Pending</Text>
                      </View>
                      <ChevronRight color="#CBD5E1" size={16} />
                    </TouchableOpacity>
                  ))}
                  <View className="h-4" />
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
