import json
from pathlib import Path
from app.database.session import SessionLocal
from app.models import Property
from app.schemas import AnalysisInput, PropertyCreate
from app.services.analysis import analyze

def main():
    rows=json.loads(Path("data/demo.json").read_text())
    with SessionLocal() as db:
        for row in rows:
            name=row.pop("name"); prop=Property(**PropertyCreate(**row.pop("property")).model_dump()); db.add(prop); db.flush()
            # Fixtures are analyzed without inventing absent values; API-created analyses persist separately.
            result=analyze(AnalysisInput(property_id=prop.id, **row)); print(f"{name}: {result['grade']}")
        db.commit()
if __name__ == "__main__": main()
