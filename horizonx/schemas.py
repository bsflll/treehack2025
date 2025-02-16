# schemas.py
from pydantic import BaseModel
from datetime import datetime

class AlertCreate(BaseModel):
    latitude: float
    longitude: float
    report_type: str
    description: str | None = None  # Optional description

class AlertResponse(BaseModel):
    id: int
    latitude: float
    longitude: float
    report_type: str
    description: str | None = None
    is_public: bool
    created_at: datetime

    class Config:
        orm_mode = True

# For government to update the alert status:
class AlertUpdate(BaseModel):
    is_public: bool
