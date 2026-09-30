# ============================================================
#  app.py  —  AdvocateHub Flask Chatbot Server
#  Folder:  AdvocateHub/chatbot/app.py
#  Run:     python app.py
#  Port:    5001  (server.js uses 5000)
# ============================================================

import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from flask import Flask, request, jsonify
from flask_cors import CORS
from bot import get_response, get_advocates, format_advocate_card, logger

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:3001"], supports_credentials=True)


# ── Health check ───────────────────────────────────────────────
@app.route("/")
def home():
    return jsonify({
        "status": "AdvocateHub Chatbot running ✅",
        "port": 5001,
        "advocatesCount": len(get_advocates()),
    })


# ── Main chat endpoint ─────────────────────────────────────────
@app.route("/chat", methods=["POST"])
def chat():
    data    = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    lang    = str(data.get("lang", "en")).strip()

    if not message:
        return jsonify({
            "text":  "Please type or speak a message.",
            "type":  "text",
        }), 400

    try:
        result = get_response(message, lang=lang)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        return jsonify({
            "text":  "Sorry, something went wrong. Please try again.",
            "type":  "text",
            "error": str(e),
        }), 500


# ── Advocates list endpoint (live queries) ─────────────────────
@app.route("/advocates", methods=["GET"])
def advocates():
    city  = request.args.get("city",  "").strip().lower()
    spec  = request.args.get("spec",  "").strip().lower()
    name  = request.args.get("name",  "").strip().lower()
    limit = int(request.args.get("limit", 10))

    results = get_advocates()
    if city:
        results = [a for a in results if city in (a.get("city") or "").lower() or city in (a.get("district") or "").lower() or city in (a.get("taluk") or "").lower()]
    if spec:
        results = [a for a in results if spec in (a.get("speciality") or "").lower() or spec in (a.get("practiceArea") or "").lower()]
    if name:
        results = [a for a in results if name in (a.get("name") or "").lower()]

    return jsonify({
        "count":     len(results),
        "advocates": [format_advocate_card(a) for a in results[:limit]],
    })


if __name__ == "__main__":
    print("\nAdvocateHub Chatbot running -> http://localhost:5001\n")
    app.run(debug=True, port=5001)