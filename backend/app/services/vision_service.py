import base64
import httpx
from fastapi import HTTPException, status
from app.config import settings


VISION_PROMPT = (
    "You are a food analysis AI. Analyze this food image precisely. "
    "Identify: 1) Exact food item name. 2) All visible ingredients. "
    "3) Estimated portion size and weight in grams. 4) Cooking method. "
    "5) Food category (e.g., Indian, Western, snack, meal). "
    "Be specific and detailed. Format your response clearly."
)


async def analyze_food_image(image_path: str) -> str:
    """
    Reads image from disk, base64 encodes it, and sends to Ollama moondream.
    Returns the raw vision text output.
    """
    try:
        with open(image_path, "rb") as f:
            image_bytes = f.read()
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image file not found: {image_path}",
        )

    payload = {
        "model": settings.OLLAMA_VISION_MODEL,
        "prompt": VISION_PROMPT,
        "images": [image_b64],
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vision AI service timed out. Please try again.",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Vision AI service error: {e.response.status_code}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Vision AI unavailable: {str(e)}",
        )
