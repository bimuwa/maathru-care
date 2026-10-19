import { CtgReportDTO } from '../types/index.js';
import { db } from './db.service.js';

export class CtgService {
  /**
   * Analyzes CTG parameters (either extracted from scanned image or entered manually)
   * Clinical standards:
   * - Baseline FHR: 110-160 bpm (Normal), 100-109 or 161-180 (Suspicious), <100 or >180 (Pathological)
   * - Variability: 5-25 bpm (Normal), <5 for >30min or >25 (Suspicious/Pathological)
   * - Accelerations: >=2 in 20 min (Reassuring)
   * - Decelerations: None / early (Normal), Variable (Suspicious), Late/Prolonged (Pathological)
   */
  public static analyzeCtgData(input: {
    patientId: string;
    inputMode: 'scanned_image' | 'manual_entry';
    imageUrl?: string;
    baselineFhr: number;
    variability: number;
    accelerations: number;
    decelerations: number;
    uterineContractions?: number;
    isSentToDoctor?: boolean;
  }): CtgReportDTO {
    const { baselineFhr, variability, accelerations, decelerations } = input;
    
    let classification: 'NORMAL' | 'SUSPICIOUS' | 'PATHOLOGICAL' = 'NORMAL';
    let ctgRiskScore = 10.0;
    let fetalStatus = '';
    let maternalImpact = '';
    let daysUntilNextScan = 14; // Default routine 2 weeks

    // Baseline FHR scoring
    if (baselineFhr >= 110 && baselineFhr <= 160) {
      // Normal FHR
      ctgRiskScore += 5;
    } else if ((baselineFhr >= 100 && baselineFhr < 110) || (baselineFhr > 160 && baselineFhr <= 180)) {
      classification = 'SUSPICIOUS';
      ctgRiskScore += 30;
    } else {
      classification = 'PATHOLOGICAL';
      ctgRiskScore += 65;
    }

    // Variability scoring
    if (variability >= 5 && variability <= 25) {
      ctgRiskScore += 5;
    } else if (variability < 5) {
      if (classification !== 'PATHOLOGICAL') classification = 'SUSPICIOUS';
      ctgRiskScore += 30;
    } else {
      ctgRiskScore += 20;
    }

    // Accelerations & Decelerations
    if (accelerations >= 2 && decelerations === 0) {
      fetalStatus = 'Reactive & Reassuring: Baseline FHR within normal limits with positive fetal movements and accelerations.';
      maternalImpact = 'Fetal wellbeing is optimal. Low risk of intrapartum hypoxia.';
      daysUntilNextScan = 14;
    } else if (decelerations > 0 && decelerations <= 2) {
      classification = classification === 'PATHOLOGICAL' ? 'PATHOLOGICAL' : 'SUSPICIOUS';
      ctgRiskScore += 35;
      fetalStatus = 'Suspicious CTG: Intermittent decelerations detected with reduced reactivity.';
      maternalImpact = 'Requires closer fetal observation, hydration check, and repeat trace in 24-48 hours.';
      daysUntilNextScan = 2;
    } else if (decelerations > 2 || classification === 'PATHOLOGICAL') {
      classification = 'PATHOLOGICAL';
      ctgRiskScore += 55;
      fetalStatus = 'Pathological CTG: Persistent decelerations or severe baseline abnormalities indicating potential fetal compromise.';
      maternalImpact = 'Immediate obstetric clinical review and continuous electronic fetal monitoring advised.';
      daysUntilNextScan = 1;
    } else {
      fetalStatus = 'Normal non-reactive CTG trace: Baby might be in a sleep cycle.';
      maternalImpact = 'Gentle maternal hydration or repositioning recommended before retesting.';
      daysUntilNextScan = 7;
    }

    ctgRiskScore = Math.min(99.0, Math.max(5.0, ctgRiskScore));

    const patient = db.profiles.find(p => p.id === input.patientId);
    const nextScanDate = new Date(Date.now() + daysUntilNextScan * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const report: CtgReportDTO = {
      id: `ctg-${Date.now()}`,
      patientId: input.patientId,
      patientName: patient?.fullName || 'Sarah Jenkins',
      inputMode: input.inputMode,
      imageUrl: input.imageUrl,
      baselineFhr: input.baselineFhr,
      variability: input.variability,
      accelerations: input.accelerations,
      decelerations: input.decelerations,
      uterineContractions: input.uterineContractions || 0,
      classification,
      ctgRiskScore: +ctgRiskScore.toFixed(1),
      fetalStatusSummary: fetalStatus,
      maternalImpactSummary: maternalImpact,
      nextScanRecommendedDate: nextScanDate,
      isSentToDoctor: input.isSentToDoctor ?? true,
      createdAt: new Date().toISOString(),
    };

    // Save to memory/DB
    db.ctgReports.unshift(report);

    // If suspicious or pathological, generate doctor alert
    if (classification === 'PATHOLOGICAL' || classification === 'SUSPICIOUS') {
      /*
      db.alerts.unshift({
        id: `alt-${Date.now()}`,
        patientId: report.patientId,
        patientName: report.patientName || 'Patient',
        patientAge: patient?.age || 28,
        gestationalAge: patient?.gestationalAgeWeeks || 24,
        doctorId: patient?.assignedDoctorId || 'doc-elizabeth-001',
        ctgReportId: report.id,
        riskLevel: classification === 'PATHOLOGICAL' ? 'Pathological CTG' : 'High',
        probability: report.ctgRiskScore,
        alertTitle: `${classification} CTG Trace Detected`,
        alertMessage: `${report.fetalStatusSummary} (${report.baselineFhr} bpm baseline, ${report.decelerations} decelerations).`,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      });
      */
    }

    return report;
  }

  public static addDoctorFeedback(reportId: string, doctorId: string, feedbackNotes: string): CtgReportDTO {
    const report = db.ctgReports.find(r => r.id === reportId);
    if (!report) {
      throw new Error(`CTG Report with ID ${reportId} not found`);
    }

    report.doctorFeedback = feedbackNotes;
    report.doctorFeedbackAt = new Date().toISOString();
    report.reviewedByDoctorId = doctorId;

    return report;
  }

  public static getPatientHistory(patientId: string): CtgReportDTO[] {
    return db.ctgReports.filter(r => r.patientId === patientId);
  }
}
