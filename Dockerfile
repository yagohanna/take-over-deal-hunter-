FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml README.md ./
COPY app app
COPY main.py alembic.ini ./
COPY alembic alembic
RUN pip install --no-cache-dir .
RUN mkdir -p data
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
