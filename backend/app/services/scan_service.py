"""
backend/app/services/scan_service.py

Scan orchestration pipeline — Supabase edition.
Writes all results to Supabase (bypassing RLS via service-role key).
Image is uploaded to Supabase Storage 'meal-scans' bucket.
"""
import time
import uuid
from datetime import datetime, timezone

from fastapi import UploadFile, HTTPException

from app.services import vision_service, llm_service, nutrition_reference
from app.services.supabase_service import (
    insert_meal_scan,
    update_meal_scan,
    get_health_profile,
)
from app.config import settings


async def process_scan(
    user_id: str,
    image_file: UploadFile,
) -> dict:
    """
    Full scan orchestration pipeline:
    1. Upload image to Supabase Storage
    2. Insert pending scan row in Supabase
    3. Run moondream vision
    4. Run phi3:mini nutrition analysis
    5. Update scan row with results
    Returns the completed scan dict.
    """
    start_time = time.time()
    scan_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Read image bytes and upload to local media directory
    image_bytes = await image_file.read()
    try:
        from app.utils.image_utils import save_upload_image_bytes
        
        image_path, image_url = await save_upload_image_bytes(
            content=image_bytes,
            user_id=user_id,
            media_dir=settings.MEDIA_DIR,
            base_url=settings.BASE_URL,
        )
    except Exception as e:
        import logging
        logging.exception("Storage save failed")
        raise HTTPException(status_code=500, detail=f"Failed to save image: {e}")

    # 2. Insert pending scan row
    pending_row = {
        "id": scan_id,
        "user_id": user_id,
        "image_path": image_path,
        "image_url": image_url,
        "is_estimate_fallback": False,
        "scanned_at": now_iso,
    }
    try:
        await insert_meal_scan(pending_row)
    except Exception as e:
        import logging
        logging.exception("Supabase insert failed")
        raise HTTPException(status_code=502, detail=f"Failed to create scan record: {e}")

    # 3. Get health profile for LLM context
    health_profile_data: dict = {}
    try:
        hp = await get_health_profile(user_id)
        if hp:
            health_profile_data = {
                "diabetes_type": hp.get("diabetes_type"),
                "target_glucose_min": hp.get("target_glucose_min", 70),
                "target_glucose_max": hp.get("target_glucose_max", 140),
                "allergies": hp.get("allergies") or [],
            }
    except Exception as e:
        import logging
        logging.error(f"[scan_service] Health profile fetch failed: {e}")

    # 4. Vision processing — run against temp file (moondream needs a path)
    import tempfile, os
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        vision_output = await vision_service.analyze_food_image(tmp_path)
    except Exception as e:
        import logging
        logging.exception("Vision analysis failed")
        raise HTTPException(status_code=502, detail=f"Vision analysis failed: {e}")
    finally:
        try:
            if tmp_path:
                os.unlink(tmp_path)
        except Exception:
            pass

    # 5. LLM nutrition analysis
    try:
        reference_data = nutrition_reference.find_food_reference(vision_output)
        nutrition_result = await llm_service.analyze_nutrition(
            vision_output, health_profile_data, reference_data
        )
    except Exception as e:
        import logging
        logging.exception("LLM analysis failed")
        raise HTTPException(status_code=502, detail=f"LLM analysis failed: {e}")

    # 6. Build completed scan payload
    elapsed_ms = int((time.time() - start_time) * 1000)
    updates = {
        "food_name":          nutrition_result.get("food_name"),
        "serving_size":       nutrition_result.get("serving_size"),
        "estimated_weight_g": nutrition_result.get("estimated_weight_g"),
        "nutrition_data":     nutrition_result.get("nutrition_data"),
        "glycemic_data":      nutrition_result.get("glycemic_data"),
        "risk_level":         nutrition_result.get("risk_level", "moderate"),
        "recommendations":    nutrition_result.get("recommendations", []),
        "alternatives":       nutrition_result.get("alternatives", []),
        "is_estimate_fallback": nutrition_result.get("is_estimate_fallback", False),
    }

    # 7. Update Supabase row
    try:
        completed = await update_meal_scan(scan_id, updates)
    except Exception as e:
        import logging
        logging.exception("Supabase update failed")
        raise HTTPException(status_code=502, detail=f"Failed to update scan record: {e}")

    return completed


