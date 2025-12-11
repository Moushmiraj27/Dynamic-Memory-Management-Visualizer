from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# ======= Page Replacement Algorithms =======
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


def simulate_optimal(pages, frames_count):
    frames = []
    history = []
    page_faults = 0

    for i, page in enumerate(pages):
        hit = page in frames
        replaced = None

        if not hit:
            page_faults += 1
            if len(frames) < frames_count:
                frames.append(page)
            else:
                # Optimal replacement: replace page that is not used for the longest future distance
                future_indices = []
                for f in frames:
                    if f in pages[i+1:]:
                        future_indices.append(pages[i+1:].index(f))
                    else:
                        future_indices.append(float('inf'))  # Not used again

                idx_to_replace = future_indices.index(max(future_indices))
                replaced = frames[idx_to_replace]
                frames[idx_to_replace] = page

        history.append({
            "step": i + 1,
            "page": page,
            "frames": frames.copy(),
            "hit": hit,
            "fault": not hit,
            "replaced": replaced
        })

    return {
        "algorithm": "Optimal",
        "framesCount": frames_count,
        "pageFaults": page_faults,
        "history": history
    }


# ======= Segmentation & Dynamic Memory Allocation =======
def simulate_segments(segment_sizes):
    """
    Simulates memory segmentation.
    segment_sizes: dict with 'Code', 'Data', 'Stack', 'Heap' page counts
    Returns memory map and page table.
    """
    memory = []
    page_table = []
    address = 0
    for seg_name, size in segment_sizes.items():
        for i in range(size):
            memory.append({"segment": seg_name, "page": i, "address": address})
            page_table.append({
                "segment": seg_name,
                "page": i,
                "logical": i,
                "physical": address
            })
            address += 1
    return memory, page_table


# ======= Flask Routes =======
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/simulate", methods=["POST"])
def api_simulate():
    data = request.get_json()
    pages_raw = data.get("pages", "")
    frames_count = int(data.get("frames", 3))
    algorithm = data.get("algorithm", "FIFO")
    segments = data.get("segments", {"Code": 2, "Data": 2, "Stack": 1, "Heap": 1})

    # Process reference string
    pages = [p.strip() for p in pages_raw.replace(",", " ").split() if p.strip()]
    if not pages or frames_count <= 0:
        return jsonify({"error": "Please enter valid pages and frame count"}), 400

    # Select algorithm
    if algorithm == "FIFO":
        result = simulate_fifo(pages, frames_count)
    elif algorithm == "LRU":
        result = simulate_lru(pages, frames_count)
    else:
        result = simulate_optimal(pages, frames_count)

    # Segmentation simulation
    try:
        segment_sizes = {k: int(v) for k, v in segments.items()}
        memory_map, page_table = simulate_segments(segment_sizes)
    except:
        memory_map, page_table = [], []

    result["segments"] = memory_map
    result["pageTable"] = page_table

    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8060, debug=True)
