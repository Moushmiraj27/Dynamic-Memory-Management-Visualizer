// ====== Hero / App transition ======
const heroSection = document.querySelector('.hero');
const appShell = document.querySelector('.app-shell');
const startBtn = document.getElementById('start-btn');

startBtn.addEventListener('click', () => {
    // Fade out hero
    heroSection.style.opacity = 0;
    heroSection.style.transform = 'translateY(-20px)';
    setTimeout(() => {
        heroSection.style.display = 'none';
        appShell.style.display = 'flex';
        appShell.style.opacity = 0;
        appShell.style.transform = 'translateY(20px)';
        // Fade in app shell
        setTimeout(() => {
            appShell.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            appShell.style.opacity = 1;
            appShell.style.transform = 'translateY(0)';
        }, 50);
    }, 600);
});

// ====== Simulation Logic ======
const form = document.getElementById("control-form");
const inputPages = document.getElementById("pages");
const inputFrames = document.getElementById("frames");
const selectAlgorithm = document.getElementById("algorithm");
const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");
const statAlgo = document.getElementById("stat-algo");
const statFrames = document.getElementById("stat-frames");
const statFaults = document.getElementById("stat-faults");
const statStep = document.getElementById("stat-step");
const framesContainer = document.getElementById("frames-container");
const timelineContainer = document.getElementById("timeline");

let simulation = null; // holds server result
let currentIndex = -1;

// ====== Helpers ======
function resetState() {
    simulation = null;
    currentIndex = -1;
    framesContainer.innerHTML = "";
    timelineContainer.innerHTML = "";
    statAlgo.textContent = "–";
    statFrames.textContent = "–";
    statFaults.textContent = "–";
    statStep.textContent = "–";
}

function renderFrames(stepData, framesCount) {
    framesContainer.innerHTML = "";
    const frames = stepData ? stepData.frames : [];
    for (let i = 0; i < framesCount; i++) {
        const value = frames[i] !== undefined ? frames[i] : "–";
        const empty = frames[i] === undefined;

        const card = document.createElement("div");
        card.className = "frame-card";
        if (empty) card.classList.add("frame-empty");
        if (stepData && stepData.replaced !== null && frames[i] === stepData.page) {
            card.classList.add("replaced");
        }

        const label = document.createElement("div");
        label.className = "frame-label";
        label.textContent = `Frame ${i}`;

        const val = document.createElement("div");
        val.className = "frame-value";
        val.textContent = value;

        const status = document.createElement("div");
        status.className = "frame-status";
        if (!stepData) {
            status.classList.add("idle");
            status.textContent = "Idle";
        } else if (stepData.hit) {
            status.classList.add("hit");
            status.textContent = "Hit";
        } else if (stepData.fault) {
            status.classList.add("fault");
            status.textContent = "Fault";
        }

        card.appendChild(label);
        card.appendChild(val);
        card.appendChild(status);
        framesContainer.appendChild(card);
    }
}

function renderTimeline(history) {
    timelineContainer.innerHTML = "";
    history.forEach((step) => {
        const row = document.createElement("div");
        row.className = "timeline-step";

        const colStep = document.createElement("div");
        colStep.textContent = `#${step.step.toString().padStart(2, "0")}`;

        const colMain = document.createElement("div");
        const pageSpan = document.createElement("span");
        pageSpan.className = "timeline-page";
        pageSpan.textContent = `Page ${step.page}`;
        colMain.appendChild(pageSpan);

        const meta = document.createElement("div");
        meta.className = "timeline-meta";

        const tagFrames = document.createElement("span");
        tagFrames.className = "timeline-tag";
        tagFrames.textContent = `Frames: [${step.frames.join(", ")}]`;

        const tagState = document.createElement("span");
        tagState.className = "timeline-tag";
        tagState.textContent = step.hit ? "Hit" : "Fault";

        meta.appendChild(tagFrames);
        meta.appendChild(tagState);

        if (step.replaced !== null && step.replaced !== undefined) {
            const tagRepl = document.createElement("span");
            tagRepl.className = "timeline-tag";
            tagRepl.textContent = `Replaced: ${step.replaced}`;
            meta.appendChild(tagRepl);
        }

        colMain.appendChild(meta);

        const colFlag = document.createElement("div");
        colFlag.style.textAlign = "right";
        colFlag.textContent = step.hit ? "✔" : "✱";

        row.appendChild(colStep);
        row.appendChild(colMain);
        row.appendChild(colFlag);

        timelineContainer.appendChild(row);
    });
}

function highlightTimeline(index) {
    const rows = timelineContainer.querySelectorAll(".timeline-step");
    rows.forEach((row, i) => {
        if (i === index) row.classList.add("active");
        else row.classList.remove("active");
    });
    const active = rows[index];
    if (active) {
        active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
}

function applyStep(index) {
    if (!simulation) return;
    if (index < 0 || index >= simulation.history.length) return;
    currentIndex = index;
    const stepData = simulation.history[index];
    renderFrames(stepData, simulation.framesCount);
    highlightTimeline(index);
    statStep.textContent = `${stepData.step}/${simulation.history.length}`;
}

// ====== Form submit: run full simulation ======
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pages = inputPages.value.trim();
    const frames = parseInt(inputFrames.value, 10);
    const algorithm = selectAlgorithm.value;

    if (!pages || !frames || frames <= 0) {
        alert("Please enter a reference string and a valid number of frames.");
        return;
    }

    try {
        const response = await fetch("/api/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pages, frames, algorithm }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || "Simulation failed.");
        }

        const data = await response.json();
        simulation = data;
        currentIndex = -1;

        statAlgo.textContent = data.algorithm;
        statFrames.textContent = data.framesCount;
        statFaults.textContent = data.pageFaults;
        statStep.textContent = `0/${data.history.length}`;

        renderTimeline(data.history);
        renderFrames(null, data.framesCount);
        highlightTimeline(-1);
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
});

// ====== Step through the simulation ======
btnStep.addEventListener("click", () => {
    if (!simulation) { alert("Run a simulation first."); return; }
    const nextIndex = currentIndex + 1;
    if (nextIndex >= simulation.history.length) { applyStep(0); }
    else { applyStep(nextIndex); }
});

// ====== Reset button ======
btnReset.addEventListener("click", () => {
    resetState();
});

// ====== Initial UI state ======
resetState();
