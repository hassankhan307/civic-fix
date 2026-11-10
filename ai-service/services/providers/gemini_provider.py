import json
import logging
from typing import Optional
from config import settings
from models import AnalyzeImageResponse, PriorityCalculateRequest
from services.priority_calculator import PriorityCalculator
from services.providers.local_provider import LocalVisionProvider

logger = logging.getLogger(__name__)

GEMINI_ANALYSIS_PROMPT = """
You are an expert civic infrastructure inspection AI assistant for CivicFix, a municipal problem reporting system.
Carefully examine the submitted image for civic, infrastructure, or municipal problems.

Strict Guidelines:
1. ONLY describe visual evidence visible in the image.
2. DO NOT hallucinate or infer GPS coordinates, exact street addresses, or property ownership from the image.
3. Classify into one of these EXACT categories:
   - "pothole"
   - "broken_streetlight"
   - "garbage_accumulation"
   - "water_leakage"
   - "blocked_drainage"
   - "damaged_sidewalk"
   - "fallen_tree"
   - "exposed_wiring"
   - "damaged_infrastructure"
   - "other"
4. Estimate severity strictly as one of: "low", "medium", "high", "critical".
5. Provide a confidence score between 0.00 and 1.00.
6. Provide a concise, factual description (1-2 sentences) of visible damage.
7. Recommend a practical municipal action to resolve the issue.
8. If the image is blurry, ambiguous, indoor, or does not clearly show an infrastructure problem, classify category as "other", confidence <= 0.50, and set needs_human_review to true.

Respond ONLY with valid JSON conforming to this exact structure:
{
  "category": "pothole",
  "severity": "high",
  "confidence": 0.91,
  "description": "A large pothole is visible near the edge of the road.",
  "recommended_action": "Inspect the road surface and schedule asphalt repairs.",
  "needs_human_review": false,
  "detected_features": ["asphalt crater", "loose aggregate"]
}
"""

class GeminiVisionProvider:
    """
    Google Gemini Vision Adapter using google-genai SDK.
    Parses visual infrastructure damage into structured municipal diagnostics.
    """

    @classmethod
    def analyze(cls, image_bytes: bytes, mime_type: str = "image/jpeg", filename: str = "") -> AnalyzeImageResponse:
        api_key = settings.gemini_api_key
        if not api_key:
            logger.warning("GEMINI_API_KEY is not set. Falling back to LocalVisionProvider.")
            return LocalVisionProvider.analyze(image_bytes, filename)

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            
            # Prepare image part
            image_part = types.Part.from_bytes(
                data=image_bytes,
                mime_type=mime_type
            )
            
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=[GEMINI_ANALYSIS_PROMPT, image_part],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )

            text_output = response.text.strip()
            # Clean possible markdown fence blocks if present
            if text_output.startswith("```json"):
                text_output = text_output.replace("```json", "", 1)
            if text_output.startswith("```"):
                text_output = text_output.replace("```", "", 1)
            if text_output.endswith("```"):
                text_output = text_output[:-3]
            text_output = text_output.strip()

            parsed = json.loads(text_output)
            cat = str(parsed.get("category", "other")).lower().strip()
            if cat not in LocalVisionProvider.CATEGORIES:
                cat = "other"

            sev = str(parsed.get("severity", "medium")).lower().strip()
            if sev not in ["low", "medium", "high", "critical"]:
                sev = "medium"

            conf = float(parsed.get("confidence", 0.75))
            conf = max(0.0, min(1.0, conf))

            desc = str(parsed.get("description", "Civic issue detected requiring verification.")).strip()
            rec_action = str(parsed.get("recommended_action", "Dispatch municipal inspection team.")).strip()
            features = list(parsed.get("detected_features", []))

            human_review = bool(parsed.get("needs_human_review", False)) or (conf < settings.confidence_threshold) or (sev == "critical")

            # Deterministic priority score
            p_res = PriorityCalculator.calculate(
                PriorityCalculateRequest(
                    category=cat,
                    severity=sev,
                    safety_risk=sev,
                    age_hours=0.0,
                    corroborating_reports=0,
                    near_critical_infrastructure=False
                )
            )

            return AnalyzeImageResponse(
                category=cat,
                severity=sev,
                confidence=round(conf, 2),
                description=desc,
                priority_score=p_res.priority_score,
                recommended_action=rec_action,
                needs_human_review=human_review,
                detected_features=features,
                provider_used=f"gemini ({settings.gemini_model})",
                model_version=settings.gemini_model
            )

        except Exception as e:
            logger.error(f"Gemini Vision API error: {str(e)}. Falling back to LocalVisionProvider.")
            fallback_res = LocalVisionProvider.analyze(image_bytes, filename)
            fallback_res.description += f" (Note: Gemini API unavailable, analyzed via local engine)"
            fallback_res.needs_human_review = True
            return fallback_res
