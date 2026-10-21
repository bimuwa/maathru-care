import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        if self._pageNumber > 1:
            # Header
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#047857"))
            self.drawString(36, 11 * 72 - 28, "MAATHRU CARE - COMPLETE APP CODE-LINE MAPPING & VIVA DEFENSE GUIDE")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(8.5 * 72 - 36, 11 * 72 - 28, "IT22557506 - Randinu P.V.K.V")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.75)
            self.line(36, 11 * 72 - 32, 8.5 * 72 - 36, 11 * 72 - 32)

            # Footer
            self.line(36, 36, 8.5 * 72 - 36, 36)
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(36, 24, "Member 2: Maternal Pregnancy Risk Assessment & Clinical Monitoring")
            self.drawRightString(8.5 * 72 - 36, 24, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename="MAATHRU_CARE_APP_CODE_MAPPING_VIVA_GUIDE.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#064E3B'),
        alignment=TA_LEFT
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#047857'),
        alignment=TA_LEFT
    )

    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#475569')
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#047857'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        alignment=TA_LEFT
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#0F172A')
    )

    code_style = ParagraphStyle(
        'Code_Style',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor('#0F172A')
    )

    code_bold = ParagraphStyle(
        'Code_Bold',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#047857')
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=TA_LEFT
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B')
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0F172A')
    )

    table_cell_code = ParagraphStyle(
        'TableCellCode',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#047857')
    )

    q_style = ParagraphStyle(
        'Q_Style',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#991B1B')
    )

    ans_style = ParagraphStyle(
        'Ans_Style',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#1E293B')
    )

    story = []

    # Title Card
    story.append(Paragraph("MAATHRU CARE — COMPLETE APP CODE-LINE MAPPING & VIVA DEFENSE GUIDE", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Exhaustive Code & Screen Reference for Maternal Risk Assessment & Clinical Monitoring", subtitle_style))
    story.append(Spacer(1, 6))

    meta_text = (
        "<b>Candidate:</b> Randinu P.V.K.V (IT22557506) &nbsp;|&nbsp; "
        "<b>Module:</b> Member 2 (Maternal Pregnancy Risk Assessment & Clinical Monitoring)<br/>"
        "<b>Examination Date:</b> October 20, 2026 (2:00 PM) &nbsp;|&nbsp; "
        "<b>Architecture:</b> React Native (Expo) + Node/Express (TypeScript) + Supabase + FastAPI (XGBoost)"
    )
    story.append(Paragraph(meta_text, meta_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#047857"), spaceBefore=2, spaceAfter=8))

    # Introduction Callout
    intro_p = Paragraph(
        "<b>PURPOSE OF THIS DEFENSE GUIDE:</b> When examiners point to any button, card, or screen in the running mobile application "
        "and ask: <i>'Please show us the code for this in your IDE and explain how it works'</i>, this manual provides the exact file path, "
        "line numbers, code snippets, engineering methods, and database connections so you can instantly navigate to it and defend with 100% confidence.",
        body_style
    )
    intro_table = Table([[intro_p]], colWidths=[540])
    intro_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ECFDF5")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#6EE7B7")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(intro_table)
    story.append(Spacer(1, 12))

    # SECTION: QUICK NAVIGATION CHEAT SHEET
    story.append(Paragraph("QUICK IDE NAVIGATION CHEAT-SHEET", h1_style))
    story.append(Paragraph("Press <b>Ctrl + P</b> in VS Code, type the filename, and press <b>Ctrl + G</b> to jump to the exact line number.", body_style))
    story.append(Spacer(1, 6))

    nav_data = [
        [Paragraph("Screen / Feature Visible in App", table_header), Paragraph("File Path in Project", table_header), Paragraph("Exact Line Range", table_header)],
        [Paragraph("Mother: 'Chat Doctor' Quick Action", table_cell_bold), Paragraph("src/app/(mother)/home.tsx", table_cell), Paragraph("Lines 348–360", table_cell_code)],
        [Paragraph("Mother: Chat Room (Messaging & Photos)", table_cell_bold), Paragraph("src/screens/MotherChatScreen.tsx", table_cell), Paragraph("Lines 39–115", table_cell_code)],
        [Paragraph("Mother: Emergency SOS Button", table_cell_bold), Paragraph("src/app/(mother)/home.tsx", table_cell), Paragraph("Lines 179–204", table_cell_code)],
        [Paragraph("Mother: Current Risk Level Card & Trends", table_cell_bold), Paragraph("src/app/(mother)/home.tsx", table_cell), Paragraph("Lines 307–338", table_cell_code)],
        [Paragraph("Mother: Assigned Doctor Card & Status", table_cell_bold), Paragraph("src/app/(mother)/home.tsx", table_cell), Paragraph("Lines 364–393", table_cell_code)],
        [Paragraph("Mother: 13-Vital AI Assessment Form", table_cell_bold), Paragraph("src/screens/RiskAssessmentScreen.tsx", table_cell), Paragraph("Lines 134–185", table_cell_code)],
        [Paragraph("Mother: Baby Kick Counter (Count-to-10)", table_cell_bold), Paragraph("src/screens/KickCounterScreen.tsx", table_cell), Paragraph("Full Screen", table_cell_code)],
        [Paragraph("Mother: Weight Gain Tracker (IOM Chart)", table_cell_bold), Paragraph("src/screens/WeightGainScreen.tsx", table_cell), Paragraph("Full Screen", table_cell_code)],
        [Paragraph("Mother: Clinical Health Report (PDF)", table_cell_bold), Paragraph("src/screens/HealthReportScreen.tsx", table_cell), Paragraph("Full Screen", table_cell_code)],
        [Paragraph("Doctor: Stat Cards & Overview", table_cell_bold), Paragraph("src/screens/DoctorHomeScreen.tsx", table_cell), Paragraph("Lines 47–58, 333–338", table_cell_code)],
        [Paragraph("Doctor: Availability Status Switcher", table_cell_bold), Paragraph("src/screens/DoctorHomeScreen.tsx", table_cell), Paragraph("Lines 258–262, 305–326", table_cell_code)],
        [Paragraph("Doctor: Emergency SOS Modal & Vibration", table_cell_bold), Paragraph("src/screens/DoctorHomeScreen.tsx", table_cell), Paragraph("Lines 102–209, 230–237", table_cell_code)],
        [Paragraph("Doctor: 5-Step Alert Workflow & Notes", table_cell_bold), Paragraph("src/screens/DoctorAlertsScreen.tsx", table_cell), Paragraph("Lines 50–54, 126–148", table_cell_code)],
        [Paragraph("Doctor: AI Clinical Decision Support (CDS)", table_cell_bold), Paragraph("src/components/ClinicalDecisionSupport.tsx", table_cell), Paragraph("Lines 101–400 (10 Rules)", table_cell_code)],
        [Paragraph("Doctor: e-Prescription & AI Summary", table_cell_bold), Paragraph("src/screens/DoctorPatientDetailScreen.tsx", table_cell), Paragraph("Lines 85–140, 300–326", table_cell_code)],
        [Paragraph("Backend: Risk Assessment & Auto-Alert", table_cell_bold), Paragraph("backend/src/routes/risk.routes.ts", table_cell), Paragraph("Lines 25–98", table_cell_code)],
        [Paragraph("Backend: SOS Emergency Endpoint", table_cell_bold), Paragraph("backend/src/routes/alerts.routes.ts", table_cell), Paragraph("Lines 132–185", table_cell_code)],
        [Paragraph("AI Engine: XGBoost Inference & CDS", table_cell_bold), Paragraph("ai-service/risk_service.py", table_cell), Paragraph("Lines 124–375", table_cell_code)],
    ]

    nav_table = Table(nav_data, colWidths=[180, 230, 130])
    nav_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#065F46")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(nav_table)
    story.append(Spacer(1, 14))

    # Helper function for code box
    def make_code_box(code_text, language="TypeScript"):
        p = Paragraph(f"<b>[{language}]</b><br/>" + code_text.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)
        t = Table([[p]], colWidths=[540])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
            ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 7),
            ('RIGHTPADDING', (0,0), (-1,-1), 7),
        ]))
        return t

    # Helper function for callout box
    def make_callout(text, title="EXPLANATION FOR EXAMINER", bg="#EFF6FF", border="#93C5FD"):
        p = Paragraph(f"<b>{title}:</b> {text}", body_style)
        t = Table([[p]], colWidths=[540])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg)),
            ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor(border)),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        return t

    # PART 1: PREGNANT MOTHER'S LOGIN
    story.append(PageBreak())
    story.append(Paragraph("PART 1: PREGNANT MOTHER'S LOGIN (EVERY FEATURE EXPLAINED)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))

    # Feature 1
    story.append(Paragraph("Feature 1: 'Chat Doctor' Quick Action Button", h2_style))
    story.append(Paragraph("<b>Where seen in app:</b> Mother Dashboard -> Quick Actions grid -> Full-width button with message icon.<br/>"
                           "<b>File Path:</b> <font color='#047857'>maathru-care/maathru-care/src/app/(mother)/home.tsx</font><br/>"
                           "<b>Line Range:</b> Lines 348–360", body_style))
    story.append(Spacer(1, 4))
    f1_code = (
        "{\n"
        "  label: 'Chat Doctor',\n"
        "  sub: 'Message your doctor now',\n"
        "  icon: <Bell color=\"#15803D\" size={22} />,\n"
        "  bg: '#fff',\n"
        "  onPress: () => router.push({\n"
        "    pathname: '/mother-chat',\n"
        "    params: {\n"
        "      doctorId: user?.assignedDoctorId ?? '',\n"
        "      doctorName: user?.assignedDoctorName ?? 'Doctor'\n"
        "    }\n"
        "  }),\n"
        "  dark: false,\n"
        "  fullWidth: true\n"
        "}"
    )
    story.append(make_code_box(f1_code, "home.tsx - Lines 348-360"))
    story.append(Spacer(1, 4))
    story.append(make_callout(
        "When the mother taps this button, Expo Router navigates to '/mother-chat' using router.push(), "
        "passing the assigned doctor's unique ID and name from the authenticated user context (user.assignedDoctorId). "
        "This dynamic parameterization prevents hardcoding and ensures direct, authenticated communication with her assigned obstetrician.",
        "HOW IT WORKS (EXAMINER VIVA DEFENSE)"
    ))
    story.append(Spacer(1, 10))

    # Feature 2
    story.append(Paragraph("Feature 2: The Chat Room Itself (Messaging, Polling, Photo Sharing)", h2_style))
    story.append(Paragraph("<b>Where seen in app:</b> Tapping 'Chat Doctor' opens the full two-way chat room with doctor.<br/>"
                           "<b>File Path:</b> <font color='#047857'>maathru-care/maathru-care/src/screens/MotherChatScreen.tsx</font><br/>"
                           "<b>Line Range:</b> Lines 39–115", body_style))
    story.append(Spacer(1, 4))
    f2_code = (
        "// 1. Message Polling (Lines 39-54):\n"
        "const loadMessages = useCallback(async () => {\n"
        "  const res = await api.getMessages(myId, doctorId);\n"
        "  if (res.success) setMessages((res.messages ?? []).slice().reverse());\n"
        "}, [myId, doctorId]);\n\n"
        "useEffect(() => {\n"
        "  loadMessages();\n"
        "  const interval = setInterval(loadMessages, 8000); // 8-second polling\n"
        "  return () => clearInterval(interval);\n"
        "}, [loadMessages]);\n\n"
        "// 2. Optimistic UI Sending (Lines 56-78):\n"
        "const sendText = async () => {\n"
        "  const text = inputText.trim();\n"
        "  if (!text) return;\n"
        "  const optimistic: ChatMessage = {\n"
        "    id: `opt-${Date.now()}`,\n"
        "    senderId: myId,\n"
        "    receiverId: doctorId,\n"
        "    messageText: text,\n"
        "    createdAt: new Date().toISOString(),\n"
        "  };\n"
        "  setMessages((prev) => [optimistic, ...prev]); // Immediate visual feedback\n"
        "  await api.sendMessage(myId, doctorId, text);   // Persist to Supabase\n"
        "};"
    )
    story.append(make_code_box(f2_code, "MotherChatScreen.tsx - Lines 39-78"))
    story.append(Spacer(1, 4))
    story.append(make_callout(
        "Chat synchronization uses an 8-second polling interval (setInterval) to retrieve new messages from backend "
        "GET /api/v1/chat/messages. Message sending employs an Optimistic UI pattern: the message is immediately injected "
        "into the local React state so the UI never stutters, and then dispatched to Supabase 'chat_messages' table via api.sendMessage(). "
        "Photos and ultrasound scans are selected via expo-image-picker with base64 encoding (lines 92-115).",
        "HOW IT WORKS (EXAMINER VIVA DEFENSE)"
    ))
    story.append(Spacer(1, 10))

    # Feature 3
    story.append(Paragraph("Feature 3: Emergency SOS Button & Modal", h2_style))
    story.append(Paragraph("<b>Where seen in app:</b> Large red button at the top of Mother Home: 'SOS Emergency SOS — Alert your doctor immediately'.<br/>"
                           "<b>File Path:</b> <font color='#047857'>maathru-care/maathru-care/src/app/(mother)/home.tsx</font><br/>"
                           "<b>Line Range:</b> Lines 179–204 & Modal Lines 458–485", body_style))
    story.append(Spacer(1, 4))
    f3_code = (
        "// UI Component (home.tsx - Lines 179-204):\n"
        "<TouchableOpacity\n"
        "  onPress={() => setSosConfirmVisible(true)}\n"
        "  className=\"rounded-[20px] py-4 px-5 mb-4 flex-row items-center justify-center\"\n"
        "  style={{ backgroundColor: '#EF4444', elevation: 8 }}\n"
        ">\n"
        "  <ShieldAlert color=\"#FFFFFF\" size={22} />\n"
        "  <View className=\"ml-3\">\n"
        "    <Text className=\"text-white font-bold text-lg\">[SOS] Emergency SOS</Text>\n"
        "    <Text className=\"text-red-200 text-xs\">Alert your doctor immediately</Text>\n"
        "  </View>\n"
        "</TouchableOpacity>\n\n"
        "// Dispatch Handler (home.tsx - Lines 110-135):\n"
        "const handleSendSOS = async () => {\n"
        "  await api.sendEmergencySOS({\n"
        "    patientId: user.id,\n"
        "    patientName: user.fullName,\n"
        "    doctorId: user.assignedDoctorId,\n"
        "    lastBP: `${latestRisk?.inputData?.systolicBP}/${latestRisk?.inputData?.diastolicBP}`,\n"
        "    lastRiskLevel: latestRisk?.riskLevel || 'Unknown'\n"
        "  });\n"
        "};"
    )
    story.append(make_code_box(f3_code, "home.tsx - Emergency SOS Implementation"))
    story.append(Spacer(1, 4))
    story.append(make_callout(
        "Tapping the button opens a safety confirmation modal to avoid accidental triggers. Upon confirmation, "
        "handleSendSOS() calls backend POST /api/v1/alerts/sos (alerts.routes.ts line 132), creating a 'Very High' risk alert "
        "with is_sos=true, probability=1.0, and status='Pending' in Supabase. This immediately activates the doctor's audio-visual alarm.",
        "HOW IT WORKS (EXAMINER VIVA DEFENSE)"
    ))
    story.append(Spacer(1, 10))

    # Feature 4
    story.append(Paragraph("Feature 4: Current Risk Level Card & Risk Trends", h2_style))
    story.append(Paragraph("<b>Where seen in app:</b> Large dynamic card displaying patient risk (e.g. 'Low', '5.0% High-risk probability') with 'Trends' button.<br/>"
                           "<b>File Path:</b> <font color='#047857'>maathru-care/maathru-care/src/app/(mother)/home.tsx</font><br/>"
                           "<b>Line Range:</b> Lines 307–338", body_style))
    story.append(Spacer(1, 4))
    f4_code = (
        "<View className=\"rounded-[20px] p-5 mb-4\" style={{ backgroundColor: riskBg, borderColor: riskColor + '30' }}>\n"
        "  <Text className=\"text-slate-600 text-xs font-semibold uppercase tracking-wider mb-3\">Current Risk Level</Text>\n"
        "  <View className=\"flex-row items-center justify-between\">\n"
        "    <View>\n"
        "      <View className=\"px-4 py-1.5 rounded-full self-start mb-2\" style={{ backgroundColor: riskColor }}>\n"
        "        <Text className=\"text-white font-bold text-sm\">{latestRisk.riskLevel}</Text>\n"
        "      </View>\n"
        "      <Text className=\"text-slate-700 font-bold text-2xl\">{latestRisk.highRiskProbability.toFixed(1)}%</Text>\n"
        "      <Text className=\"text-slate-500 text-xs\">High-risk probability</Text>\n"
        "    </View>\n"
        "    <TouchableOpacity onPress={() => router.push('/(mother)/trends')} className=\"bg-white/80 rounded-[14px] p-3 items-center\">\n"
        "      <TrendingUp color={riskColor} size={24} />\n"
        "      <Text className=\"text-xs mt-1\" style={{ color: riskColor }}>Trends</Text>\n"
        "    </TouchableOpacity>\n"
        "  </View>\n"
        "</View>"
    )
    story.append(make_code_box(f4_code, "home.tsx - Lines 307-338"))
    story.append(Spacer(1, 4))
    story.append(make_callout(
        "On mount, fetchData() calls api.getRiskHistory(user.id). The latest assessment determines the 4-tier risk level "
        "(Low: #10B981, Moderate: #F59E0B, High: #F97316, Very High: #EF4444). The high-risk probability is rendered to 1 decimal place. "
        "The 'Trends' button navigates to /(mother)/trends to inspect chronological risk progression charts.",
        "HOW IT WORKS (EXAMINER VIVA DEFENSE)"
    ))
    story.append(Spacer(1, 10))

    # Feature 5
    story.append(Paragraph("Feature 5: AI Risk Assessment (13-Vital Clinical Input Form)", h2_style))
    story.append(Paragraph("<b>Where seen in app:</b> Quick Action 'AI Risk Assessment' opening the 13-feature clinical screening form.<br/>"
                           "<b>File Path:</b> <font color='#047857'>maathru-care/maathru-care/src/screens/RiskAssessmentScreen.tsx</font><br/>"
                           "<b>Line Range:</b> Lines 120–180", body_style))
    story.append(Spacer(1, 4))
    f5_code = (
        "// 1. Captured State Variables (Lines 120-133):\n"
        "const [age, setAge] = useState('');\n"
        "const [gravida, setGravida] = useState(1);\n"
        "const [tetanus, setTetanus] = useState(1);\n"
        "const [gestationalAge, setGestationalAge] = useState(String(user?.gestationalAgeWeeks ?? ''));\n"
        "const [weightKg, setWeightKg] = useState('');\n"
        "const [heightFt, setHeightFt] = useState('');\n"
        "const [systolicBP, setSystolicBP] = useState('');\n"
        "const [diastolicBP, setDiastolicBP] = useState('');\n"
        "const [fetalPosition, setFetalPosition] = useState(0); // 0=Cephalic, 1=Abnormal\n"
        "const [fetalHeartRate, setFetalHeartRate] = useState('');\n"
        "const [urineSugar, setUrineSugar] = useState(0);       // 0=Negative, 1=Positive\n"
        "const [vdrl, setVdrl] = useState(0);                   // 0=Negative, 1=Positive\n"
        "const [hbsAg, setHbsAg] = useState(0);                 // 0=Negative, 1=Positive\n\n"
        "// 2. Client-Side Validation (Lines 134-150):\n"
        "const validate = (): string | null => {\n"
        "  if (+diastolicBP >= +systolicBP) return 'Diastolic BP must be less than Systolic BP';\n"
        "  if (+age < 14 || +age > 55) return 'Enter a valid age (14–55)';\n"
        "  if (+fetalHeartRate < 60 || +fetalHeartRate > 200) return 'Enter valid fetal heart rate (60–200 bpm)';\n"
        "  return null;\n"
        "};\n\n"
        "// 3. Dispatch to Backend (Lines 152-178):\n"
        "const result = await api.assessRisk(payload);\n"
        "router.push({ pathname: '/risk-result', params: { result: JSON.stringify(result) } });"
    )
    story.append(make_code_box(f5_code, "RiskAssessmentScreen.tsx - Lines 120-178"))
    story.append(Spacer(1, 4))
    story.append(make_callout(
        "Enforces strict physiological constraints before network transmission (e.g. Diastolic must be lower than Systolic). "
        "Payload is sent via api.assessRisk() to Node.js backend POST /api/v1/risk/predict, which proxies to Python FastAPI AI service, "
        "receives XGBoost inference + SHAP directional explanations, and transitions to RiskResultScreen.tsx.",
        "HOW IT WORKS (EXAMINER VIVA DEFENSE)"
    ))
    story.append(Spacer(1, 10))

    # Feature 6
    story.append(Paragraph("Feature 6: Assigned Doctor Card & Live Availability Status", h2_style))
    story.append(Paragraph("<b>Where seen in app:</b> Mother Home card showing 'Dr. Sampath Perera — Available' with real-time colored badge.<br/>"
                           "<b>File Path:</b> <font color='#047857'>maathru-care/maathru-care/src/app/(mother)/home.tsx</font><br/>"
                           "<b>Line Range:</b> Lines 364–393", body_style))
    story.append(Spacer(1, 4))
    f6_code = (
        "{user?.assignedDoctorName && (\n"
        "  <TouchableOpacity\n"
        "    onPress={() => router.push({ pathname: '/mother-doctor-profile', params: { doctorId: user.assignedDoctorId } })}\n"
        "    className=\"bg-white rounded-[20px] p-5 mb-8 border border-slate-100\"\n"
        "  >\n"
        "    <Text className=\"text-slate-800 font-bold\">{user.assignedDoctorName}</Text>\n"
        "    {docStatus && (\n"
        "      <View className=\"flex-row items-center mt-1.5\">\n"
        "        <View className=\"w-2 h-2 rounded-full mr-1.5\" style={{ backgroundColor: docStatus.dot }} />\n"
        "        <Text className=\"text-xs font-semibold\" style={{ color: docStatus.color }}>{docStatus.label}</Text>\n"
        "      </View>\n"
        "    )}\n"
        "  </TouchableOpacity>\n"
        ")}"
    )
    story.append(make_code_box(f6_code, "home.tsx - Lines 364-393"))
    story.append(Spacer(1, 4))
    story.append(make_callout(
        "Displays assigned doctor's real-time clinical availability retrieved via GET /api/v1/doctor/:doctorId/status. "
        "Status states: 'Available' (Green), 'In Surgery' (Amber), 'Away' (Red), 'Busy' (Purple). "
        "Prevents patient anxiety by transparently signaling when the obstetrician is in the operating theater.",
        "HOW IT WORKS (EXAMINER VIVA DEFENSE)"
    ))
    story.append(Spacer(1, 10))

    # Feature 7
    story.append(Paragraph("Feature 7: 'More Tools' Grid (Kick Counter, Weight Tracker, Health Report, Appointments)", h2_style))
    story.append(Paragraph("<b>Where seen in app:</b> 4 cards in a 2x2 grid at the bottom of Mother's Home.<br/>"
                           "<b>File Path:</b> <font color='#047857'>maathru-care/maathru-care/src/app/(mother)/home.tsx</font><br/>"
                           "<b>Line Range:</b> Lines 400–456", body_style))
    story.append(Spacer(1, 4))
    tools_data = [
        [Paragraph("Tool Name", table_header), Paragraph("Destination Screen", table_header), Paragraph("Clinical Purpose & Implementation", table_header)],
        [Paragraph("Kick Counter (L401-413)", table_cell_bold), Paragraph("KickCounterScreen.tsx", table_cell_code), Paragraph("Implements WHO 'Count-to-10' kick protocol. Timer + interactive pulsing tap button. Flags alert if <10 kicks in 2 hours.", table_cell)],
        [Paragraph("Weight Tracker (L415-427)", table_cell_bold), Paragraph("WeightGainScreen.tsx", table_cell_code), Paragraph("Tracks maternal weight against Institute of Medicine (IOM) curves. Generates dynamic SVG chart using react-native-svg.", table_cell)],
        [Paragraph("Health Report (L429-441)", table_cell_bold), Paragraph("HealthReportScreen.tsx", table_cell_code), Paragraph("Generates hospital-grade clinical PDF summarizing vitals, risk history, and prescriptions via expo-print & expo-sharing.", table_cell)],
        [Paragraph("Appointments (L443-455)", table_cell_bold), Paragraph("AppointmentScreen.tsx", table_cell_code), Paragraph("Displays scheduled antenatal checkups with doctor, live countdown timer ('In 2 days, 3 hours'), and pull-to-refresh.", table_cell)],
    ]
    tools_table = Table(tools_data, colWidths=[130, 150, 260])
    tools_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#065F46")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(tools_table)
    story.append(Spacer(1, 14))

    # PART 2: DOCTOR'S LOGIN
    story.append(PageBreak())
    story.append(Paragraph("PART 2: DOCTOR'S LOGIN (CLINICAL & OBSTETRICIAN EXPERIENCE)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))

    # Feature 8
    story.append(Paragraph("Feature 8: Doctor Dashboard Stat Cards & Probability Display", h2_style))
    story.append(Paragraph("<b>Where seen in app:</b> 3 stat cards on Doctor Home: Total Patients, Pending Alerts, Active Cases.<br/>"
                           "<b>File Path:</b> <font color='#047857'>maathru-care/maathru-care/src/screens/DoctorHomeScreen.tsx</font><br/>"
                           "<b>Line Range:</b> Lines 47–67 & 333–338", body_style))
    story.append(Spacer(1, 4))
    f8_code = (
        "// 1. StatCard Reusable Flowable (Lines 47-58):\n"
        "function StatCard({ title, value, icon, accent }: { title: string; value: number | string; icon: React.ReactNode; accent: string }) {\n"
        "  return (\n"
        "    <View className=\"flex-1 bg-white rounded-[20px] p-4 mx-1\" style={{ elevation: 3 }}>\n"
        "      <View className=\"w-9 h-9 rounded-full items-center justify-center mb-3\" style={{ backgroundColor: accent + '20' }}>\n"
        "        {icon}\n"
        "      </View>\n"
        "      <Text className=\"text-2xl font-bold text-slate-800\">{value}</Text>\n"
        "      <Text className=\"text-xs text-slate-500 mt-1 font-medium\">{title}</Text>\n"
        "    </View>\n"
        "  );\n"
        "}\n\n"
        "// 2. Safe 100% Clamping Logic (Lines 60-67):\n"
        "function formatProbability(p: number | undefined | null): string {\n"
        "  if (p == null || isNaN(p)) return '0%';\n"
        "  const raw = Number(p);\n"
        "  let pct = raw > 1 ? raw : raw * 100;\n"
        "  if (pct > 100) pct = 100; // Strict mathematical upper bound\n"
        "  if (pct < 0) pct = 0;\n"
        "  return pct % 1 === 0 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`;\n"
        "}"
    )
    story.append(make_code_box(f8_code, "DoctorHomeScreen.tsx - StatCards & Probability"))
    story.append(Spacer(1, 4))
    story.append(make_callout(
        "Stat cards compute aggregated metrics: Total Patients from assigned roster, Pending Alerts (status='Pending'), "
        "and Active Cases (patients with riskLevel != 'Low'). The formatProbability function handles dual-scale outputs "
        "(0.0-1.0 or 0-100) and clamps strictly between 0% and 100%, preventing display anomalies.",
        "HOW IT WORKS (EXAMINER VIVA DEFENSE)"
    ))
    story.append(Spacer(1, 10))

    # Feature 9
    story.append(Paragraph("Feature 9: Emergency SOS Audio-Visual Interceptor Modal & Vibration", h2_style))
    story.append(Paragraph("<b>Where seen in app:</b> Full-screen emergency modal that flashes red and triggers haptic vibration on doctor's device.<br/>"
                           "<b>File Path:</b> <font color='#047857'>maathru-care/maathru-care/src/screens/DoctorHomeScreen.tsx</font><br/>"
                           "<b>Line Range:</b> Lines 102–170 & Polling Lines 248–253", body_style))
    story.append(Spacer(1, 4))
    f9_code = (
        "function SOSEmergencyModal({ alert, onDismiss }: { alert: DoctorAlert | null; onDismiss: () => void }) {\n"
        "  const [blink, setBlink] = useState(true);\n"
        "  useEffect(() => {\n"
        "    if (!alert) return;\n"
        "    // Pulse vibration pattern: vibrate 500ms, pause 300ms, repeat 5 times\n"
        "    const pattern = [0, 500, 300, 500, 300, 500, 300, 500, 300, 500];\n"
        "    Vibration.vibrate(pattern);\n"
        "    const interval = setInterval(() => setBlink(b => !b), 500); // 500ms flashing\n"
        "    return () => { clearInterval(interval); Vibration.cancel(); };\n"
        "  }, [alert]);\n"
        "  // Renders full-screen Modal with patient name, time, last vitals, and one-tap contact buttons\n"
        "}\n\n"
        "// Background SOS Polling (Lines 248-253):\n"
        "useEffect(() => {\n"
        "  const interval = setInterval(() => fetchData(true), 10000); // 10-second polling\n"
        "  return () => clearInterval(interval);\n"
        "}, [fetchData]);"
    )
    story.append(make_code_box(f9_code, "DoctorHomeScreen.tsx - SOS Emergency Interceptor"))
    story.append(Spacer(1, 4))
    story.append(make_callout(
        "DoctorHomeScreen polls GET /api/v1/alerts/doctor/:doctorId every 10 seconds. When an alert with is_sos=true is detected, "
        "it mounts SOSEmergencyModal in fullScreen mode. React Native Vibration API runs a repeating haptic pattern while a stateful "
        "interval alternates background color between #EF4444 and #B91C1C, creating an unmistakable clinical triage alert.",
        "HOW IT WORKS (EXAMINER VIVA DEFENSE)"
    ))
    story.append(Spacer(1, 10))

    # Feature 10
    story.append(Paragraph("Feature 10: Clinical Alerts 5-Step Workflow & Doctor Clinical Notes", h2_style))
    story.append(Paragraph("<b>Where seen in app:</b> Doctor's 'Alerts' tab -> Expand any patient card -> Update Status buttons & Clinical Notes.<br/>"
                           "<b>File Path:</b> <font color='#047857'>maathru-care/maathru-care/src/screens/DoctorAlertsScreen.tsx</font><br/>"
                           "<b>Line Range:</b> Lines 50–54 & Lines 121–150", body_style))
    story.append(Spacer(1, 4))
    f10_code = (
        "// 1. Clinical Governance Workflow Array (Lines 50-54):\n"
        "const WORKFLOW_STEPS = [\n"
        "  { label: 'Mark Reviewed', targetStatus: 'Reviewed', icon: <CheckCircle size={14} color=\"#3B82F6\" />, color: '#3B82F6' },\n"
        "  { label: 'Mark Contacted', targetStatus: 'Contacted', icon: <Phone size={14} color=\"#8B5CF6\" />, color: '#8B5CF6' },\n"
        "  { label: 'Close Alert', targetStatus: 'Closed', icon: <CheckCircle size={14} color=\"#10B981\" />, color: '#10B981' },\n"
        "];\n\n"
        "// 2. Action Handler & Save Notes (Lines 79-83):\n"
        "const handleSaveNotes = async () => {\n"
        "  setSaving(true);\n"
        "  await onUpdateStatus(alert.id, alert.status, notes); // Calls PATCH /api/v1/alerts/:alertId/status\n"
        "  setSaving(false);\n"
        "};"
    )
    story.append(make_code_box(f10_code, "DoctorAlertsScreen.tsx - Lines 50-83"))
    story.append(Spacer(1, 4))
    story.append(make_callout(
        "Provides closed-loop clinical audit governance. Alerts cannot be dismissed without an explicit doctor action. "
        "Tapping 'Mark Reviewed', 'Mark Contacted', or 'Close Alert' triggers backend PATCH /api/v1/alerts/:alertId/status, "
        "persisting status and doctorNotes to Supabase. This fulfills medical-legal documentation standards.",
        "HOW IT WORKS (EXAMINER VIVA DEFENSE)"
    ))
    story.append(Spacer(1, 10))

    # Feature 11: CDS (The 10 WHO Rules)
    story.append(PageBreak())
    story.append(Paragraph("Feature 11: AI Clinical Decision Support (CDS) — The 10 WHO Rules", h2_style))
    story.append(Paragraph("<b>Where seen in app:</b> Patient Detail Screen -> Expandable 'AI Clinical Decision Support' section.<br/>"
                           "<b>File Path:</b> <font color='#047857'>maathru-care/maathru-care/src/components/ClinicalDecisionSupport.tsx</font><br/>"
                           "<b>Line Range:</b> Lines 101–400", body_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("The component evaluates patient data against 10 deterministic medical rules derived from the <b>WHO Antenatal Care Guidelines (2016)</b>:", body_style))
    story.append(Spacer(1, 4))

    cds_data = [
        [Paragraph("Rule # & Name", table_header), Paragraph("Exact Code Condition", table_header), Paragraph("Severity", table_header), Paragraph("WHO Clinical Guideline & Action", table_header)],
        [Paragraph("Rule 1: Preeclampsia Warning (L101-127)", table_cell_bold), Paragraph("v.systolicBP > 140 || v.diastolicBP > 90 in last 3 readings", table_cell_code), Paragraph("<font color='#EF4444'><b>URGENT</b></font>", table_cell), Paragraph("WHO ANC Rec C.1 & C.2: Immediate urine protein dipstick test. Consider low-dose aspirin (75-100mg/d).", table_cell)],
        [Paragraph("Rule 2: Gestational Hypertension (L129-154)", table_cell_bold), Paragraph("systolic > 130 || diastolic > 85 across >= 2 readings", table_cell_code), Paragraph("<font color='#F97316'><b>WARNING</b></font>", table_cell), Paragraph("WHO ANC Rec B.1.4: Stepped surveillance. Schedule 1-week clinical review and home BP monitoring.", table_cell)],
        [Paragraph("Rule 3: Advanced Maternal Age (L156-176)", table_cell_bold), Paragraph("patient.age >= 35", table_cell_code), Paragraph("<font color='#3B82F6'><b>INFO</b></font>", table_cell), Paragraph("FIGO 2019: Genetic counseling, aneuploidy screening (NIPT), early 75g oral glucose tolerance test (OGTT).", table_cell)],
        [Paragraph("Rule 4: High-Risk Pregnancy AI Flag (L179-210)", table_cell_bold), Paragraph("latestRisk.riskLevel === 'High' || 'Very High'", table_cell_code), Paragraph("<font color='#EF4444'><b>URGENT</b></font>", table_cell), Paragraph("WHO ANC Health Systems: Escalate contact to weekly visits. Non-stress cardiotocography (CTG) monitoring.", table_cell)],
        [Paragraph("Rule 5: Grand Multigravida (L212-233)", table_cell_bold), Paragraph("patient.gravida >= 4", table_cell_code), Paragraph("<font color='#F97316'><b>WARNING</b></font>", table_cell), Paragraph("WHO PPH Guidelines: High risk for uterine atony & placenta previa. Institutional delivery with on-site blood bank.", table_cell)],
        [Paragraph("Rule 6: Rh-Negative Blood Protocol (L235-262)", table_cell_bold), Paragraph("patient.bloodGroup.includes('-')", table_cell_code), Paragraph("<font color='#3B82F6'><b>INFO</b></font>", table_cell), Paragraph("WHO Rh Isoimmunization: Administer Anti-D immunoglobulin at 28 weeks and within 72 hrs post-delivery.", table_cell)],
        [Paragraph("Rule 7: Third Trimester Monitoring (L264-285)", table_cell_bold), Paragraph("patient.gestationalWeek >= 28", table_cell_code), Paragraph("<font color='#10B981'><b>INFO</b></font>", table_cell), Paragraph("WHO ANC Rec E.4: Daily kick counting, repeat full blood count for anemia, GBS screening at 36 weeks.", table_cell)],
        [Paragraph("Rule 8: Near Term Preparation (L287-308)", table_cell_bold), Paragraph("patient.gestationalWeek >= 36", table_cell_code), Paragraph("<font color='#10B981'><b>INFO</b></font>", table_cell), Paragraph("WHO Intrapartum Guidelines: Weekly cervical checks, verify cephalic presentation, review spontaneous labor signs.", table_cell)],
        [Paragraph("Rule 9: Rapid Weight Gain (L310-370)", table_cell_bold), Paragraph("Weight gain > 2 kg in a single week across vitals logs", table_cell_code), Paragraph("<font color='#F97316'><b>WARNING</b></font>", table_cell), Paragraph("ACOG & WHO: Screen for occult fluid retention, maternal edema, and sudden-onset preeclampsia.", table_cell)],
        [Paragraph("Rule 10: Polypharmacy Review (L372-400)", table_cell_bold), Paragraph("prescriptions.length > 3", table_cell_code), Paragraph("<font color='#3B82F6'><b>INFO</b></font>", table_cell), Paragraph("Clinical Pharmacology Guideline: Review drug-drug interactions and eliminate unnecessary prenatal supplements.", table_cell)],
    ]
    cds_table = Table(cds_data, colWidths=[120, 140, 60, 220])
    cds_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#065F46")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(cds_table)
    story.append(Spacer(1, 6))
    story.append(make_callout(
        "The CDS uses React useMemo() to reactively compute recommendations whenever patient vitals, risk assessments, "
        "or prescriptions change. Recommendations sort automatically by severity (URGENT first, then WARNING, then INFO). "
        "Each card expands to display exact clinical references and immediate recommended physician actions.",
        "HOW IT WORKS (EXAMINER VIVA DEFENSE)"
    ))
    story.append(Spacer(1, 10))

    # Feature 12
    story.append(Paragraph("Feature 12: Doctor e-Prescription & AI Pre-Appointment Summary", h2_style))
    story.append(Paragraph("<b>Where seen in app:</b> Patient Detail Screen -> Action buttons: 'AI Summary', 'Schedule Appt', 'Prescribe'.<br/>"
                           "<b>File Path:</b> <font color='#047857'>maathru-care/maathru-care/src/screens/DoctorPatientDetailScreen.tsx</font><br/>"
                           "<b>Line Range:</b> Lines 85–140 & Lines 302–308", body_style))
    story.append(Spacer(1, 4))
    f12_code = (
        "// 1. e-Prescription Builder (Lines 85-140):\n"
        "// Supports dynamic multi-medication entries with Dosage, Frequency chips, and Duration chips:\n"
        "const FREQ_OPTIONS = ['Once daily', 'Twice daily', 'TDS (3x)', 'QDS (4x)', 'As needed'];\n"
        "const DUR_OPTIONS = ['3 days', '5 days', '1 week', '2 weeks', '1 month', 'Ongoing'];\n"
        "// Submits to POST /api/v1/prescriptions, persisting medication JSON array to Supabase\n\n"
        "// 2. AI Pre-Appointment Briefing Summary (Lines 302-308):\n"
        "<TouchableOpacity onPress={handleGenerateSummary} className=\"flex-1 bg-emerald-700 rounded-[16px] py-4 items-center\">\n"
        "  <Sparkles color=\"#FFFFFF\" size={18} />\n"
        "  <Text className=\"text-white font-bold text-xs mt-1 text-center\">AI Summary</Text>\n"
        "</TouchableOpacity>"
    )
    story.append(make_code_box(f12_code, "DoctorPatientDetailScreen.tsx - Lines 85-308"))
    story.append(Spacer(1, 4))
    story.append(make_callout(
        "Provides doctors with rapid consultation tools: the e-prescription builder enforces structured medication formatting "
        "(dosage, frequency, duration) stored in Supabase 'prescriptions'. The 'AI Summary' feature aggregates historical vitals, "
        "symptoms, and risk trajectory into a structured 30-second pre-consultation clinical briefing.",
        "HOW IT WORKS (EXAMINER VIVA DEFENSE)"
    ))
    story.append(Spacer(1, 14))

    # PART 3: BACKEND API GATEWAY & DATABASE
    story.append(PageBreak())
    story.append(Paragraph("PART 3: BACKEND API GATEWAY & DATABASE (EXPRESS + SUPABASE)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))

    story.append(Paragraph("Route 1: Risk Assessment & Auto-Alert Pipeline (POST /api/v1/risk/predict)", h2_style))
    story.append(Paragraph("<b>File Path:</b> <font color='#047857'>backend/src/routes/risk.routes.ts</font><br/>"
                           "<b>Line Range:</b> Lines 25–98", body_style))
    story.append(Spacer(1, 4))
    b1_code = (
        "router.post('/predict', async (req: Request, res: Response): Promise<void> => {\n"
        "  const validated = MaternalRiskSchema.parse(req.body); // Zod validation\n"
        "  const supabase = db.getSupabase();\n\n"
        "  // 1. Call Python AI Service\n"
        "  const predictionResult = await AiClientService.predictRisk(validated);\n\n"
        "  // 2. Insert into Supabase risk_assessments table\n"
        "  const { data: savedAssessment } = await supabase.from('risk_assessments').insert({\n"
        "    patient_id: patientId,\n"
        "    risk_level: predictionResult.riskLevel,\n"
        "    high_risk_probability: predictionResult.highRiskProbability,\n"
        "    input_data: validated,\n"
        "    shap_values: predictionResult.shapValues,\n"
        "  }).select().single();\n\n"
        "  // 3. Auto-Flag Doctor Alert if High or Very High (Lines 66-96)\n"
        "  if (predictionResult.isAlertRequired) {\n"
        "    await supabase.from('alerts').insert({\n"
        "      patient_id: patientId,\n"
        "      patient_name: patient?.full_name || 'Patient',\n"
        "      doctor_id: patient?.assigned_doctor_id,\n"
        "      assessment_id: savedAssessment?.id,\n"
        "      risk_level: predictionResult.riskLevel,\n"
        "      probability: predictionResult.highRiskProbability > 1 ? predictionResult.highRiskProbability / 100 : predictionResult.highRiskProbability,\n"
        "      alert_title: `${predictionResult.riskLevel} Maternal Risk Flagged`,\n"
        "      alert_message: predictionResult.summary,\n"
        "      status: 'Pending',\n"
        "    });\n"
        "  }\n"
        "  res.status(200).json(assessment);\n"
        "});"
    )
    story.append(make_code_box(b1_code, "risk.routes.ts - Lines 25-98"))
    story.append(Spacer(1, 4))
    story.append(make_callout(
        "Demonstrates end-to-end integration: validates input via Zod schema, dispatches to Python FastAPI AI service, "
        "persists results and SHAP explainability values into Supabase, and automatically creates a doctor alert if "
        "risk is flagged as High or Very High. No doctor intervention is required to receive the alert.",
        "HOW IT WORKS (EXAMINER VIVA DEFENSE)"
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Route 2: Emergency SOS Endpoint (POST /api/v1/alerts/sos)", h2_style))
    story.append(Paragraph("<b>File Path:</b> <font color='#047857'>backend/src/routes/alerts.routes.ts</font><br/>"
                           "<b>Line Range:</b> Lines 132–185", body_style))
    story.append(Spacer(1, 4))
    b2_code = (
        "router.post('/sos', async (req: Request, res: Response): Promise<void> => {\n"
        "  const { patientId, patientName, doctorId, lastBP, lastRiskLevel } = req.body;\n"
        "  const supabase = db.getSupabase();\n\n"
        "  const { data } = await supabase.from('alerts').insert([{\n"
        "    patient_id: patientId,\n"
        "    patient_name: patientName,\n"
        "    doctor_id: doctorId,\n"
        "    alert_title: `[SOS] EMERGENCY SOS — ${patientName}`,\n"
        "    alert_message: `Patient ${patientName} triggered SOS. Last BP: ${lastBP}, Last Risk: ${lastRiskLevel}.`,\n"
        "    risk_level: 'Very High',\n"
        "    probability: 1.0,\n"
        "    is_sos: true,\n"
        "    status: 'Pending',\n"
        "  }]).select().single();\n\n"
        "  res.status(201).json({ success: true, alert: data });\n"
        "});"
    )
    story.append(make_code_box(b2_code, "alerts.routes.ts - Lines 132-185"))
    story.append(Spacer(1, 14))

    # PART 4: AI MICROSERVICE (PYTHON FASTAPI & XGBOOST)
    story.append(PageBreak())
    story.append(Paragraph("PART 4: AI MICROSERVICE (PYTHON FASTAPI & XGBOOST)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))

    story.append(Paragraph("AI Service Architecture & SHAP Explainability Engine", h2_style))
    story.append(Paragraph("<b>Files:</b> <font color='#047857'>ai-service/main.py</font> (FastAPI Lifespan) & "
                           "<font color='#047857'>ai-service/risk_service.py</font> (XGBoost & TreeSHAP)<br/>"
                           "<b>Line Range:</b> Lines 124–375 of risk_service.py", body_style))
    story.append(Spacer(1, 4))

    ai_text = (
        "<b>1. Exact 13-Feature Contract (Lines 15-29):</b><br/>"
        "Age, Gravida, TetanusVaccination, GestationalAge, WeightKg, HeightFt, FetalPosition, "
        "FetalHeartRate, UrineSugar, VDRL, HBsAg, SystolicBP, DiastolicBP.<br/><br/>"
        "<b>2. 4-Tier Risk Classification (Lines 72-88):</b><br/>"
        "&bull; <b>Low Risk:</b> &lt; 30% High-risk probability (#10B981 Emerald, Alert = False)<br/>"
        "&bull; <b>Moderate Risk:</b> 30% – 59.9% High-risk probability (#F59E0B Amber, Alert = False)<br/>"
        "&bull; <b>High Risk:</b> 60% – 79.9% High-risk probability (#F97316 Orange, Alert = True)<br/>"
        "&bull; <b>Very High Risk:</b> &ge; 80% High-risk probability (#EF4444 Red, Alert = True)<br/><br/>"
        "<b>3. SHAP Explainability Layer (Lines 180-335):</b><br/>"
        "Rather than outputting an opaque probability score, the engine computes directional SHAP contributions "
        "(contribution: 'increases_risk' vs 'decreases_risk') for each biomarker. For example, Systolic BP &gt; 140 mmHg "
        "yields a positive SHAP value of +0.95 (increases risk), whereas reassuring Fetal Heart Rate (140 bpm) yields -0.50 (decreases risk). "
        "This transparency directly empowers clinical review."
    )
    story.append(Paragraph(ai_text, body_style))
    story.append(Spacer(1, 14))

    # PART 5: VIVA "GOLDEN DEFENSE ANSWERS"
    story.append(Paragraph("PART 5: VIVA 'GOLDEN DEFENSE ANSWERS' (EXAMINER TRAPS)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))

    qa_list = [
        (
            "Q1: Why did you build the Clinical Decision Support (CDS) in code rather than just letting the AI model make clinical decisions?",
            "A pure black-box machine learning model cannot guarantee adherence to clinical protocols during edge cases. In healthcare engineering, clinical safety requires a hybrid architecture. Our XGBoost model provides statistical risk probability based on 13 features, while our Clinical Decision Support component implements deterministic WHO Antenatal Care Guidelines. This dual-layer architecture guarantees that acute danger signs—such as severe preeclampsia or Rh incompatibility—are immediately flagged with evidence-based action recommendations, regardless of statistical variance."
        ),
        (
            "Q2: Where are chat messages, patient vitals, and doctor alerts stored? Is it mock data?",
            "No mock data is used. In backend/src/routes/chat.routes.ts, alerts.routes.ts, and risk.routes.ts, we connect to PostgreSQL on Supabase via @supabase/supabase-js. You can see our queries executing .from('chat_messages').insert() and .from('alerts').select(). Both mother and doctor poll these endpoints at 8-to-10-second intervals to achieve real-time synchronization across devices."
        ),
        (
            "Q3: Why did you choose XGBoost over a Deep Learning neural network (like LSTM or CNN)?",
            "Our maternal dataset consists of 13 tabular physiological features and clinical biomarkers. Extensive empirical research (e.g., Grinsztajn et al., 2022) demonstrates that gradient-boosted decision tree architectures like XGBoost consistently outperform neural networks on tabular datasets without overfitting. Furthermore, XGBoost integrates directly with TreeSHAP, providing exact, mathematically consistent Shapley values for explainability—a mandatory requirement for medical AI transparency under WHO guidelines."
        ),
        (
            "Q4: How does the system handle an emergency if the mother's risk spikes?",
            "When the mother triggers SOS or when an assessment predicts High/Very High risk, the backend automatically flags an alert in Supabase. The doctor's device polls this endpoint every 10 seconds. When an SOS alert arrives, DoctorHomeScreen intercepts normal interaction, activates a repeating 5-pulse haptic vibration via React Native's Vibration API, and displays a flashing red full-screen modal showing the patient's identity and latest blood pressure reading."
        )
    ]

    for q, a in qa_list:
        qa_flow = [
            Paragraph(q, q_style),
            Spacer(1, 2),
            Paragraph(f"<b>Your Defense Answer:</b> <i>\"{a}\"</i>", ans_style)
        ]
        qa_t = Table([[qa_flow]], colWidths=[540])
        qa_t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF2F2")),
            ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#FECACA")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(qa_t)
        story.append(Spacer(1, 8))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"SUCCESS: Generated PDF at {filename}")

if __name__ == "__main__":
    build_pdf("c:/MAATHRU CARE  - IT22557506/MAATHRU_CARE_APP_CODE_MAPPING_VIVA_GUIDE.pdf")
