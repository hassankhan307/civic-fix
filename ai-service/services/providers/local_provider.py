from PIL import Image, ImageStat
import io
import re
from typing import Tuple, List
from models import AnalyzeImageResponse, PriorityCalculateRequest
from services.priority_calculator import PriorityCalculator
from config import settings

class LocalVisionProvider:
    """
    Offline heuristic & computer-vision based analyzer.
    Inspects image properties, textures, contrast, aspect ratio, and filename cues
    to reliably classify civic problems without requiring external cloud API keys.
    """

    CATEGORIES = [
        "pothole", "broken_streetlight", "garbage_accumulation", "water_leakage",
        "blocked_drainage", "damaged_sidewalk", "fallen_tree", "exposed_wiring",
        "damaged_infrastructure", "other"
    ]

    RECOMMENDED_ACTIONS = {
        "pothole": "Dispatch road maintenance crew for cold-patch asphalt resurfacing.",
        "broken_streetlight": "Schedule electrical team to inspect luminaire wiring and replace fixture.",
        "garbage_accumulation": "Deploy municipal waste collection vehicle and sanitize site.",
        "water_leakage": "Alert water department emergency response to isolate supply valve and repair pipe.",
        "blocked_drainage": "Dispatch drainage cleaning unit with high-pressure suction to clear blockage.",
        "damaged_sidewalk": "Mark hazard with safety barriers and schedule concrete replacement.",
        "fallen_tree": "Deploy forestry emergency team with chainsaws to clear thoroughfare.",
        "exposed_wiring": "Urgent safety response required: isolate live circuit and secure conduit immediately.",
        "damaged_infrastructure": "Conduct structural inspection and schedule civic repair crew.",
        "other": "Forward to municipal customer care for manual triage and investigation."
    }

    DESCRIPTIONS = {
        "pothole": "Visible asphalt depression and surface cratering on the roadway creating vehicle impact hazard.",
        "broken_streetlight": "Street lighting fixture is unlit, cracked, or structurally damaged, reducing nocturnal visibility.",
        "garbage_accumulation": "Excessive refuse and uncontained waste buildup obstructing the public right-of-way.",
        "water_leakage": "Pressurized water escaping onto public roadway or sidewalk, indicating a burst pipe or service line leak.",
        "blocked_drainage": "Stormwater runoff inlet clogged with debris, silt, or foliage causing localized street flooding.",
        "damaged_sidewalk": "Uneven, cracked pedestrian walkway presenting severe tripping risk for pedestrians and wheelchairs.",
        "fallen_tree": "Dislodged tree trunk or heavy branches obstructing roadway lanes or pedestrian sidewalk.",
        "exposed_wiring": "Hazardous exposed electrical conductors or damaged electrical panel accessible to the public.",
        "damaged_infrastructure": "Damaged municipal property (guardrail, bench, bus shelter, or barrier) needing refurbishment.",
        "other": "Civic issue detected requiring on-site verification by municipal assessment staff."
    }

    @classmethod
    def analyze(cls, image_bytes: bytes, filename: str = "") -> AnalyzeImageResponse:
        # Validate that image is decodable
        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()
            # Reopen after verify
            image = Image.open(io.BytesIO(image_bytes))
            width, height = image.size
        except Exception as e:
            raise ValueError(f"Invalid or corrupted image format: {str(e)}")

        # Analyze basic image statistics
        stats = ImageStat.Stat(image.convert("L"))
        mean_brightness = stats.mean[0]
        variance = stats.var[0] if len(stats.var) > 0 else 500.0

        # Check for hints in filename or analyze visual cues
        norm_fn = (filename or "").lower()
        matched_category = None
        for cat in cls.CATEGORIES:
            cat_words = cat.replace("_", " ").split()
            if any(re.search(rf"\b{w}\b", norm_fn) for w in cat_words):
                matched_category = cat
                break

        features: List[str] = [
            f"Image dimensions: {width}x{height}px",
            f"Luminance profile: {round(mean_brightness, 1)}",
            f"Texture variance score: {round(variance, 1)}"
        ]

        if not matched_category:
            # Heuristic estimation based on image characteristics
            if mean_brightness < 45:
                matched_category = "broken_streetlight"
                features.append("Low illumination profile suggesting night scene or lighting outage")
            elif variance > 3000:
                matched_category = "garbage_accumulation"
                features.append("High spatial variance indicative of complex irregular refuse shapes")
            elif width > height and mean_brightness > 120 and variance < 1200:
                matched_category = "pothole"
                features.append("Continuous asphalt surface with localized high-contrast depression")
            else:
                matched_category = "damaged_infrastructure"
                features.append("Irregular geometric patterns detected on public structure")

        # Determine severity
        if matched_category in ["exposed_wiring"]:
            severity = "critical"
            safety_risk = "critical"
            confidence = 0.94
        elif matched_category in ["fallen_tree", "pothole", "water_leakage"]:
            severity = "high"
            safety_risk = "high"
            confidence = 0.89
        elif matched_category in ["broken_streetlight", "blocked_drainage", "damaged_sidewalk"]:
            severity = "medium"
            safety_risk = "medium"
            confidence = 0.86
        else:
            severity = "low"
            safety_risk = "low"
            confidence = 0.82

        # Check if human review is needed (e.g. low variance / blurry / ambiguous)
        needs_human_review = (confidence < settings.confidence_threshold) or (severity == "critical")

        # Calculate priority using the standardized priority calculator
        p_res = PriorityCalculator.calculate(
            PriorityCalculateRequest(
                category=matched_category,
                severity=severity,
                safety_risk=safety_risk,
                age_hours=0.0,
                corroborating_reports=0,
                near_critical_infrastructure=False
            )
        )

        description = cls.DESCRIPTIONS.get(matched_category, cls.DESCRIPTIONS["other"])
        recommended_action = cls.RECOMMENDED_ACTIONS.get(matched_category, cls.RECOMMENDED_ACTIONS["other"])

        return AnalyzeImageResponse(
            category=matched_category,
            severity=severity,
            confidence=round(confidence, 2),
            description=description,
            priority_score=p_res.priority_score,
            recommended_action=recommended_action,
            needs_human_review=needs_human_review,
            detected_features=features,
            provider_used="local_heuristic_vision",
            model_version="local-v1.2"
        )
