// Strict mode & DOM caching
"use strict";

const tapButton = document.querySelector(".tap-button");
const tapAreaBottom = document.getElementById("tapAreaBottom");
const resetButton = document.querySelector(".left-nav-button");
const countLabel = document.querySelector(".count.label");
const interactionText = document.getElementById("interactionText");

// Settings elements
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const targetInput = document.getElementById("targetInput");
const targetNoteInput = document.getElementById("targetNoteInput");
const vibrationToggle = document.getElementById("vibrationToggle");
const intensitySection = document.getElementById("intensitySection");
const segmentButtons = document.querySelectorAll(".segment-btn");
const targetIndicator = document.getElementById("targetIndicator");
const targetValueText = document.getElementById("targetValueText");
const targetNoteText = document.getElementById("targetNoteText");

// History DOM Elements
const tabBtnGeneral = document.getElementById("tabBtnGeneral");
const tabBtnHistory = document.getElementById("tabBtnHistory");
const generalSettingsTab = document.getElementById("generalSettingsTab");
const historyTab = document.getElementById("historyTab");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// State & Config
const STORAGE_KEYS = {
	COUNT: "tap_count",
	TARGET: "tap_target",
	NOTE: "tap_target_note",
	SESSION_START: "tap_session_start",
	HISTORY: "tap_history",
	VIBE_ENABLED: "tap_vibe_enabled",
	INTENSITY: "tap_vibe_intensity"
};

const INTENSITIES = {
	light: 20,
	medium: 50,
	strong: 90
};

const hasVibrate = "vibrate" in navigator;

let count = 0;
let targetCount = null;
let targetNote = "";
let sessionStartTime = null;
let historyItems = [];
let vibrationEnabled = true;
let vibrationIntensity = "medium";

// Storage helpers
function loadSettings() {
	try {
		const savedCount = parseInt(localStorage.getItem(STORAGE_KEYS.COUNT), 10);
		if (!isNaN(savedCount) && savedCount >= 0) {
			count = savedCount;
		}

		const savedTarget = parseInt(localStorage.getItem(STORAGE_KEYS.TARGET), 10);
		targetCount = !isNaN(savedTarget) && savedTarget > 0 ? savedTarget : null;

		const savedNote = localStorage.getItem(STORAGE_KEYS.NOTE);
		if (savedNote) {
			targetNote = savedNote;
		}

		const savedVibe = localStorage.getItem(STORAGE_KEYS.VIBE_ENABLED);
		if (savedVibe !== null) {
			vibrationEnabled = savedVibe === "true";
		}

		const savedIntensity = localStorage.getItem(STORAGE_KEYS.INTENSITY);
		if (savedIntensity && INTENSITIES[savedIntensity]) {
			vibrationIntensity = savedIntensity;
		}

		const savedSessionStart = localStorage.getItem(STORAGE_KEYS.SESSION_START);
		if (savedSessionStart) {
			sessionStartTime = savedSessionStart;
		}

		const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
		if (savedHistory) {
			historyItems = JSON.parse(savedHistory);
			if (!Array.isArray(historyItems)) historyItems = [];
		}
	} catch (e) {
		console.warn("Storage access failed:", e);
	}

	updateDisplay();
	renderSettingsUI();
	renderTargetIndicator();
	renderTargetNote();
	checkTarget(false); // Do not play celebration/confetti on initial load or reload
}

function saveSettings() {
	const parsed = parseInt(targetInput.value, 10);
	targetCount = !isNaN(parsed) && parsed > 0 ? parsed : null;
	targetNote = targetNoteInput.value.trim();
	vibrationEnabled = vibrationToggle.checked;
	vibrationIntensity = pendingVibrationIntensity;

	try {
		if (targetCount !== null) {
			localStorage.setItem(STORAGE_KEYS.TARGET, targetCount);
		} else {
			localStorage.removeItem(STORAGE_KEYS.TARGET);
		}

		if (targetNote) {
			localStorage.setItem(STORAGE_KEYS.NOTE, targetNote);
		} else {
			localStorage.removeItem(STORAGE_KEYS.NOTE);
		}

		localStorage.setItem(STORAGE_KEYS.VIBE_ENABLED, vibrationEnabled);
		localStorage.setItem(STORAGE_KEYS.INTENSITY, vibrationIntensity);
	} catch (e) {
		console.warn("Storage write failed:", e);
	}

	renderTargetIndicator();
	renderTargetNote();
	checkTarget();
	closeSettings();
}

