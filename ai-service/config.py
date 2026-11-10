from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    app_name: str = "CivicFix AI Intelligence Engine"
    version: str = "1.0.0"
    port: int = 8000
    host: str = "0.0.0.0"
    
    # Provider: 'local' (offline smart heuristic vision) or 'gemini' (Google Gemini Vision API)
    ai_provider: str = "local"
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-flash"
    
    # Confidence and review thresholds
    confidence_threshold: float = 0.65
    max_image_size_mb: int = 10
    
    # Priority Scoring Algorithm weights (total = 1.0)
    weight_severity: float = 0.35
    weight_safety_risk: float = 0.30
    weight_proximity_cluster: float = 0.15
    weight_report_age: float = 0.10
    weight_critical_infrastructure: float = 0.10
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
