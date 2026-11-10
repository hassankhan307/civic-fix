import logging
from config import settings
from models import AnalyzeImageResponse
from services.providers.gemini_provider import GeminiVisionProvider
from services.providers.local_provider import LocalVisionProvider

logger = logging.getLogger(__name__)

class VisionAnalyzer:
    """
    Central dispatcher for vision analysis.
    Selects Gemini or Local provider based on configuration and availability.
    """

    @classmethod
    def analyze_image(cls, image_bytes: bytes, mime_type: str = "image/jpeg", filename: str = "") -> AnalyzeImageResponse:
        provider = settings.ai_provider.lower().strip()
        
        if provider == "gemini" and settings.gemini_api_key:
            logger.info("Routing image analysis to Gemini Vision Provider")
            return GeminiVisionProvider.analyze(image_bytes, mime_type=mime_type, filename=filename)
        else:
            logger.info("Routing image analysis to Local Vision Provider")
            return LocalVisionProvider.analyze(image_bytes, filename=filename)
