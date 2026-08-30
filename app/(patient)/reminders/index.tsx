import { useEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { remindersApi } from "@/api/reminders";
import { Reminder } from "@/types";
import { styles } from "@/components/ui";

export default function RemindersIndex() {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    remindersApi.list().then((d) => setReminders(d.reminders)).catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reminders</Text>
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardText}>{item.description}</Text>
            <Text style={styles.cardText}>{new Date(item.reminder_date).toLocaleString()}</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{item.status}</Text></View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.cardText}>No reminders</Text>}
      />
    </View>
  );
}