async def process_manual_scan(
    user_id: str,
    text: str,
) -> dict:
    start_time = time.time()
    scan_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    # Insert pending scan row without image
    pending_row = {
        "id": scan_id,
        "user_id": user_id,
        "image_path": None,
        "image_url": None,
        "is_estimate_fallback": False,
        "scanned_at": now_iso,
    }
    try:
        await insert_meal_scan(pending_row)
    except Exception as e:
        import logging
        logging.exception("Supabase insert failed")
        raise HTTPException(status_code=502, detail=f"Failed to create scan record: {e}")

    # Get health profile
    health_profile_data: dict = {}
    try:
        hp = await get_health_profile(user_id)
        if hp:
            health_profile_data = {
                "diabetes_type": hp.get("diabetes_type"),
                "target_glucose_min": hp.get("target_glucose_min", 70),
                "target_glucose_max": hp.get("target_glucose_max", 140),
                "allergies": hp.get("allergies") or [],
            }
    except Exception as e:
        pass

    # Use the manual text as the vision output
    vision_output = f"User manually logged: {text}"

    # LLM nutrition analysis
    try:
        reference_data = nutrition_reference.find_food_reference(vision_output)
        nutrition_result = await llm_service.analyze_nutrition(
            vision_output, health_profile_data, reference_data
        )
    except Exception as e:
        import logging
        logging.exception("LLM analysis failed")
        raise HTTPException(status_code=502, detail=f"LLM analysis failed: {e}")

    # Build completed scan payload
    updates = {
        "food_name":          nutrition_result.get("food_name"),
        "serving_size":       nutrition_result.get("serving_size"),
        "estimated_weight_g": nutrition_result.get("estimated_weight_g"),
        "nutrition_data":     nutrition_result.get("nutrition_data"),
        "glycemic_data":      nutrition_result.get("glycemic_data"),
        "risk_level":         nutrition_result.get("risk_level", "moderate"),
        "recommendations":    nutrition_result.get("recommendations", []),
        "alternatives":       nutrition_result.get("alternatives", []),
        "is_estimate_fallback": nutrition_result.get("is_estimate_fallback", False),
        "meal_type":          "snack", # default
    }

    try:
        completed = await update_meal_scan(scan_id, updates)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to update scan record: {e}")

    return completed


def _fallback_nutrition(vision_output: str) -> dict:
    """Return a generic fallback when the LLM is unavailable."""
    return {
        "food_name": vision_output[:60] if vision_output else "Unknown Food",
        "serving_size": "1 serving",
        "estimated_weight_g": 100,
        "nutrition_data": {
            "calories": 250,
            "carbs_g": 30,
            "sugar_g": 5,
            "protein_g": 10,
            "fat_g": 8,
            "fiber_g": 2,
        },
        "glycemic_data": {
            "glycemic_index": 55,
            "glycemic_load": 16,
            "estimated_spike_mg_dl": 30,
            "diabetes_safety_score": 60,
        },
        "risk_level": "moderate",
        "recommendations": ["Estimate only — AI analysis unavailable."],
        "alternatives": [],
        "is_estimate_fallback": True,
    }


async def apply_correction(scan_id: str, user_id: str, correction: dict) -> dict:
    """Apply user corrections to a completed scan."""
    allowed_fields = {
        "food_name", "serving_size", "estimated_weight_g",
        "nutrition_data", "glycemic_data", "risk_level",
        "recommendations", "alternatives", "meal_type",
    }
    clean = {k: v for k, v in correction.items() if k in allowed_fields and v is not None}
    if not clean:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    try:
        updated = await update_meal_scan(scan_id, clean)
        return updated
    except Exception as e:
        import logging
        logging.exception(f"[apply_correction] Failed to update scan {scan_id}")
        raise HTTPException(status_code=500, detail=f"Correction failed: {e}")
