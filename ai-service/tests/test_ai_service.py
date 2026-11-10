import io
from fastapi.testclient import TestClient
from PIL import Image
from main import app
from services.priority_calculator import PriorityCalculator
from models import PriorityCalculateRequest

client = TestClient(app)

def create_test_image(color="red", size=(100, 100)) -> io.BytesIO:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data

def test_priority_calculation():
    # Low severity request
    req = PriorityCalculateRequest(
        category="garbage_accumulation",
        severity="low",
        safety_risk="low",
        age_hours=0.0,
        corroborating_reports=0,
        near_critical_infrastructure=False
    )
    res = PriorityCalculator.calculate(req)
    assert res.priority_score < 25.0
    assert res.priority_level == "LOW"

    # Critical request with infrastructure and age
    req_crit = PriorityCalculateRequest(
        category="exposed_wiring",
        severity="critical",
        safety_risk="critical",
        age_hours=48.0,
        corroborating_reports=4,
        near_critical_infrastructure=True
    )
    res_crit = PriorityCalculator.calculate(req_crit)
    assert res_crit.priority_score >= 75.0
    assert res_crit.priority_level == "CRITICAL"
    assert res_crit.breakdown["severity_component"] > 0

def test_priority_endpoint():
    payload = {
        "category": "pothole",
        "severity": "high",
        "safety_risk": "high",
        "age_hours": 12.0,
        "corroborating_reports": 2,
        "near_critical_infrastructure": False
    }
    response = client.post("/priority/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "priority_score" in data
    assert "priority_level" in data
    assert data["priority_level"] in ["MEDIUM", "HIGH", "CRITICAL"]

def test_analyze_image_endpoint():
    img_buf = create_test_image(color="darkgray")
    files = {"file": ("pothole_street_damage.jpg", img_buf, "image/jpeg")}
    response = client.post("/analyze-image", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "category" in data
    assert "severity" in data
    assert "confidence" in data
    assert "priority_score" in data
    assert "recommended_action" in data
    assert 0.0 <= data["confidence"] <= 1.0

def test_invalid_file_type():
    txt_buf = io.BytesIO(b"Hello world not an image")
    files = {"file": ("report.txt", txt_buf, "text/plain")}
    response = client.post("/analyze-image", files=files)
    assert response.status_code == 400
