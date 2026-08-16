from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_active_user
from app.services.dashboard_service import get_dashboard_data

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/score")
async def get_health_score(
    current_user = Depends(get_current_active_user),
):
    """Returns a comprehensive health score with component breakdown."""
    data = await get_dashboard_data(current_user.id)
    glucose = data["glucose"]
    scans = data["scans"]

    tir = glucose.get("tir") or 0.0
    avg_safety = scans.get("avg_safety_score") or 0.0

    glucose_control_score = min(100, tir)
    diet_quality_score = min(100, avg_safety)
    activity_score = 60.0  # Placeholder — would come from wearable integration
    medication_score = 80.0  # Placeholder

    overall = round(
        glucose_control_score * 0.4
        + diet_quality_score * 0.3
        + activity_score * 0.2
        + medication_score * 0.1,
        1,
    )

    return {
        "score": overall,
        "summary": data["health_score"]["summary"],
        "breakdown": {
            "glucose_control": glucose_control_score,
            "diet_quality": diet_quality_score,
            "activity": activity_score,
            "medication_adherence": medication_score,
        },
    }


@router.get("/status-summary")
async def get_status_summary(
    current_user = Depends(get_current_active_user),
):
    """Returns a fast, lightweight status summary for UI initial state."""
    from app.services.supabase_service import list_glucose_readings
    
    # Just get the single most recent reading overall
    readings = await list_glucose_readings(str(current_user.id), days=7)

    latest_val = None
    last_updated = None
    if readings:
        latest = readings[0]
        latest_val = latest.get("glucose_value_mg_dl")
        last_updated = latest.get("measured_at")

    severity = "normal"
    if latest_val is not None:
        if latest_val < 70 or latest_val > 250:
            severity = "critical"
        elif latest_val > 180:
            severity = "warning"

    return {
        "severity": severity,
        "last_updated": last_updated
    }


@router.get("/insights")
async def get_health_insights(
    current_user = Depends(get_current_active_user),
):
    """Returns AI-generated health insights based on recent data."""
    data = await get_dashboard_data(current_user.id)
    glucose = data["glucose"]
    scans = data["scans"]

    insights = []
    predictions = []

    tir = glucose.get("tir")
    avg_glucose = glucose.get("avg")

    if tir is not None:
        if tir >= 80:
            insights.append({
                "type": "positive",
                "title": "Excellent Time in Range",
                "body": f"Your glucose was in target range {tir:.0f}% of the time this week. Outstanding control!",
            })
        elif tir >= 60:
            insights.append({
                "type": "warning",
                "title": "Time in Range",
                "body": f"Your glucose was in range {tir:.0f}% of the time. Aim for above 70% for better outcomes.",
            })
        else:
            insights.append({
                "type": "action",
                "title": "Improve Time in Range",
                "body": f"Only {tir:.0f}% time in range. Consider reviewing your meal plan with your dietitian.",
            })

    if avg_glucose is not None:
        if avg_glucose > 180:
            insights.append({
                "type": "warning",
                "title": "Elevated Average Glucose",
                "body": f"Average glucose of {avg_glucose} mg/dL is above target. Monitor closely.",
            })

    if scans["high_risk_meals"] > 0:
        insights.append({
            "type": "action",
            "title": "High-Risk Foods Detected",
            "body": f"You consumed {scans['high_risk_meals']} high-risk meal(s) this week. Check alternatives.",
        })

    if not insights:
        insights.append({
            "type": "info",
            "title": "Start Tracking",
            "body": "Scan your meals and log glucose readings to get personalized insights.",
        })
        
    from app.services.llm_service import generate_ai_twin_predictions
    predictions = await generate_ai_twin_predictions(data)

    return {"insights": insights, "predictions": predictions}
