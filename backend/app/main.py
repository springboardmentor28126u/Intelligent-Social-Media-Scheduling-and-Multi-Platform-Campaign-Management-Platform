from fastapi import FastAPI

app = FastAPI(
    title="Intelligent Social Media Platform",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "Social Media Management API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }