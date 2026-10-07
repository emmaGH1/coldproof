FROM mirror.gcr.io/library/python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY send_data.py .
EXPOSE 5555
CMD ["gunicorn", "--bind", "0.0.0.0:5555", "--workers", "1", "--threads", "4", "send_data:app"]
