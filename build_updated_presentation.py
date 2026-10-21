import os
import copy
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def update_presentation():
    src_file = "Maathru_Care_Creative_Presentation.pptx 3.pptx"
    out_file = "Maathru_Care_Final_Presentation_Updated.pptx"

    prs = pptx.Presentation(src_file)
    print(f"Loaded presentation: {len(prs.slides)} slides")

    # -------------------------------------------------------------
    # 1. UPDATE SLIDE 8 (Member 2 Component Overview)
    # -------------------------------------------------------------
    slide8 = prs.slides[7] # 0-indexed slide 8
    
    # Update text shapes in Slide 8
    for s in slide8.shapes:
        if s.has_text_frame:
            txt = s.text_frame.text.strip()
            # Author header
            if "02   IT22557506" in txt:
                p = s.text_frame.paragraphs[0]
                p.text = "02   IT22557506   Randinu P.V.K.V"
                p.font.name = "Calibri"
                p.font.size = Pt(11)
                p.font.bold = True
                p.font.color.rgb = RGBColor(84, 131, 107) # 54836B
            # Title
            elif "Pregnancy Risk Monitoring" in txt:
                p = s.text_frame.paragraphs[0]
                p.text = "Maternal Pregnancy Risk Assessment & Clinical Monitoring"
                p.font.name = "Calibri"
                p.font.size = Pt(28)
                p.font.bold = True
                p.font.color.rgb = RGBColor(23, 75, 72) # 174B48
            # Tagline
            elif "Daily information supports" in txt:
                s.text_frame.clear()
                p1 = s.text_frame.paragraphs[0]
                p1.text = "Explainable AI risk prediction, WHO clinical"
                p1.font.name = "Calibri"
                p1.font.size = Pt(22)
                p1.font.bold = True
                p1.font.color.rgb = RGBColor(23, 75, 72)
                p2 = s.text_frame.add_paragraph()
                p2.text = "decision support, and doctor triage workflows"
                p2.font.name = "Calibri"
                p2.font.size = Pt(22)
                p2.font.bold = True
                p2.font.color.rgb = RGBColor(23, 75, 72)
            # Health inputs title
            elif txt == "Health inputs":
                p = s.text_frame.paragraphs[0]
                p.text = "13-Feature Clinical Assessment"
                p.font.name = "Calibri"
                p.font.size = Pt(18)
                p.font.bold = True
                p.font.color.rgb = RGBColor(23, 75, 72)
            # Health inputs desc
            elif "Blood pressure, blood sugar" in txt:
                p = s.text_frame.paragraphs[0]
                p.text = "Systolic/Diastolic BP, blood sugar, VDRL, HBsAg, fetal heart rate, gestational age, weight, and symptoms"
                p.font.name = "Calibri"
                p.font.size = Pt(13)
                p.font.color.rgb = RGBColor(82, 105, 96)
            # Risk information title
            elif txt == "Risk information":
                p = s.text_frame.paragraphs[0]
                p.text = "Tuned XGBoost & SHAP Explainability"
                p.font.name = "Calibri"
                p.font.size = Pt(18)
                p.font.bold = True
                p.font.color.rgb = RGBColor(23, 75, 72)
            # Risk information desc
            elif "Low, Medium or High" in txt:
                p = s.text_frame.paragraphs[0]
                p.text = "98.00% accuracy model, 4-tier triage risk categories, SHAP local feature attribution, and automated doctor alerts"
                p.font.name = "Calibri"
                p.font.size = Pt(13)
                p.font.color.rgb = RGBColor(82, 105, 96)
            # Outdated LSTM note
            elif "The source describes long-term symptom analysis using LSTM." in txt:
                p = s.text_frame.paragraphs[0]
                p.text = "Integrated with WHO 2016 Antenatal Care guidelines for automated clinical decision support (CDS)."
                p.font.name = "Calibri"
                p.font.size = Pt(13)
                p.font.bold = True
                p.font.color.rgb = RGBColor(84, 131, 107)

    # Replace Slide 8 image with the new 3D Pixar consultation illustration
    new_img1 = "maternal_risk_ai_consultation.jpg"
    if os.path.exists(new_img1):
        for s in list(slide8.shapes):
            if s.shape_type == pptx.enum.shapes.MSO_SHAPE_TYPE.PICTURE:
                left, top, width, height = s.left, s.top, s.width, s.height
                sp_elem = s._element
                sp_elem.getparent().remove(sp_elem) # Remove old picture
                slide8.shapes.add_picture(new_img1, left, top, width, height)
                print("Updated picture on Slide 8 with maternal_risk_ai_consultation.jpg")
                break

    # -------------------------------------------------------------
    # 2. CREATE SLIDE 8A (Research: Problem, Gap, Findings & Metrics)
    #    Modeled after Slide 10 layout
    # -------------------------------------------------------------
    layout_title_body = prs.slide_layouts[6] # 1_Title and body
    slide8a = prs.slides.add_slide(layout_title_body)
    
    # Title
    t_shape = slide8a.shapes.add_textbox(812800, 700000, 10883392, 472440)
    p = t_shape.text_frame.paragraphs[0]
    p.text = "Research: problem, gap and findings (Member 2)"
    p.font.name = "Georgia"
    p.font.size = Pt(26)
    p.font.bold = True
    p.font.color.rgb = RGBColor(15, 118, 110) # 0F766E

    # Left Column: Problem, Gap, Objective boxes
    left_x = 815975
    box_w = 5175250
    box_h = 1360170

    # 1. Problem Box
    b1 = slide8a.shapes.add_shape(MSO_SHAPE.RECTANGLE, left_x, 1491615, box_w, box_h)
    b1.fill.solid()
    b1.fill.fore_color.rgb = RGBColor(248, 250, 252)
    b1.line.color.rgb = RGBColor(203, 213, 225)
    tb1_t = slide8a.shapes.add_textbox(left_x + 200000, 1600000, box_w - 400000, 250000)
    p = tb1_t.text_frame.paragraphs[0]
    p.text = "Problem"
    p.font.name = "Georgia"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = RGBColor(31, 41, 55)
    tb1_d = slide8a.shapes.add_textbox(left_x + 200000, 1850000, box_w - 400000, 850000)
    p = tb1_d.text_frame.paragraphs[0]
    p.text = "Maternal complications (preeclampsia, gestational hypertension, GDM) escalate rapidly between monthly clinic visits. In Sri Lanka, delayed detection of vital abnormalities is a primary cause of preventable maternal morbidity."
    p.font.name = "Georgia"
    p.font.size = Pt(10)
    p.font.color.rgb = RGBColor(55, 65, 81)

    # 2. Gap Box
    b2 = slide8a.shapes.add_shape(MSO_SHAPE.RECTANGLE, left_x, 2985135, box_w, box_h)
    b2.fill.solid()
    b2.fill.fore_color.rgb = RGBColor(248, 250, 252)
    b2.line.color.rgb = RGBColor(203, 213, 225)
    tb2_t = slide8a.shapes.add_textbox(left_x + 200000, 3100000, box_w - 400000, 250000)
    p = tb2_t.text_frame.paragraphs[0]
    p.text = "Gap"
    p.font.name = "Georgia"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = RGBColor(31, 41, 55)
    tb2_d = slide8a.shapes.add_textbox(left_x + 200000, 3350000, box_w - 400000, 850000)
    p = tb2_d.text_frame.paragraphs[0]
    p.text = "Existing mobile apps provide passive generic advice or uninterpretable black-box predictions without clinical explainability, lacking WHO guideline alignment and doctor-in-the-loop alert governance."
    p.font.name = "Georgia"
    p.font.size = Pt(10)
    p.font.color.rgb = RGBColor(55, 65, 81)

    # 3. Objective Box
    b3 = slide8a.shapes.add_shape(MSO_SHAPE.RECTANGLE, left_x, 4478655, box_w, box_h)
    b3.fill.solid()
    b3.fill.fore_color.rgb = RGBColor(248, 250, 252)
    b3.line.color.rgb = RGBColor(203, 213, 225)
    tb3_t = slide8a.shapes.add_textbox(left_x + 200000, 4600000, box_w - 400000, 250000)
    p = tb3_t.text_frame.paragraphs[0]
    p.text = "Objective"
    p.font.name = "Georgia"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = RGBColor(31, 41, 55)
    tb3_d = slide8a.shapes.add_textbox(left_x + 200000, 4850000, box_w - 400000, 850000)
    p = tb3_d.text_frame.paragraphs[0]
    p.text = "Develop an explainable, evidence-based maternal risk estimation and clinical decision-support module that assists licensed obstetricians through automated triage and standardized WHO ANC-2016 protocols."
    p.font.name = "Georgia"
    p.font.size = Pt(10)
    p.font.color.rgb = RGBColor(55, 65, 81)

    # Right Column: 4 Stat Cards (Numbers + Descriptions)
    right_x = 6400800
    stat_w = 1400000
    desc_x = 7900000
    desc_w = 3600000

    metrics = [
        ("98.00%", "Held-out test accuracy of Tuned XGBoost model. 196 out of 200 test patients correctly classified; 97.74% Sensitivity.", 1600000),
        ("98.00%", "5-fold Stratified Cross-Validation accuracy (+/- 0.71%). Best GridSearchCV validation score reached 98.10%.", 2750000),
        ("0.98", "High-risk class Macro F1-score. Precision: 0.99, Recall: 0.98 on identifying high-risk pregnancies.", 3900000),
        ("0.9176", "Spearman rank correlation (p = 0.000010) demonstrating empirical consensus between SHAP values and Random Forest Gini importance.", 5050000),
    ]

    for num_str, desc_str, y_pos in metrics:
        # Number
        nt = slide8a.shapes.add_textbox(right_x, y_pos, stat_w, 600000)
        p = nt.text_frame.paragraphs[0]
        p.text = num_str
        p.font.name = "Georgia"
        p.font.size = Pt(25)
        p.font.bold = True
        p.font.color.rgb = RGBColor(16, 185, 129) # Emerald #10B981
        
        # Description
        dt = slide8a.shapes.add_textbox(desc_x, y_pos - 40000, desc_w, 700000)
        p = dt.text_frame.paragraphs[0]
        p.text = desc_str
        p.font.name = "Georgia"
        p.font.size = Pt(10)
        p.font.color.rgb = RGBColor(31, 41, 55)

    print("Created Slide 8A: Research Problem, Gap, Findings & Metrics")

    # -------------------------------------------------------------
    # 3. CREATE SLIDE 8B (Procedure: How It Was Built)
    #    Modeled after Slide 11 layout
    # -------------------------------------------------------------
    slide8b = prs.slides.add_slide(layout_title_body)
    
    # Title
    t_shape = slide8b.shapes.add_textbox(812800, 700000, 10883392, 472440)
    p = t_shape.text_frame.paragraphs[0]
    p.text = "Procedure: how it was built (Member 2)"
    p.font.name = "Georgia"
    p.font.size = Pt(26)
    p.font.bold = True
    p.font.color.rgb = RGBColor(15, 118, 110)

    steps = [
        ("1", "Audit and clean clinical data", "Curated 998 maternal clinical records. Removed identifying data and enforced a strict 13-feature clinical contract (Age, Gravida, Tetanus, GestationalAge, Weight, Height, FetalPosition, FHR, UrineSugar, VDRL, HBsAg, SystolicBP, DiastolicBP).", 1463040),
        ("2", "Tuned XGBoost model", "XGBClassifier (n=400, learning_rate=0.05, max_depth=3, logloss). Shallow tree depth and L1/L2 regularization prevent overfitting on clinical outliers, outperforming Logistic Regression (79.0%) and Random Forest (97.5%).", 2354025),
        ("3", "SHAP Explainability", "shap.TreeExplainer (v0.51.0) calculates marginal feature attributions. Top global predictors identified: Maternal Weight, Tetanus Vaccination, Diastolic BP, Systolic BP, and VDRL.", 3245088),
        ("4", "WHO Decision Support (CDS)", "Codified 10 evidence-based clinical rules from WHO Antenatal Care 2016 Guidelines (e.g. Third Trimester Monitoring WHO ANC-2016-E.4, Preeclampsia Warning WHO ANC-2016-C.1, Rapid Weight Gain >2kg/week, Rh-Negative Protocol).", 4136072),
        ("5", "Doctor clinical workflow", "React Native + Node.js Express Gateway + Python FastAPI AI service + Supabase. Closed-loop 5-stage alert lifecycle, Emergency SOS modal with native hardware vibration, and automated pre-appointment summaries.", 5027137),
    ]

    for step_num, step_title, step_desc, y_top in steps:
        # Background card
        card = slide8b.shapes.add_shape(MSO_SHAPE.RECTANGLE, 812800, y_top, 10566400, 814800)
        card.fill.solid()
        card.fill.fore_color.rgb = RGBColor(248, 250, 252)
        card.line.color.rgb = RGBColor(226, 232, 240)

        # Number
        num_tb = slide8b.shapes.add_textbox(1016000, y_top + 180000, 406400, 416560)
        p = num_tb.text_frame.paragraphs[0]
        p.text = step_num
        p.font.name = "Georgia"
        p.font.size = Pt(20)
        p.font.bold = True
        p.font.color.rgb = RGBColor(16, 185, 129)

        # Title
        title_tb = slide8b.shapes.add_textbox(1549400, y_top + 190000, 2158365, 254000)
        p = title_tb.text_frame.paragraphs[0]
        p.text = step_title
        p.font.name = "Georgia"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = RGBColor(15, 118, 110)

        # Description
        desc_tb = slide8b.shapes.add_textbox(3822700, y_top + 150000, 7400000, 500000)
        p = desc_tb.text_frame.paragraphs[0]
        p.text = step_desc
        p.font.name = "Georgia"
        p.font.size = Pt(10)
        p.font.color.rgb = RGBColor(31, 41, 55)

    print("Created Slide 8B: Procedure: How It Was Built")

    # -------------------------------------------------------------
    # 4. CREATE SLIDE 8C (Component Capabilities & Clinical Architecture)
    #    Features the second generated Pixar illustration
    # -------------------------------------------------------------
    slide8c = prs.slides.add_slide(prs.slide_layouts[5]) # Blank
    
    # Header
    h_tb = slide8c.shapes.add_textbox(619125, 381000, 8953500, 266700)
    p = h_tb.text_frame.paragraphs[0]
    p.text = "02   IT22557506   Randinu P.V.K.V"
    p.font.name = "Calibri"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = RGBColor(84, 131, 107)

    # Title
    t_tb = slide8c.shapes.add_textbox(619125, 800000, 7000000, 800000)
    p = t_tb.text_frame.paragraphs[0]
    p.text = "Clinical Decision Support & Doctor Governance"
    p.font.name = "Calibri"
    p.font.size = Pt(26)
    p.font.bold = True
    p.font.color.rgb = RGBColor(23, 75, 72)

    # 4 Feature blocks on left side
    feature_blocks = [
        ("01", "13 Clinical Vitals Ingestion", "Maternal BP, blood sugar, VDRL, HBsAg, fetal heart rate, and weight collected through intuitive, clinically grouped mobile forms.", 1750000),
        ("02", "Tuned XGBoost 98% Accuracy", "Lightweight C++ optimized model executing in <5ms. Stratifies risk into Low, Moderate, High, and Very High triage tiers.", 2800000),
        ("03", "WHO Evidence-Based CDS Engine", "10 deterministic clinical rules directly citing WHO ANC-2016 guidelines to guide obstetric clinical interventions.", 3850000),
        ("04", "Doctor Alerts & Real-Time SOS", "Closed-loop 5-stage triage tracking with native device vibration pattern for high-priority maternal emergency SOS.", 4900000),
    ]

    for f_num, f_title, f_desc, f_top in feature_blocks:
        # Badge
        badge = slide8c.shapes.add_textbox(619125, f_top, 500000, 400000)
        p = badge.text_frame.paragraphs[0]
        p.text = f_num
        p.font.name = "Calibri"
        p.font.size = Pt(18)
        p.font.bold = True
        p.font.color.rgb = RGBColor(84, 131, 107)

        # Content
        c_tb = slide8c.shapes.add_textbox(1200000, f_top, 5800000, 800000)
        p = c_tb.text_frame.paragraphs[0]
        p.text = f_title
        p.font.name = "Calibri"
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = RGBColor(23, 75, 72)
        p2 = c_tb.text_frame.add_paragraph()
        p2.text = f_desc
        p2.font.name = "Calibri"
        p2.font.size = Pt(10.5)
        p2.font.color.rgb = RGBColor(82, 105, 96)

    # Add the second Pixar illustration on the right
    new_img2 = "clinical_decision_support_doctor.jpg"
    if os.path.exists(new_img2):
        slide8c.shapes.add_picture(new_img2, 7300000, 428625, 4500000, 6000000)
        print("Added clinical_decision_support_doctor.jpg to Slide 8C")

    # Footer
    f_tb = slide8c.shapes.add_textbox(619125, 6343650, 5715000, 238125)
    p = f_tb.text_frame.paragraphs[0]
    p.text = "R26-IT-146"
    p.font.name = "Calibri"
    p.font.size = Pt(10)
    p.font.color.rgb = RGBColor(82, 105, 96)

    print("Created Slide 8C: Clinical Decision Support & Doctor Governance")

    # -------------------------------------------------------------
    # 5. UPDATE SLIDE 13 (Results & Reported Feedback)
    # -------------------------------------------------------------
    # In the updated presentation, Slide 13 is now shifted due to 3 added slides
    # Let's locate the slide with text "Results and reported feedback"
    for s in prs.slides:
        for shp in s.shapes:
            if shp.has_text_frame and "Results and reported feedback" in shp.text_frame.text:
                print("Found Results slide! Adding Member 2 accuracy metric...")
                # Add Member 2's 98.00% stat card
                stat_tb = s.shapes.add_textbox(5200000, 1800000, 4500000, 1500000)
                p1 = stat_tb.text_frame.paragraphs[0]
                p1.text = "98.00%"
                p1.font.name = "Georgia"
                p1.font.size = Pt(40)
                p1.font.bold = True
                p1.font.color.rgb = RGBColor(16, 185, 129)
                p2 = stat_tb.text_frame.add_paragraph()
                p2.text = "Maternal Risk XGBoost Accuracy"
                p2.font.name = "Calibri"
                p2.font.size = Pt(13)
                p2.font.bold = True
                p2.font.color.rgb = RGBColor(23, 75, 72)
                p3 = stat_tb.text_frame.add_paragraph()
                p3.text = "Macro F1: 0.98 | 5-Fold CV: 98.00% +/- 0.71%"
                p3.font.name = "Calibri"
                p3.font.size = Pt(11)
                p3.font.color.rgb = RGBColor(82, 105, 96)
                break

    # Save presentation
    prs.save(out_file)
    print(f"UPDATED PRESENTATION SAVED SUCCESSFULLY: {out_file}")

if __name__ == "__main__":
    update_presentation()
