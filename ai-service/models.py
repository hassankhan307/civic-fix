from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum

class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class CivicCategory(str, Enum):
    POTHOLE = "pothole"
    BROKEN_STREETLIGHT = "broken_streetlight"
    GARBAGE_ACCUMULATION = "garbage_accumulation"
    WATER_LEAKAGE = "water_leakage"
    BLOCKED_DRAINAGE = "blocked_drainage"
    DAMAGED_SIDEWALK = "damaged_sidewalk"
    FALLEN_TREE = "fallen_tree"
    EXPOSED_WIRING = "exposed_wiring"
    DAMAGED_INFRASTRUCTURE = "damaged_infrastructure"
    OTHER = "other"

class AnalyzeImageResponse(BaseModel):
    category: str = Field(..., description="Identified problem category")
    severity: str = Field(..., description="Estimated severity: low, medium, high, critical")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0 and 1")
    description: str = Field(..., description="Concise description of visible damage or civic hazard")
    priority_score: float = Field(..., ge=0.0, le=100.0, description="Calculated priority score (0-100)")
    recommended_action: str = Field(..., description="Recommended municipal response action")
    needs_human_review: bool = Field(False, description="Flagged true if confidence is below threshold or safety critical")
    detected_features: List[str] = Field(default_factory=list, description="Visual observations extracted from the image")
    provider_used: str = Field(..., description="Provider that performed analysis (gemini or local)")
    model_version: str = Field(..., description="Version of model or analyzer used")

class PriorityCalculateRequest(BaseModel):
    category: str = Field("other", description="Civic issue category")
    severity: str = Field("medium", description="Severity (low, medium, high, critical)")
    safety_risk: Optional[str] = Field("medium", description="Safety hazard level (low, medium, high, critical)")
    age_hours: float = Field(0.0, ge=0.0, description="Age of unresolved ticket in hours")
    corroborating_reports: int = Field(0, ge=0, description="Count of duplicate or nearby similar reports")
    near_critical_infrastructure: bool = Field(False, description="True if near hospital, school, power grid, etc.")

class PriorityCalculateResponse(BaseModel):
    priority_score: float = Field(..., ge=0.0, le=100.0)
    priority_level: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    breakdown: Dict[str, float] = Field(..., description="Component breakdown contributing to final score")
    algorithm_version: str = Field("1.2.0")

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    provider: str
    gemini_configured: bool