function renderSettingsUI() {
	targetInput.value = targetCount !== null ? targetCount : "";
	targetNoteInput.value = targetNote || "";
	vibrationToggle.checked = vibrationEnabled;
	pendingVibrationIntensity = vibrationIntensity;
	intensitySection.style.display = vibrationEnabled ? "block" : "none";

	segmentButtons.forEach((btn) => {
		btn.classList.toggle("active", btn.dataset.intensity === pendingVibrationIntensity);
	});
	renderHistoryList();
}

function renderTargetIndicator() {
	if (targetCount !== null) {
		targetValueText.textContent = targetCount;
		targetIndicator.classList.remove("hidden");
	} else {
		targetIndicator.classList.add("hidden");
	}
}

function renderTargetNote() {
	if (targetNote) {
		targetNoteText.textContent = targetNote;
		targetNoteText.classList.remove("hidden");
	} else {
		targetNoteText.classList.add("hidden");
	}
}

let pendingVibrationIntensity = "medium";

// History Archiving & Formatting
function recordSessionStart() {
	if (!sessionStartTime) {
		sessionStartTime = new Date().toISOString();
		try {
			localStorage.setItem(STORAGE_KEYS.SESSION_START, sessionStartTime);
		} catch (e) {}
	}
}

function archiveSession() {
	if (count === 0) return;

	const entry = {
		id: Date.now(),
		count: count,
		target: targetCount,
		note: targetNote || "",
		startDate: sessionStartTime || new Date().toISOString(),
		endDate: new Date().toISOString()
	};

	historyItems.unshift(entry);
	// Keep up to 50 historical sessions
	if (historyItems.length > 50) {
		historyItems = historyItems.slice(0, 50);
	}

	try {
		localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(historyItems));
		localStorage.removeItem(STORAGE_KEYS.SESSION_START);
	} catch (e) {
		console.warn("Failed to archive session:", e);
	}

	sessionStartTime = null;
	renderHistoryList();
}

function formatDate(isoString) {
	if (!isoString) return "";
	const d = new Date(isoString);
	if (isNaN(d.getTime())) return "";
	return d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
}

function renderHistoryList() {
	if (!historyList) return;
	historyList.innerHTML = "";

	if (!historyItems || historyItems.length === 0) {
		historyList.innerHTML = `
			<div class="history-empty">
				No saved sessions yet.<br>
				Count and tap Reset to save your progress here.
			</div>
		`;
		return;
	}

	historyItems.forEach((item) => {
		const div = document.createElement("div");
		div.className = "history-item";

		const isTargetMet = item.target !== null && item.count >= item.target;
		const targetLabel = item.target ? `Target: ${item.target}` : "No target";
		const noteMarkup = item.note ? `<div class="history-note">${escapeHtml(item.note)}</div>` : "";

		div.innerHTML = `
			<div class="history-item-top">
				<span class="history-count-badge ${isTargetMet ? "target-met" : ""}">${item.count}</span>
				<span class="history-target-pill">${targetLabel}</span>
			</div>
			${noteMarkup}
			<div class="history-dates">
				<span>Start: ${formatDate(item.startDate)}</span>
				<span>End: ${formatDate(item.endDate)}</span>
			</div>
		`;
		historyList.appendChild(div);
	});
}

function escapeHtml(str) {
	return str.replace(/[&<>'"]/g, (tag) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"'": "&#39;",
		'"': "&quot;"
	}[tag] || tag));
}

// Tab navigation
function switchTab(tab) {
	if (tab === "general") {
		tabBtnGeneral.classList.add("active");
		tabBtnHistory.classList.remove("active");
		generalSettingsTab.classList.remove("hidden");
		historyTab.classList.add("hidden");
	} else {
		tabBtnGeneral.classList.remove("active");
		tabBtnHistory.classList.add("active");
		generalSettingsTab.classList.add("hidden");
		historyTab.classList.remove("hidden");
		renderHistoryList();
	}
}

function clearAllHistory() {
	if (confirm("Clear all session history?")) {
		historyItems = [];
		try {
			localStorage.removeItem(STORAGE_KEYS.HISTORY);
		} catch (e) {}
		renderHistoryList();
	}
}

// Modal management with ESC key support
function openSettings() {
	switchTab("general");
	renderSettingsUI();
	settingsModal.classList.remove("hidden");
	document.addEventListener("keydown", handleKeydown);
}

function closeSettings() {
	settingsModal.classList.add("hidden");
	document.removeEventListener("keydown", handleKeydown);
}

function handleKeydown(e) {
	if (e.key === "Escape") {
		closeSettings();
	}
}

