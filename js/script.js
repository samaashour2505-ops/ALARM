

// ==========================================
// 1. CINEMATIC INTRO
// ==========================================

const intro = document.getElementById("intro");
const site = document.getElementById("site");
const enterBtn = document.getElementById("enterBtn");
const skipIntro = document.getElementById("skipIntro");

let introOpened = false;

function enterWorld() {
    if (introOpened) return;
    introOpened = true;

    intro?.classList.add("hide");
    site?.classList.add("visible");

    setTimeout(() => {
        document.querySelectorAll(".reveal").forEach(element => {
            element.classList.add("visible");
        });
    }, 250);
}

enterBtn?.addEventListener("click", enterWorld);
skipIntro?.addEventListener("click", enterWorld);


// ==========================================
// 2. LIVE CLOCK AND DATE
// ==========================================

const clock = document.getElementById("clock");
const clockDate = document.getElementById("clockDate");
const year = document.getElementById("year");

function updateClock() {
    const now = new Date();

    if (clock) {
        clock.textContent = now.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        });
    }

    if (clockDate) {
        clockDate.textContent = now.toLocaleDateString("ar-EG", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }
}

updateClock();
setInterval(updateClock, 1000);

if (year) {
    year.textContent = new Date().getFullYear();
}


// ==========================================
// 3. REVEAL ANIMATIONS
// ==========================================

if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12
    });

    document.querySelectorAll(".reveal").forEach(element => {
        observer.observe(element);
    });
} else {
    document.querySelectorAll(".reveal").forEach(element => {
        element.classList.add("visible");
    });
}


// ==========================================
// 4. ALARM ELEMENTS AND STATE
// ==========================================

const alarmTimeInput = document.getElementById("alarmTime");
const soundEnabled = document.getElementById("soundEnabled");
const visualEnabled = document.getElementById("visualEnabled");
const alarmStatus = document.getElementById("alarmStatus");
const alarmModal = document.getElementById("alarmModal");

const setAlarmBtn = document.getElementById("setAlarm");
const testSoundBtn = document.getElementById("testSound");
const stopAlarmBtn = document.getElementById("dismissAlarm");
const snoozeBtn = document.getElementById("snoozeAlarm");
const cancelAlarmBtn = document.getElementById("cancelAlarm");

const alarmSoundSelect = document.getElementById("alarmSound");
const previewSoundBtn = document.getElementById("previewSound");

let alarmTime = null;
let alarmActive = false;
let lastTriggeredDate = "";

let snoozeTimeout = null;
let snoozePending = false;
let snoozeGeneration = 0;
let visualInterval = null;

// The audio file selected by the user.
const alarmAudio = new Audio();
alarmAudio.loop = true;
alarmAudio.preload = "auto";


// ==========================================
// 5. STATUS MESSAGE
// ==========================================

function setStatus(message, active = true) {
    if (!alarmStatus) return;

    alarmStatus.textContent = message;
    alarmStatus.classList.toggle("active", active);
}


// ==========================================
// 6. PLAY THE SELECTED MP3 FILE
// ==========================================

function getSelectedSoundPath() {
    return alarmSoundSelect?.value || "";
}

function stopAudioPlayback() {
    alarmAudio.pause();

    try {
        alarmAudio.currentTime = 0;
    } catch (error) {
        // The file may not be loaded yet.
    }
}

async function playSelectedSound() {
    if (!soundEnabled?.checked) {
        setStatus("فعّلي الصوت أولًا من إعدادات المنبه.");
        return;
    }

    const path = getSelectedSoundPath();

    if (!path) {
        setStatus("اختاري صوت المنبه أولًا.");
        return;
    }

    const soundURL = new URL(path, document.baseURI).href;

    if (alarmAudio.src !== soundURL) {
        stopAudioPlayback();
        alarmAudio.src = soundURL;
        alarmAudio.load();
    }

    try {
        await alarmAudio.play();
    } catch (error) {
        setStatus(
            "تعذر تشغيل الصوت. تأكدي من اسم الملف ومساره."
        );
    }
}


// ==========================================
// 7. PREVIEW SOUND
// ==========================================

async function previewSelectedSound() {
    const path = getSelectedSoundPath();

    if (!path) {
        setStatus("اختاري صوتًا من القائمة أولًا.");
        return;
    }

    // Don't preview while the alarm is ringing.
    if (alarmActive) {
        setStatus("أوقفي المنبه قبل تجربة صوت آخر.");
        return;
    }

    stopAudioPlayback();

    alarmAudio.src = new URL(path, document.baseURI).href;
    alarmAudio.load();

    await playSelectedSound();

    if (!alarmAudio.paused) {
        setStatus("جاري تجربة الصوت المختار.");
    }
}

previewSoundBtn?.addEventListener("click", previewSelectedSound);
testSoundBtn?.addEventListener("click", previewSelectedSound);

