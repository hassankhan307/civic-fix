from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from models import (
    AnalyzeImageResponse,
    PriorityCalculateRequest,
    PriorityCalculateResponse,
    HealthResponse
)
from services.vision_analyzer import VisionAnalyzer
from services.priority_calculator import PriorityCalculator
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("civicfix-ai")

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="AI Vision and Priority Scoring Microservice for CivicFix Municipal Platform"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg"
}

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.version,
        provider=settings.ai_provider,
        gemini_configured=bool(settings.gemini_api_key)
    )

@app.post("/analyze-image", response_model=AnalyzeImageResponse)
async def analyze_image(file: UploadFile = File(...)):
    """
    Analyzes an uploaded civic issue image.
    Extracts damage category, estimates severity, confidence, concise description,
    recommended action, and assigns a weighted priority score.
    """
    # 1. Validate MIME type
    content_type = file.content_type or ""
    if content_type.lower() not in ALLOWED_MIME_TYPES and not any(file.filename.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{content_type}'. Supported formats: JPEG, PNG, WebP."
        )

    # 2. Read bytes and validate file size
    try:
        image_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}"
        )

    max_bytes = settings.max_image_size_mb * 1024 * 1024
    if len(image_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.max_image_size_mb}MB."
        )

    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # 3. Analyze through VisionAnalyzer
    try:
        result = VisionAnalyzer.analyze_image(
            image_bytes=image_bytes,
            mime_type=content_type or "image/jpeg",
            filename=file.filename or ""
        )
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Error during vision analysis: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while analyzing the image."
        )

@app.post("/priority/calculate", response_model=PriorityCalculateResponse)
async def calculate_priority(req: PriorityCalculateRequest):
    """
    Computes a transparent, multi-factor priority score (0-100) based on severity,
    safety hazard risk, corroborating reports, age, and critical infrastructure proximity.
    """
    try:
        return PriorityCalculator.calculate(req)
    except Exception as e:
        logger.error(f"Error computing priority: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate priority score: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
