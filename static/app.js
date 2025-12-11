// ====== Hero / App transition ======
const heroSection = document.querySelector('.hero');
const appShell = document.querySelector('.app-shell');
const startBtn = document.getElementById('start-btn');

startBtn.addEventListener('click', () => {
    heroSection.style.opacity = 0;
    heroSection.style.transform = 'translateY(-20px)';
    setTimeout(() => {
        heroSection.style.display = 'none';
        appShell.style.display = 'flex';
        appShell.style.opacity = 0;
        appShell.style.transform = 'translateY(20px)';
        setTimeout(() => {
            appShell.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            appShell.style.opacity = 1;
            appShell.style.transform = 'translateY(0)';
        }, 50);
    }, 600);
});

// ====== Elements ======
const form = document.getElementById("control-form");
const inputPages = document.getElementById("pages");
const inputFrames = document.getElementById("frames");
const selectAlgorithm = document.getElementById("algorithm");
const inputCode = document.getElementById("segment-code");
const inputData = document.getElementById("segment-data");
const inputStack = document.getElementById("segment-stack");
const inputHeap = document.getElementById("segment-heap");

const btnStep = document.getElementById("btn-step");
const btnReset = document.getElementById("btn-reset");

const statAlgo = document.getElementById("stat-algo");
const statFrames = document.getElementById("stat-frames");
const statFaults = document.getElementById("stat-faults");
const statStep = document.getElementById("stat-step");

const framesContainer = document.getElementById("frames-container");
const timelineContainer = document.getElementById("timeline");
const pageTableBody = document.querySelector("#page-table tbody");

let simulation = null;
let currentIndex = -1;

// ====== Reset ======
function resetState() {
    simulation = null;
    currentIndex = -1;
    framesContainer.innerHTML = "";
    timelineContainer.innerHTML = "";
    pageTableBody.innerHTML = "";
    statAlgo.textContent = "–";
    statFrames.textContent = "–";
    statFaults.textContent = "–";
    statStep.textContent = "–";
}

// ====== Helper Functions ======
function createFrameCard(value, segment, status, replaced) {
    const card = document.createElement("div");
    card.className = "frame-card";
    card.classList.add(segment ? `segment-${segment.toLowerCase()}` : "");
    if (!value) card.classList.add("frame-empty");
    if (replaced) card.classList.add("replaced");

    const label = document.createElement("div");
    label.className = "frame-label";
    label.textContent = `Frame`;

    const val = document.createElement("div");
    val.className = "frame-value";
    val.textContent = value || "–";

    const stat = document.createElement("div");
    stat.className = "frame-status";
    if (!status) stat.classList.add("idle");
    else stat.classList.add(status.toLowerCase());
    stat.textContent = status || "Idle";

    card.appendChild(label);
    card.appendChild(val);
    card.appendChild(stat);

    return card;
}

function renderFrames(stepData, framesCount) {
    framesContainer.innerHTML = "";
    const frames = stepData ? stepData.frames : [];
    for (let i = 0; i < framesCount; i++) {
        const f = frames[i] || {};
        const card = createFrameCard(f.page, f.segment, f.status, f.replaced);
        framesContainer.appendChild(card);
    }
}

function renderTimeline(history) {
    timelineContainer.innerHTML = "";
    history.forEach(step => {
        const row = document.createElement("div");
        row.className = "timeline-step";

        const colStep = document.createElement("div");
        colStep.textContent = `#${step.step.toString().padStart(2, "0")}`;

        const colMain = document.createElement("div");
        const pageSpan = document.createElement("span");
        pageSpan.className = "timeline-page";
        pageSpan.textContent = `Page ${step.page} (${step.segment})`;
        colMain.appendChild(pageSpan);

        const meta = document.createElement("div");
        meta.className = "timeline-meta";

        const tagFrames = document.createElement("span");
        tagFrames.className = "timeline-tag";
        tagFrames.textContent = `Frames: [${step.frames.map(f => f.page || "-").join(", ")}]`;

        const tagState = document.createElement("span");
        tagState.className = "timeline-tag";
        tagState.textContent = step.status;

        meta.appendChild(tagFrames);
        meta.appendChild(tagState);

        if (step.replaced) {
            const tagRepl = document.createElement("span");
            tagRepl.className = "timeline-tag";
            tagRepl.textContent = `Replaced: ${step.replaced}`;
            meta.appendChild(tagRepl);
        }

        colMain.appendChild(meta);

        const colFlag = document.createElement("div");
        colFlag.style.textAlign = "right";
        colFlag.textContent = step.status === "Hit" ? "✔" : "✱";

        row.appendChild(colStep);
        row.appendChild(colMain);
        row.appendChild(colFlag);

        timelineContainer.appendChild(row);
    });
}