alarmSoundSelect?.addEventListener("change", () => {
    if (!alarmActive) {
        stopAudioPlayback();
        setStatus("تم اختيار الصوت الجديد. اضغطي تجربة الصوت.");
    }
});


// ==========================================
// 8. START AND STOP SOUND
// ==========================================

function startSound() {
    if (!soundEnabled?.checked) return;
    playSelectedSound();
}

function stopSound() {
    stopAudioPlayback();

    clearInterval(visualInterval);
    visualInterval = null;

    document.body.classList.remove("alarm-flash");
}


// ==========================================
// 9. SET ALARM
// ==========================================

setAlarmBtn?.addEventListener("click", () => {
    const selectedTime = alarmTimeInput?.value;

    if (!selectedTime) {
        setStatus("اختاري وقت المنبه أولًا.");
        alarmTimeInput?.focus();
        return;
    }

    stopSound();

    clearTimeout(snoozeTimeout);
    snoozeTimeout = null;

    snoozePending = false;
    snoozeGeneration++;

    alarmTime = selectedTime;
    alarmActive = false;
    lastTriggeredDate = "";

    alarmModal?.classList.remove("show");

    setStatus("المنبه مضبوط على " + selectedTime);
});


// ==========================================
// 10. CHECK TIME
// ==========================================

function getDateKey(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

function checkAlarm() {
    if (!alarmTime || alarmActive || snoozePending) return;

    const now = new Date();

    const currentTime =
        String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0");

    const today = getDateKey(now);

    if (
        currentTime === alarmTime &&
        lastTriggeredDate !== today
    ) {
        lastTriggeredDate = today;
        startAlarm();
    }
}

setInterval(checkAlarm, 1000);


// ==========================================
// 11. START RINGING
// ==========================================

function startAlarm() {
    alarmActive = true;

    alarmModal?.classList.add("show");

    if (soundEnabled?.checked) {
        startSound();
    }

    if (visualEnabled?.checked) {
        document.body.classList.add("alarm-flash");

        clearInterval(visualInterval);

        visualInterval = setInterval(() => {
            document.body.classList.toggle("alarm-flash");
        }, 700);
    }

    setStatus("حان موعد المنبه الآن!");
}


// ==========================================
// 12. DISMISS ALARM
// ==========================================

function dismissAlarm() {
    stopSound();

    clearTimeout(snoozeTimeout);
    snoozeTimeout = null;

    snoozePending = false;
    snoozeGeneration++;

    alarmActive = false;

    alarmModal?.classList.remove("show");

    setStatus(
        alarmTime
            ? "تم إيقاف الصوت. المنبه مضبوط على " + alarmTime
            : "تم إيقاف المنبه."
    );
}

stopAlarmBtn?.addEventListener("click", dismissAlarm);


// ==========================================
// 13. SNOOZE FOR FIVE MINUTES
// ==========================================

snoozeBtn?.addEventListener("click", () => {
    stopSound();

    alarmModal?.classList.remove("show");

    alarmActive = false;
    snoozePending = true;

    clearTimeout(snoozeTimeout);

    const currentGeneration = ++snoozeGeneration;

    setStatus("تم التأجيل. سيعود المنبه بعد 5 دقائق.");

    snoozeTimeout = setTimeout(() => {
        if (
            currentGeneration !== snoozeGeneration ||
            !snoozePending
        ) {
            return;
        }

        snoozePending = false;
        snoozeTimeout = null;

        startAlarm();
    }, 5 * 60 * 1000);
});


// ==========================================
// 14. CANCEL ALARM
// ==========================================

cancelAlarmBtn?.addEventListener("click", () => {
    alarmTime = null;
    alarmActive = false;
    snoozePending = false;
    snoozeGeneration++;

    clearTimeout(snoozeTimeout);
    snoozeTimeout = null;

    stopSound();

    alarmModal?.classList.remove("show");

    setStatus("تم إلغاء المنبه.", false);
});


// ==========================================
// 15. SOUND SETTINGS
// ==========================================

soundEnabled?.addEventListener("change", () => {
    if (!soundEnabled.checked) {
        stopAudioPlayback();
    } else if (alarmActive) {
        startSound();
    }
});


// ==========================================
// 16. VISUAL SETTINGS
// ==========================================

visualEnabled?.addEventListener("change", () => {
    clearInterval(visualInterval);
    visualInterval = null;

    document.body.classList.remove("alarm-flash");

    if (visualEnabled.checked && alarmActive) {
        document.body.classList.add("alarm-flash");

        visualInterval = setInterval(() => {
            document.body.classList.toggle("alarm-flash");
        }, 700);
    }
});


// ==========================================
// 17. KEYBOARD SUPPORT
// ==========================================

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (alarmModal?.classList.contains("show")) {
            dismissAlarm();
        } else {
            enterWorld();
        }
    }
});