// Button Ripple & Vibration execution
function triggerRipple() {
	tapButton.classList.remove("rippling");
	void tapButton.offsetWidth; // Force reflow to replay ripple
	tapButton.classList.add("rippling");
}

function doVibrate(pattern) {
	if (!vibrationEnabled) return;
	try {
		if (navigator.vibrate) {
			navigator.vibrate(pattern);
		}
	} catch (e) {
		// Ignore environments where vibrate is blocked by permissions policy
	}
}

function triggerVibration() {
	doVibrate(INTENSITIES[vibrationIntensity] || 50);

	tapButton.classList.remove("vibrating");
	void tapButton.offsetWidth; // Fast reflow restart
	tapButton.classList.add("vibrating");
	triggerRipple();
}

// Confetti Animation System
const confettiCanvas = document.getElementById("confettiCanvas");
const ctx = confettiCanvas.getContext("2d");
let confettiParticles = [];
let confettiAnimationId = null;

function resizeConfetti() {
	confettiCanvas.width = window.innerWidth;
	confettiCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeConfetti);
resizeConfetti();

function launchConfetti() {
	resizeConfetti();
	const colors = ["#30d158", "#157dfb", "#ffd60a", "#ff375f", "#bf5af2", "#64d2ff"];
	confettiParticles = [];

	// Spawn particles from center-bottom bursting upward
	for (let i = 0; i < 90; i++) {
		const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
		const speed = Math.random() * 14 + 8;
		confettiParticles.push({
			x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 60,
			y: confettiCanvas.height * 0.65,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			size: Math.random() * 8 + 5,
			color: colors[Math.floor(Math.random() * colors.length)],
			rotation: Math.random() * 360,
			rotationSpeed: (Math.random() - 0.5) * 12,
			opacity: 1
		});
	}

	if (confettiAnimationId) {
		cancelAnimationFrame(confettiAnimationId);
	}
	animateConfetti();
}

function animateConfetti() {
	ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
	let activeCount = 0;

	for (let i = 0; i < confettiParticles.length; i++) {
		const p = confettiParticles[i];
		p.x += p.vx;
		p.y += p.vy;
		p.vy += 0.35; // Gravity
		p.vx *= 0.98; // Air resistance
		p.rotation += p.rotationSpeed;
		p.opacity -= 0.009;

		if (p.opacity > 0 && p.y < confettiCanvas.height + 20) {
			activeCount++;
			ctx.save();
			ctx.globalAlpha = Math.max(0, p.opacity);
			ctx.translate(p.x, p.y);
			ctx.rotate((p.rotation * Math.PI) / 180);
			ctx.fillStyle = p.color;
			ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
			ctx.restore();
		}
	}

	if (activeCount > 0) {
		confettiAnimationId = requestAnimationFrame(animateConfetti);
	} else {
		ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
		confettiAnimationId = null;
	}
}

let lastCelebratedTarget = null;

function triggerCelebration() {
	if (lastCelebratedTarget === targetCount) return;
	lastCelebratedTarget = targetCount;

	doVibrate([100, 50, 100, 50, 200]);
	targetIndicator.classList.add("reached");

	// Trigger pop celebration animation on the total count label
	countLabel.classList.remove("target-complete");
	void countLabel.offsetWidth; // Force reflow to replay animation
	countLabel.classList.add("target-complete");

	// Launch confetti explosion
	launchConfetti();
}

function checkTarget(shouldCelebrate = true) {
	if (targetCount === null) {
		lastCelebratedTarget = null;
		targetIndicator.classList.remove("reached");
		countLabel.classList.remove("target-complete", "target-exceeded");
		return;
	}

	if (count === targetCount) {
		// Exact target hit: green display
		targetIndicator.classList.add("reached");
		countLabel.classList.remove("target-exceeded");
		countLabel.classList.add("target-complete");

		// Only play celebration & confetti on active user interaction, not page reload
		if (shouldCelebrate) {
			triggerCelebration();
		}
	} else if (count > targetCount) {
		// Target exceeded: red text
		targetIndicator.classList.add("reached");
		countLabel.classList.remove("target-complete");
		countLabel.classList.add("target-exceeded");
	} else {
		// Below target: standard white text
		lastCelebratedTarget = null;
		targetIndicator.classList.remove("reached");
		countLabel.classList.remove("target-complete", "target-exceeded");
	}
}

// Counter operations with per-digit animation
let previousDigits = "";

