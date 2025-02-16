# models.py
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime, timezone
from database import Base

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    report_type = Column(String, nullable=False)  # e.g., "fire", "intruder", etc.
    description = Column(String, nullable=True)
    is_public = Column(Boolean, default=False)  # Alert status: private (default) or public
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
