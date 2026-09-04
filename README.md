# Takeover Deal Hunter — Private Backend

Phase 1 is a private, local FastAPI foundation for BUYREBSELL CORP. It stores properties and loan evidence, performs deterministic Decimal-based underwriting, grades deals, and explicitly tracks unknown or estimated information. It does **not** scrape, email, call paid APIs, make offers, or infer personal vulnerability. This repository also retains the pre-existing static calculator files; the backend does not add a public landing page.

## Project structure

- `main.py`, `app/main.py` — ASGI entrypoint and CORS
- `app/api/` — property, loan, deal, analysis, and buy-box routes
- `app/models/`, `app/schemas/` — SQLAlchemy tables and strict Pydantic contracts
- `app/calculations/`, `app/services/` — financial math, grading, and fixture loader
- `app/database/`, `app/core/` — sessions and environment/buy-box configuration
- `alembic/` — database migrations; `data/` — local database and six demo cases
- `tests/` — calculation, safety, verification, grading, and API tests
- `docs/` — operational notes

## Install and run (Python 3.12)

```bash
uv sync
cp .env.example .env
uv run alembic upgrade head
uv run python -m app.services.load_demo
uv run uvicorn main:app --reload
```

Open `http://127.0.0.1:8000/docs`. Run tests with `uv run pytest`.

PostgreSQL is supported by setting `DATABASE_URL=postgresql+psycopg://user:password@host/database`. Set `CORS_ORIGINS` to a JSON list (or comma-separated origins) containing only the future GitHub Pages origin. Wildcard origins are rejected.

## API examples

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/config/buy-box
curl -X POST http://127.0.0.1:8000/api/properties -H 'Content-Type: application/json' -d '{"address":"1 Main St","city":"Cleveland","state":"OH","zip_code":"44101","property_type":"Single Family"}'
curl -X POST http://127.0.0.1:8000/api/deals/analyze -H 'Content-Type: application/json' -d '{"financing_structure":"SUBJECT_TO","purchase_price":150000,"monthly_rental_income":2500,"monthly_operating_expenses":650,"existing_monthly_debt_payment":700,"verification_statuses":{"payoff":"UNKNOWN"}}'
```

Analysis persists a deal only when sufficient income and expense inputs exist. Missing values remain null and are returned in `missing_information`; `ESTIMATED` and `UNKNOWN` items produce risk flags rather than silently becoming verified.

## Future integration

The existing GitHub Pages calculator can later call the JSON API after its exact origin is placed in `CORS_ORIGINS`; authentication, rate limits, CSRF/threat review, and HTTPS should precede public connectivity. Separate later phases may add consented Gmail workflows, licensed ATTOM/MLS data, and OpenAI-assisted review behind service interfaces. Those integrations will require scoped secrets, source attribution, human review, and vendor/legal approval. For cloud deployment, switch to managed PostgreSQL, run Alembic in the release step, place the container behind authenticated HTTPS, centralize audit logs, back up data, and use a secrets manager.
