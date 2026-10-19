import { Router, Request, Response } from 'express';
import { db } from '../services/db.service.js';

const router = Router();

// ─── POST /session — Save a completed kick counting session ──────────────────
router.post('/session', async (req: Request, res: Response) => {
  try {
    const { patientId, sessionStart, sessionEnd, totalKicks, durationMinutes, targetKicks, completed, notes } = req.body;
    if (!patientId || totalKicks === undefined) {
      return res.status(400).json({ success: false, error: 'patientId and totalKicks are required' });
    }
    const supabase = db.getSupabase();
    const { data, error } = await supabase.from('kick_sessions').insert({
      patient_id: patientId,
      session_start: sessionStart || new Date().toISOString(),
      session_end: sessionEnd || new Date().toISOString(),
      total_kicks: totalKicks,
      duration_minutes: durationMinutes || 0,
      target_kicks: targetKicks || 10,
      completed: completed ?? (totalKicks >= (targetKicks || 10)),
      notes: notes || null,
    }).select().single();
    if (error) throw error;
    res.json({ success: true, session: data });
  } catch (err: any) {
    console.error('[Kicks] Save session error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /history/:patientId — Get all kick sessions for a patient ───────────
router.get('/history/:patientId', async (req: Request, res: Response) => {
  try {
    const supabase = db.getSupabase();
    const { data, error } = await supabase
      .from('kick_sessions')
      .select('*')
      .eq('patient_id', req.params.patientId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    const mapped = (data || []).map((s: any) => ({
      id: s.id,
      patientId: s.patient_id,
      sessionStart: s.session_start,
      sessionEnd: s.session_end,
      totalKicks: s.total_kicks,
      durationMinutes: s.duration_minutes,
      targetKicks: s.target_kicks,
      completed: s.completed,
      notes: s.notes,
      createdAt: s.created_at,
    }));
    res.json({ success: true, sessions: mapped });
  } catch (err: any) {
    console.error('[Kicks] History error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /latest/:patientId — Get the most recent session ────────────────────
router.get('/latest/:patientId', async (req: Request, res: Response) => {
  try {
    const supabase = db.getSupabase();
    const { data, error } = await supabase
      .from('kick_sessions')
      .select('*')
      .eq('patient_id', req.params.patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ success: true, session: data ? {
      id: data.id, patientId: data.patient_id, totalKicks: data.total_kicks,
      durationMinutes: data.duration_minutes, completed: data.completed, createdAt: data.created_at,
    } : null });
  } catch (err: any) {
    console.error('[Kicks] Latest error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
