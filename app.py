from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# ===== FIFO Simulation =====
def simulate_fifo(pages, frames_count):
    frames = []
    pointer = 0
    history = []
    page_faults = 0

    for step, page in enumerate(pages):
        hit = page in frames
        replaced = None

        if not hit:
            page_faults += 1
            if len(frames) < frames_count:
                frames.append(page)
            else:
                replaced = frames[pointer]
                frames[pointer] = page
                pointer = (pointer + 1) % frames_count

        history.append({
            "step": step + 1,
            "page": page,
            "frames": frames.copy(),
            "hit": hit,
            "fault": not hit,
            "replaced": replaced
        })

    return {
        "algorithm": "FIFO",
        "framesCount": frames_count,
        "pageFaults": page_faults,
        "history": history
    }

# ===== LRU Simulation =====
def simulate_lru(pages, frames_count):
    frames = []
    last_used = {}
    history = []
    page_faults = 0

    for i, page in enumerate(pages):
        hit = page in frames
        replaced = None

        if hit:
            last_used[page] = i
        else:
            page_faults += 1
            if len(frames) < frames_count:
                frames.append(page)
                last_used[page] = i
            else:
                lru_page = min(frames, key=lambda p: last_used.get(p, -1))
                replaced = lru_page
                lru_idx = frames.index(lru_page)
                frames[lru_idx] = page
                last_used.pop(lru_page, None)
                last_used[page] = i

        history.append({
            "step": i + 1,
            "page": page,
            "frames": frames.copy(),
            "hit": hit,
            "fault": not hit,
            "replaced": replaced
        })

    return {
        "algorithm": "LRU",
        "framesCount": frames_count,
        "pageFaults": page_faults,
        "history": history
    }

# ===== Flask Routes =====
@app.route("/")
def index():
    # Render the index.html containing hero/start screen + simulation UI
    return render_template("index.html")

@app.route("/api/simulate", methods=["POST"])
def api_simulate():
    data = request.get_json()
    pages_raw = data.get("pages", "")
    frames_count = int(data.get("frames", 3))
    algorithm = data.get("algorithm", "FIFO")

    # Convert pages string to list
    pages = [p.strip() for p in pages_raw.replace(",", " ").split() if p.strip()]

    if not pages or frames_count <= 0:
        return jsonify({"error": "Please enter pages and a valid frame count."}), 400

    if algorithm == "FIFO":
        result = simulate_fifo(pages, frames_count)
    else:
        result = simulate_lru(pages, frames_count)

    return jsonify(result)

# ===== Run Flask App =====
if __name__ == "__main__":
    # Optional: change host/port
    app.run(host="0.0.0.0", port=8080, debug=True)