function highlightTimeline(index) {
    const rows = timelineContainer.querySelectorAll(".timeline-step");
    rows.forEach((row, i) => row.classList.toggle("active", i === index));
    const active = rows[index];
    if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function renderPageTable(frames) {
    pageTableBody.innerHTML = "";
    frames.forEach((f, idx) => {
        if (!f.page) return;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${f.segment}</td>
            <td>${f.page}</td>
            <td>${idx}</td>
            <td>${f.status}</td>
        `;
        pageTableBody.appendChild(tr);
    });
}

function applyStep(index) {
    if (!simulation) return;
    if (index < 0 || index >= simulation.history.length) return;
    currentIndex = index;
    const stepData = simulation.history[index];
    renderFrames(stepData, simulation.framesCount);
    renderPageTable(stepData.frames);
    highlightTimeline(index);
    statStep.textContent = `${stepData.step}/${simulation.history.length}`;
}

// ====== Simulation ======
function simulateMemory(pages, framesCount, algorithm, segments) {
    const frames = Array(framesCount).fill(null).map(() => ({ page: null, segment: null, status: null, replaced: null }));
    const history = [];
    const pageFaults = { count: 0 };

    let pointer = 0; // FIFO pointer
    let lastUsed = {}; // LRU map

    pages.forEach((p, idx) => {
        let hit = false;
        let replaced = null;

        // Determine segment for this page
        let segment = "Unknown";
        for (const s in segments) {
            if (segments[s].includes(p)) segment = s;
        }

        // Check hit
        const frameIndex = frames.findIndex(f => f.page === p);
        if (frameIndex !== -1) {
            hit = true;
            frames[frameIndex].status = "Hit";
        } else {
            pageFaults.count++;
            frames.forEach(f => f.status = null);
            // Replacement
            let insertIdx = -1;

            if (algorithm === "FIFO") {
                insertIdx = frames.findIndex(f => f.page === null);
                if (insertIdx === -1) insertIdx = pointer;
                replaced = frames[insertIdx].page;
                frames[insertIdx] = { page: p, segment, status: "Fault", replaced };
                pointer = (insertIdx + 1) % framesCount;
            } else if (algorithm === "LRU") {
                insertIdx = frames.findIndex(f => f.page === null);
                if (insertIdx === -1) {
                    const lruPage = frames.reduce((minPage, f) => lastUsed[f.page] < lastUsed[minPage.page] ? f : minPage, frames[0]);
                    insertIdx = frames.indexOf(lruPage);
                    replaced = frames[insertIdx].page;
                }
                frames[insertIdx] = { page: p, segment, status: "Fault", replaced };
            } else if (algorithm === "Optimal") {
                insertIdx = frames.findIndex(f => f.page === null);
                if (insertIdx === -1) {
                    // Find page not used in future longest
                    let farthestIdx = 0;
                    let farthestDistance = -1;
                    frames.forEach((f, i) => {
                        const nextUse = pages.slice(idx + 1).indexOf(f.page);
                        const dist = nextUse === -1 ? Infinity : nextUse;
                        if (dist > farthestDistance) {
                            farthestDistance = dist;
                            farthestIdx = i;
                        }
                    });
                    insertIdx = farthestIdx;
                    replaced = frames[insertIdx].page;
                }
                frames[insertIdx] = { page: p, segment, status: "Fault", replaced };
            }
        }

        lastUsed[p] = idx;

        history.push({
            step: idx + 1,
            page: p,
            frames: frames.map(f => ({ ...f })), // clone
            status: hit ? "Hit" : "Fault",
            replaced
        });
    });

    return {
        framesCount,
        algorithm,
        pageFaults: pageFaults.count,
        history
    };
}

// ====== Form submit ======
form.addEventListener("submit", e => {
    e.preventDefault();

    const pagesRaw = inputPages.value.trim();
    const framesCount = parseInt(inputFrames.value, 10);
    const algorithm = selectAlgorithm.value;
    const codePages = parseInt(inputCode.value, 10);
    const dataPages = parseInt(inputData.value, 10);
    const stackPages = parseInt(inputStack.value, 10);
    const heapPages = parseInt(inputHeap.value, 10);

    if (!pagesRaw || !framesCount) return alert("Please enter valid inputs.");

    const pages = pagesRaw.replace(/,/g, " ").split(/\s+/).filter(p => p);

    // Assign pages to segments
    const segments = { Code: [], Data: [], Stack: [], Heap: [] };
    let idx = 0;
    pages.forEach(p => {
        if (segments.Code.length < codePages) segments.Code.push(p);
        else if (segments.Data.length < dataPages) segments.Data.push(p);
        else if (segments.Stack.length < stackPages) segments.Stack.push(p);
        else if (segments.Heap.length < heapPages) segments.Heap.push(p);
    });

    simulation = simulateMemory(pages, framesCount, algorithm, segments);
    currentIndex = -1;

    statAlgo.textContent = simulation.algorithm;
    statFrames.textContent = simulation.framesCount;
    statFaults.textContent = simulation.pageFaults;
    statStep.textContent = `0/${simulation.history.length}`;

    renderTimeline(simulation.history);
    applyStep(0);
});

// ====== Step button ======
btnStep.addEventListener("click", () => {
    if (!simulation) return alert("Run a simulation first.");
    const next = currentIndex + 1 >= simulation.history.length ? 0 : currentIndex + 1;
    applyStep(next);
});

// ====== Reset button ======
btnReset.addEventListener("click", () => {
    resetState();
});

// ====== Initialize ======
resetState();
