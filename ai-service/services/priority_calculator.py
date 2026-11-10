from config import settings
from models import PriorityCalculateRequest, PriorityCalculateResponse
from typing import Dict

class PriorityCalculator:
    """
    Transparent, deterministic weighted priority scoring engine.
    Calculates priority score from 0 to 100 with explicit component breakdowns.
    """
    
    SEVERITY_WEIGHTS: Dict[str, float] = {
        "low": 20.0,
        "medium": 50.0,
        "high": 80.0,
        "critical": 100.0
    }
    
    SAFETY_RISK_WEIGHTS: Dict[str, float] = {
        "low": 15.0,
        "medium": 45.0,
        "high": 80.0,
        "critical": 100.0
    }

    CATEGORY_SAFETY_BIAS: Dict[str, str] = {
        "exposed_wiring": "critical",
        "fallen_tree": "high",
        "water_leakage": "medium",
        "blocked_drainage": "medium",
        "pothole": "high",
        "broken_streetlight": "medium",
        "garbage_accumulation": "low",
        "damaged_sidewalk": "medium",
        "damaged_infrastructure": "high",
        "other": "low"
    }

    @classmethod
    def calculate(cls, req: PriorityCalculateRequest) -> PriorityCalculateResponse:
        sev_key = (req.severity or "medium").lower()
        sev_val = cls.SEVERITY_WEIGHTS.get(sev_key, 50.0)
        
        # Derive safety risk if not explicitly provided or if category dictates higher default
        safety_key = (req.safety_risk or cls.CATEGORY_SAFETY_BIAS.get(req.category.lower(), "medium")).lower()
        safety_val = cls.SAFETY_RISK_WEIGHTS.get(safety_key, 45.0)
        
        # Corroborating reports (saturation at 5+ reports)
        corroborating_clamped = min(req.corroborating_reports, 5)
        corroborating_val = (corroborating_clamped / 5.0) * 100.0
        
        # Infrastructure proximity bonus
        infra_val = 100.0 if req.near_critical_infrastructure else 0.0
        
        # Age escalation (up to 72 hours max escalation)
        age_clamped = min(req.age_hours, 72.0)
        age_val = (age_clamped / 72.0) * 100.0
        
        # Weighted sum:
        # Severity: 35%
        # Safety Risk: 30%
        # Corroborating: 15%
        # Critical Infrastructure: 10%
        # Age: 10%
        sev_comp = sev_val * settings.weight_severity
        safety_comp = safety_val * settings.weight_safety_risk
        corrob_comp = corroborating_val * settings.weight_proximity_cluster
        infra_comp = infra_val * settings.weight_critical_infrastructure
        age_comp = age_val * settings.weight_report_age
        
        total_score = round(sev_comp + safety_comp + corrob_comp + infra_comp + age_comp, 1)
        total_score = max(0.0, min(100.0, total_score))
        
        # Map to priority levels:
        # 0–24: Low
        # 25–49: Medium
        # 50–74: High
        # 75–100: Critical
        if total_score >= 75.0:
            level = "CRITICAL"
        elif total_score >= 50.0:
            level = "HIGH"
        elif total_score >= 25.0:
            level = "MEDIUM"
        else:
            level = "LOW"
            
        breakdown = {
            "severity_component": round(sev_comp, 2),
            "safety_risk_component": round(safety_comp, 2),
            "corroborating_component": round(corrob_comp, 2),
            "infrastructure_component": round(infra_comp, 2),
            "age_component": round(age_comp, 2),
            "raw_total": total_score
        }
        
        return PriorityCalculateResponse(
            priority_score=total_score,
            priority_level=level,
            breakdown=breakdown,
            algorithm_version="1.2.0"
        )
