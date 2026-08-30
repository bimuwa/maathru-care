import { PatientProfileDTO, AppointmentSummaryDTO } from '../types/index.js';
import { db } from './db.service.js';

export class DoctorService {
  public static getAssignedPatients(doctorId: string): PatientProfileDTO[] {
    return db.profiles.filter(p => p.role === 'mother' && (p.assignedDoctorId === doctorId || !p.assignedDoctorId));
  }

  public static getDashboardStats(doctorId: string) {
    const patients = db.profiles.filter((p: any) => p.assignedDoctorId === doctorId);
    
    let highRiskCount = 0;
    let pendingReviews = 0;
    let activeAlerts = 0;

    patients.forEach((p: any) => {
      const pId = p.id;
      const latestRisk = db.riskAssessments.find((a: any) => a.patientId === pId);
      const ctgReports = db.ctgReports.filter((c: any) => c.patientId === pId);
      const symptoms = db.dailySymptoms.filter((s: any) => s.patientId === pId);

      if (latestRisk && (latestRisk.riskLevel === 'High' || latestRisk.riskLevel === 'Very High')) {
        highRiskCount++;
      }
      
      const unreviewedCtg = ctgReports.filter((c: any) => c.reviewStatus === 'Pending').length;
      const unreviewedSymptoms = symptoms.filter((s: any) => !s.reviewedByDoctor).length;
      pendingReviews += (unreviewedCtg + unreviewedSymptoms);
    });

    return {
      totalPatients: patients.length,
      highRiskPatients: highRiskCount,
      pendingReviews,
      activeAlerts,
    };
  }

  public static getPatientDetail(patientId: string) {
    const patient = db.profiles.find(p => p.id === patientId);
    if (!patient) {
      throw new Error(`Patient with ID ${patientId} not found`);
    }

    const assessments = db.riskAssessments.filter(a => a.patientId === patientId);
    const ctgReports = db.ctgReports.filter(c => c.patientId === patientId);
    const symptoms = db.dailySymptoms.filter(s => s.patientId === patientId);

    return {
      profile: patient,
      latestAssessment: assessments[0] || null,
      assessments,
      ctgReports,
      symptoms,
    };
  }

  public static generateAppointmentSummary(patientId: string): AppointmentSummaryDTO {
    const patient = db.profiles.find(p => p.id === patientId);
    const assessments = db.riskAssessments.filter(a => a.patientId === patientId);
    const ctgReports = db.ctgReports.filter(c => c.patientId === patientId);
    const symptoms = db.dailySymptoms.filter(s => s.patientId === patientId);
    const openAlerts = db.alerts.filter((a: any) => a.patientId === patientId && !a.isRead);

    const latestAssessment = assessments[0];
    const prevAssessment = assessments[1];

    let trajectory: 'improving' | 'stable' | 'increasing' = 'stable';
    if (latestAssessment && prevAssessment) {
      const diff = latestAssessment.highRiskProbability - prevAssessment.highRiskProbability;
      if (diff > 5) trajectory = 'increasing';
      else if (diff < -5) trajectory = 'improving';
    }

    const symptomFlags: string[] = [];
    const recentSymptomsList: string[] = [];
    symptoms.slice(0, 5).forEach(s => {
      recentSymptomsList.push(...s.symptoms);
      if (s.patternFlag) symptomFlags.push(s.patternFlag);
    });

    const uniqueSymptoms = Array.from(new Set(recentSymptomsList));

    const latestCtg = ctgReports[0];

    let recommendedAction = 'Routine antenatal examination. Review blood pressure and fetal growth.';
    if (latestAssessment?.riskLevel === 'Very High' || latestAssessment?.riskLevel === 'High') {
      recommendedAction = 'Priority review: Re-evaluate maternal blood pressure, schedule repeat ultrasound/NST, and review proteinuria.';
    }

    return {
      patientId: patientId,
      patientName: patient?.fullName || 'Patient',
      gestationalAge: patient?.gestationalAgeWeeks || 24,
      currentRiskLevel: latestAssessment?.riskLevel || 'Low',
      riskProbability: latestAssessment?.highRiskProbability || 14.2,
      riskTrajectory: trajectory,
      recentVitals: {
        bloodPressure: latestAssessment ? `${(latestAssessment.factors as any)?.find((f: any) => f.feature === 'SystolicBP')?.value || 110}/${(latestAssessment.factors as any)?.find((f: any) => f.feature === 'DiastolicBP')?.value || 70}` : '110/70',
        fetalHeartRate: latestAssessment ? +((latestAssessment.factors as any)?.find((f: any) => f.feature === 'FetalHeartRate')?.value || 140) : 140,
        weightKg: latestAssessment ? +((latestAssessment.factors as any)?.find((f: any) => f.feature === 'WeightKg')?.value || 60) : 60,
      },
      recentSymptoms: uniqueSymptoms,
      symptomFlags,
      latestCtgSummary: latestCtg ? {
        classification: latestCtg.classification,
        riskScore: latestCtg.ctgRiskScore,
        baselineFhr: latestCtg.baselineFhr
      } : undefined,
      openAlertsCount: 0,
      recommendedClinicalAction: recommendedAction,
      generatedAt: new Date().toISOString()
    };
  }
}
