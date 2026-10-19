import { DailySymptomDTO } from '../types/index.js';
import { db } from './db.service.js';

export class SymptomsService {
  public static logSymptoms(input: {
    patientId: string;
    logDate?: string;
    symptoms: string[];
    severity: 'mild' | 'moderate' | 'severe';
    notes?: string;
  }): DailySymptomDTO {
    const logDate = input.logDate || new Date().toISOString().split('T')[0];

    // Detect patterns across past 7 days
    const pastLogs = db.dailySymptoms.filter(
      l => l.patientId === input.patientId && l.logDate !== logDate
    );

    let patternFlag: string | undefined = undefined;
    const allRecentSymptoms = [...pastLogs.flatMap(l => l.symptoms), ...input.symptoms];
    
    // Check for high-frequency occurrences (e.g. headache, swelling, dizziness)
    const counts: Record<string, number> = {};
    allRecentSymptoms.forEach(s => {
      counts[s] = (counts[s] || 0) + 1;
    });

    for (const [symptom, count] of Object.entries(counts)) {
      if (count >= 3) {
        patternFlag = `Repeated pattern: "${symptom}" logged ${count} times in recent records.`;
        break;
      }
    }

    const newLog: DailySymptomDTO = {
      id: `sym-${Date.now()}`,
      patientId: input.patientId,
      logDate,
      symptoms: input.symptoms,
      severity: input.severity,
      notes: input.notes,
      patternFlag,
      createdAt: new Date().toISOString(),
    };

    // Update or insert for today
    const existingIdx = db.dailySymptoms.findIndex(
      l => l.patientId === input.patientId && l.logDate === logDate
    );

    if (existingIdx >= 0) {
      db.dailySymptoms[existingIdx] = newLog;
    } else {
      db.dailySymptoms.unshift(newLog);
    }

    return newLog;
  }

  public static getPatientSymptoms(patientId: string): DailySymptomDTO[] {
    return db.dailySymptoms
      .filter(l => l.patientId === patientId)
      .sort((a, b) => b.logDate.localeCompare(a.logDate));
  }
}
