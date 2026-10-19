import React, { useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Plus, Search, Utensils } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { customFoodService } from '@/services/customFoodService';
import type { CustomFoodInput, UserCustomFood } from '@/types/customFood';

const blank: CustomFoodInput = { display_name: '', sinhala_name: '', english_name: '', category: '', serving_unit: '' };
type Props = { visible: boolean; onClose: () => void; onSelect: (food: UserCustomFood) => void };

export function CustomFoodsModal({ visible, onClose, onSelect }: Props) {
  const [foods, setFoods] = useState<UserCustomFood[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<CustomFoodInput>(blank);
  const [editing, setEditing] = useState<UserCustomFood | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const reload = async () => {
    setLoading(true); setError('');
    try { setFoods(await customFoodService.list()); }
    catch (e) { setError(e instanceof Error ? e.message : 'My Foods could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (visible) void reload(); else { setShowForm(false); setEditing(null); setForm(blank); setQuery(''); } }, [visible]);
  const filtered = useMemo(() => foods.filter((food) => `${food.display_name} ${food.sinhala_name ?? ''} ${food.english_name ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [foods, query]);
  const openNew = () => { setEditing(null); setForm(blank); setShowForm(true); };
  const openEdit = (food: UserCustomFood) => { setEditing(food); setForm(food); setShowForm(true); };
  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true); setError('');
    try {
      const food = editing ? await customFoodService.update(editing.id, form) : await customFoodService.create(form);
      await reload(); setShowForm(false); setEditing(null); setForm(blank);
      if (!editing) onSelect(food);
    } catch (e) { setError(e instanceof Error ? e.message : 'This custom food could not be saved.'); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const remove = (food: UserCustomFood) => Alert.alert('Delete custom food?', `Delete “${food.display_name}” from My Foods?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => { void customFoodService.remove(food.id).then(reload).catch((e) => setError(e instanceof Error ? e.message : 'Could not delete this food.')); } },
  ]);
  const field = (key: keyof CustomFoodInput, label: string, optional = true) => <View style={{ marginBottom: 12 }} key={key}>
    <Text style={{ color: '#334155', fontWeight: '600', marginBottom: 5 }}>{label}{!optional ? ' *' : ''}</Text>
    <TextInput value={String(form[key] ?? '')} onChangeText={(value) => setForm((prev) => ({ ...prev, [key]: value }))} maxLength={key === 'display_name' ? 100 : 100} style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, color: '#0F172A', backgroundColor: '#FFFFFF' }} />
  </View>;
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={showForm ? () => setShowForm(false) : onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0', gap: 12 }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={showForm ? 'Back to My Foods' : 'Close My Foods'} onPress={showForm ? () => setShowForm(false) : onClose} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={22} color="#334155" /></TouchableOpacity>
        <Text style={{ flex: 1, color: '#0F172A', fontSize: 19, fontWeight: '700' }}>{showForm ? (editing ? 'Edit food label' : 'Create food label') : 'My Foods'}</Text>
        {!showForm && <TouchableOpacity accessibilityRole="button" onPress={openNew} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}><Plus size={18} color="#047857"/><Text style={{ color: '#047857', fontWeight: '700' }}>Add</Text></TouchableOpacity>}
      </View>
      {showForm ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 32 }}>
        {field('display_name', 'Food name', false)}{field('sinhala_name', 'Sinhala name')}{field('english_name', 'English name')}{field('category', 'Category')}{field('serving_unit', 'Serving description')}
        <View style={{ padding: 13, backgroundColor: '#FFFBEB', borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A', marginVertical: 6 }}><Text style={{ color: '#78350F', lineHeight: 21 }}>Your custom food label has not been verified by a doctor. You can use it to identify and log this food, but its nutritional information and suitability during pregnancy have not been confirmed.</Text></View>
        <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={() => void save()} style={{ minHeight: 48, marginTop: 12, borderRadius: 12, backgroundColor: '#047857', justifyContent: 'center', alignItems: 'center' }}>{saving ? <ActivityIndicator color="#FFFFFF"/> : <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{editing ? 'Save changes' : 'Save label and add to meal'}</Text>}</TouchableOpacity>
        {!!error && <Text accessibilityRole="alert" style={{ color: '#B91C1C', marginTop: 10, lineHeight: 20 }}>{error}</Text>}
      </ScrollView> : <>
        <View style={{ margin: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 11, paddingHorizontal: 12 }}><Search size={18} color="#64748B"/><TextInput value={query} onChangeText={setQuery} placeholder="Search My Foods" style={{ flex: 1, padding: 12, color: '#0F172A' }}/></View>
        {!!error && <Text accessibilityRole="alert" style={{ color: '#B91C1C', paddingHorizontal: 18, lineHeight: 21 }}>{error}</Text>}
        {loading ? <ActivityIndicator style={{ marginTop: 24 }} color="#047857"/> : foods.length === 0 && !error ? <View style={{ padding: 24, alignItems: 'center' }}><Utensils size={30} color="#94A3B8"/><Text style={{ color: '#475569', marginTop: 12, textAlign: 'center' }}>Your saved food labels will appear here.</Text><TouchableOpacity onPress={openNew} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#047857', fontWeight: '700' }}>Create your first food label</Text></TouchableOpacity></View> : <FlatList data={filtered} keyExtractor={(food) => food.id} contentContainerStyle={{ padding: 16, paddingTop: 0 }} keyboardShouldPersistTaps="handled" renderItem={({ item }) => <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 13, padding: 14, marginBottom: 10 }}>
          <TouchableOpacity onPress={() => onSelect(item)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 16 }}>{item.display_name}</Text><Text style={{ color: '#92400E', marginTop: 3, fontSize: 12 }}>My Food · Not doctor verified</Text></TouchableOpacity>
          <Text selectable style={{ color: '#64748B', fontSize: 11, marginVertical: 6 }}>food_id: {item.food_id}</Text>
          <View style={{ flexDirection: 'row', gap: 18 }}><TouchableOpacity onPress={() => openEdit(item)} style={{ minHeight: 40, justifyContent: 'center' }}><Text style={{ color: '#047857', fontWeight: '600' }}>Edit</Text></TouchableOpacity><TouchableOpacity onPress={() => remove(item)} style={{ minHeight: 40, justifyContent: 'center' }}><Text style={{ color: '#B91C1C', fontWeight: '600' }}>Delete</Text></TouchableOpacity></View>
        </View>} ListEmptyComponent={!loading ? <Text style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>No saved labels match this search.</Text> : null} />}
      </>}
    </SafeAreaView>
  </Modal>;
}
