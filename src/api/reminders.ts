import { apiRequest } from "./client";
import { Reminder } from "../types";

export const remindersApi = {
  list() {
    return apiRequest<{ reminders: Reminder[] }>("/reminders");
  },

  create(data: { title: string; description?: string; reminder_date: string }) {
    return apiRequest<{ reminder: Reminder }>("/reminders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
