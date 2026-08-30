import { DoctorAlertDTO } from '../types/index.js';
import { db } from './db.service.js';

export class AlertsService {
  public static getDoctorAlerts(doctorId: string): DoctorAlertDTO[] {
    return db.alerts
      .filter(a => a.doctorId === doctorId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static getPatientAlerts(patientId: string): DoctorAlertDTO[] {
    return db.alerts
      .filter(a => a.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static updateAlertStatus(
    alertId: string,
    status: 'Pending' | 'Reviewed' | 'Contacted' | 'Follow-up scheduled' | 'Closed',
    doctorNotes?: string,
    scheduledFollowupAt?: string
  ): DoctorAlertDTO {
    const alert = db.alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new Error(`Alert with ID ${alertId} not found`);
    }

    alert.status = status;
    if (doctorNotes !== undefined) alert.doctorNotes = doctorNotes;

    const now = new Date().toISOString();
    if (status === 'Contacted') alert.contactedAt = now;
    if (status === 'Follow-up scheduled' || status === 'Closed') {
      if (scheduledFollowupAt) {
        alert.scheduledFollowupAt = scheduledFollowupAt;
      }
    }
    if (status === 'Closed') (alert as any).closedAt = now;

    // ── Key fix: propagate doctor notes back to the linked risk assessment ──
    // This allows the mother's profile screen to show doctor feedback per assessment
    if (doctorNotes && alert.assessmentId) {
      const assessment = db.riskAssessments.find(r => r.id === alert.assessmentId);
      if (assessment) {
        (assessment as any).doctorNotes = doctorNotes;
        if (scheduledFollowupAt) {
          (assessment as any).scheduledFollowupAt = scheduledFollowupAt;
        }
      }
    }

    // Also update the patient's profile hasActiveAlert flag if closed
    if (status === 'Closed') {
      const patientProfile = db.profiles.find(p => p.id === alert.patientId);
      if (patientProfile) {
        const hasOtherPending = db.alerts.some(
          a => a.patientId === alert.patientId && a.id !== alertId && a.status === 'Pending'
        );
        patientProfile.hasActiveAlert = hasOtherPending;
      }
    }

    return alert;
  }
}