function updateDisplay(direction = null) {
	const currentDigits = count.toString();
	adjustFontSize();

	// Reuse existing span nodes in-place for maximum performance
	const existingSpans = countLabel.children;
	if (!direction || !previousDigits || existingSpans.length !== currentDigits.length) {
		const fragment = document.createDocumentFragment();
		for (let i = 0; i < currentDigits.length; i++) {
			const span = document.createElement("span");
			span.className = "digit-char";
			span.textContent = currentDigits[i];
			if (direction) {
				span.classList.add(direction === "up" ? "digit-up" : "digit-down");
			}
			fragment.appendChild(span);
		}
		countLabel.replaceChildren(fragment);
	} else {
		// Update in-place without touching DOM structure
		for (let i = 0; i < currentDigits.length; i++) {
			const span = existingSpans[i];
			if (currentDigits[i] !== previousDigits[i]) {
				span.textContent = currentDigits[i];
				span.classList.remove("digit-up", "digit-down");
				void span.offsetWidth; // Restart animation cleanly
				span.classList.add(direction === "up" ? "digit-up" : "digit-down");
			}
		}
	}

	previousDigits = currentDigits;
}

// Automatically scale down font size so large numbers (e.g. 10000, 1000000) always fit
function adjustFontSize() {
	const digits = count.toString().length;
	if (digits <= 4) {
		countLabel.style.fontSize = ""; // default responsive clamp(48px, 22vw, 120px)
	} else if (digits === 5) {
		countLabel.style.fontSize = "min(88px, 18vw)";
	} else if (digits === 6) {
		countLabel.style.fontSize = "min(72px, 15vw)";
	} else if (digits === 7) {
		countLabel.style.fontSize = "min(62px, 13vw)";
	} else {
		countLabel.style.fontSize = "min(50px, 11vw)";
	}
}

function persistCount() {
	try {
		localStorage.setItem(STORAGE_KEYS.COUNT, count);
	} catch (e) {
		console.warn("Count save failed:", e);
	}
}

function incrementCounter() {
	recordSessionStart();
	count++;
	updateDisplay("up");
	persistCount();
	triggerVibration();
	checkTarget();
}

function decrementCounter(e) {
	if (e) e.stopPropagation();
	if (count > 0) {
		count--;
		updateDisplay("down");
		persistCount();
		doVibrate(INTENSITIES[vibrationIntensity] || 50);
		checkTarget(false); // Do not play confetti celebration when decrementing back to target
	}
}

function resetCounter() {
	if (count === 0) return;
	archiveSession();
	count = 0;
	updateDisplay("down");
	persistCount();
	checkTarget(false);
}

// Responsive text
function updateButtonText() {
	interactionText.textContent = window.innerWidth <= 700 ? "Tap" : "Click";
}

// Event Delegation & Setup
countLabel.addEventListener("click", decrementCounter);
tapAreaBottom.addEventListener("click", incrementCounter);
resetButton.addEventListener("click", resetCounter);

// Prevent browser context menu / callout popup on mobile long-press
countLabel.addEventListener("contextmenu", (e) => e.preventDefault());
tapAreaBottom.addEventListener("contextmenu", (e) => e.preventDefault());

settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
saveSettingsBtn.addEventListener("click", saveSettings);

// History tab switching & clear buttons
tabBtnGeneral.addEventListener("click", () => switchTab("general"));
tabBtnHistory.addEventListener("click", () => switchTab("history"));
clearHistoryBtn.addEventListener("click", clearAllHistory);

settingsModal.addEventListener("click", (e) => {
	if (e.target === settingsModal) closeSettings();
});

vibrationToggle.addEventListener("change", (e) => {
	intensitySection.style.display = e.target.checked ? "block" : "none";
});

segmentButtons.forEach((btn) => {
	btn.addEventListener("click", () => {
		segmentButtons.forEach((b) => b.classList.remove("active"));
		btn.classList.add("active");
		pendingVibrationIntensity = btn.dataset.intensity;

		if (vibrationToggle.checked) {
			doVibrate(INTENSITIES[pendingVibrationIntensity]);
		}
	});
});

window.addEventListener("resize", updateButtonText);

// Desktop keyboard shortcuts (Space / Up Arrow to count, Down Arrow to subtract)
window.addEventListener("keydown", (e) => {
	// Don't trigger if user is typing inside an input field
	if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
	if (!settingsModal.classList.contains("hidden")) return;

	if (e.code === "Space" || e.key === "ArrowUp") {
		e.preventDefault();
		incrementCounter();
	} else if (e.key === "ArrowDown" || e.key === "-") {
		e.preventDefault();
		decrementCounter();
	}
});

// Init
updateButtonText();
loadSettings();
