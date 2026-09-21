from flask import Flask, jsonify
from flask_cors import CORS
import webbrowser
import threading

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return jsonify({
        "status": "success",
        "message": "SocialPilot Backend is running!"
    })


@app.route("/api/health")
def health():
    return jsonify({
        "status": "healthy",
        "service": "SocialPilot API"
    })


def open_browser():
    webbrowser.open("http://localhost:5000")


if __name__ == "__main__":
    threading.Timer(1.5, open_browser).start()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
        use_reloader=False
    )