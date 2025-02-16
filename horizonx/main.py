# main.py
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import schemas

# Create database tables (if they don’t exist yet)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="HorizonX Backend")

# Dependency to get a DB session per request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Endpoint for users to report an alert
@app.post("/alerts/", response_model=schemas.AlertResponse)
def create_alert(alert: schemas.AlertCreate, db: Session = Depends(get_db)):
    db_alert = models.Alert(
        latitude=alert.latitude,
        longitude=alert.longitude,
        report_type=alert.report_type,
        description=alert.description,
        is_public=False  # Default to private; user may later decide to report publicly
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

# Endpoint for government to view all alerts (with optional pagination)
@app.get("/alerts/", response_model=list[schemas.AlertResponse])
def read_alerts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    alerts = db.query(models.Alert).offset(skip).limit(limit).all()
    return alerts

# Endpoint to view details of a specific alert
@app.get("/alerts/{alert_id}", response_model=schemas.AlertResponse)
def read_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

# Endpoint for government to update alert status (e.g., from private to public)
@app.patch("/alerts/{alert_id}", response_model=schemas.AlertResponse)
def update_alert(alert_id: int, alert_update: schemas.AlertUpdate, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_public = alert_update.is_public
    db.commit()
    db.refresh(alert)
    return alert
