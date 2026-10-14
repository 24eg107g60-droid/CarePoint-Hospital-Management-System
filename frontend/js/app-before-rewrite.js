
"use strict";

/* =========================================
   CAREPOINT HOSPITAL MANAGEMENT SYSTEM
   Complete Frontend JavaScript
   ========================================= */

const API = "/api";

let selectedRole = "PATIENT";
let currentUser = null;

/* ---------- API HELPER ---------- */

async function apiRequest(url, options = {}) {
    let response;

    try {
        response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });
    } catch {
        throw new Error(
            "Cannot connect to the server. Make sure Spring Boot is running."
        );
    }

    const text = await response.text();
    let data = {};

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = { message: text };
        }
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Request failed with status ${response.status}`
        );
    }

    return data;
}

/* ---------- SAFE MESSAGE DISPLAY ---------- */

function showMessage(elementId, message, success = false) {
    const element = document.getElementById(elementId);

    if (!element) {
        console.warn(`${elementId}: ${message}`);
        return;
    }

    element.textContent = message;
    element.style.color = success ? "green" : "crimson";
}

/* ---------- SAFE FORM RESET ---------- */

function resetForm(form) {
    if (form && typeof form.reset === "function") {
        form.reset();
    }
}

/* ---------- AUTHENTICATION TABS ---------- */

function showAuthTab(tabId) {
    ["loginForm", "registerForm"].forEach(id => {
        const form = document.getElementById(id);

        if (form) {
            form.style.display = id === tabId ? "block" : "none";
        }
    });

    document.querySelectorAll("[data-tab]").forEach(button => {
        button.classList.toggle("active", button.dataset.tab === tabId);
    });

    document.querySelectorAll("[data-auth-tab]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.authTab === tabId
        );
    });
}

document.querySelectorAll("[data-tab]").forEach(button => {
    button.addEventListener("click", () => {
        showAuthTab(button.dataset.tab);
    });
});

document.querySelectorAll("[data-auth-tab]").forEach(button => {
    button.addEventListener("click", () => {
        showAuthTab(button.dataset.authTab);
    });
});

/* ---------- ROLE SELECTION ---------- */

document.querySelectorAll("[data-role]").forEach(button => {
    button.addEventListener("click", () => {
        selectedRole = button.dataset.role || "PATIENT";

        document.querySelectorAll("[data-role]").forEach(item => {
            item.classList.toggle("active", item === button);
        });
    });
});

/* ---------- REGISTRATION ---------- */

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async event => {
        event.preventDefault();

        const name =
            document.getElementById("regName")?.value.trim();

        const email =
            document.getElementById("regEmail")?.value.trim();

        const password =
            document.getElementById("regPassword")?.value;

        if (!name || !email || !password) {
            showMessage(
                "registerMessage",
                "Please fill in all registration fields."
            );
            return;
        }

        if (password.length < 8) {
            showMessage(
                "registerMessage",
                "Password must contain at least 8 characters."
            );
            return;
        }

        try {
            const result = await apiRequest("/api/auth/register", {
                method: "POST",
                body: JSON.stringify({ name, email, password })
            });

            showMessage(
                "registerMessage",
                result.message || "Registration successful. Please log in.",
                true
            );

            resetForm(event.currentTarget);
        } catch (error) {
            showMessage("registerMessage", error.message);
        }
    });
}

/* ---------- LOGIN ---------- */

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        const email =
            document.getElementById("loginEmail")?.value.trim();

        const password =
            document.getElementById("loginPassword")?.value;

        if (!email || !password) {
            showMessage("loginMessage", "Enter your email and password.");
            return;
        }

        try {
            const result = await apiRequest("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });

            const returnedRole = String(result.role || "")
                .replace(/^ROLE_/, "");

            if (
                returnedRole &&
                selectedRole &&
                returnedRole !== selectedRole
            ) {
                showMessage(
                    "loginMessage",
                    `This account belongs to the ${returnedRole} role.`
                );
                return;
            }

            currentUser = result;

            showMessage(
                "loginMessage",
                result.message || "Login successful!",
                true
            );

            const dashboard = document.getElementById("dashboard");

            if (dashboard) {
                dashboard.style.display = "block";
                dashboard.scrollIntoView({ behavior: "smooth" });
            }

            const sessionStatus =
                document.getElementById("sessionStatus");

            if (sessionStatus) {
                sessionStatus.textContent =
                    `Logged in as ${result.email || email} (${returnedRole || "USER"})`;
            }

            const sessionPanel =
                document.getElementById("sessionPanel");

            if (sessionPanel) {
                sessionPanel.style.display = "block";
            }

            await loadCounts();
        } catch (error) {
            showMessage("loginMessage", error.message);
        }
    });
}

/* ---------- LOGOUT ---------- */

const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        try {
            await apiRequest("/api/auth/logout", {
                method: "POST"
            });
        } catch (error) {
            console.warn("Logout request:", error.message);
        }

        currentUser = null;

        const dashboard = document.getElementById("dashboard");
        const sessionPanel = document.getElementById("sessionPanel");

        if (dashboard) dashboard.style.display = "none";
        if (sessionPanel) sessionPanel.style.display = "none";

        showAuthTab("loginForm");
        showMessage("loginMessage", "You have logged out.", true);
    });
}

/* ---------- DASHBOARD ---------- */

const dashboardButton = document.getElementById("dashboardButton");

if (dashboardButton) {
    dashboardButton.addEventListener("click", async () => {
        const dashboard = document.getElementById("dashboard");

        if (dashboard) dashboard.style.display = "block";

        await loadCounts();
    });
}

/* ---------- RECORDS ---------- */

function getArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data)) return data.data;
    return [];
}

function displayRecords(records) {
    const container = document.getElementById("records");

    if (!container) return;

    container.replaceChildren();

    if (!records.length) {
        container.textContent = "No records found.";
        return;
    }

    const table = document.createElement("table");
    const header = document.createElement("tr");
    const keys = Object.keys(records[0]);

    keys.forEach(key => {
        const th = document.createElement("th");
        th.textContent = key;
        header.appendChild(th);
    });

    table.appendChild(header);

    records.forEach(record => {
        const row = document.createElement("tr");

        keys.forEach(key => {
            const cell = document.createElement("td");
            const value = record[key];

            cell.textContent =
                value !== null && typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value ?? "");

            row.appendChild(cell);
        });

        table.appendChild(row);
    });

    container.appendChild(table);
}

async function loadRecords(type) {
    try {
        const data = await apiRequest(`/api/${type}`);
        displayRecords(getArray(data));
    } catch (error) {
        const container = document.getElementById("records");

        if (container) {
            container.textContent =
                `Unable to load records: ${error.message}`;
        }
    }
}

async function loadCounts() {
    const items = [
        ["doctors", "doctorCount"],
        ["patients", "patientCount"],
        ["appointments", "appointmentCount"]
    ];

    for (const [type, elementId] of items) {
        try {
            const data = await apiRequest(`/api/${type}`);
            const element = document.getElementById(elementId);

            if (element) {
                element.textContent = getArray(data).length;
            }
        } catch (error) {
            console.warn(`Unable to load ${type}:`, error.message);
        }
    }
}

[
    ["loadDoctors", "doctors"],
    ["loadPatients", "patients"],
    ["loadAppointments", "appointments"]
].forEach(([buttonId, type]) => {
    const button = document.getElementById(buttonId);

    if (button) {
        button.addEventListener("click", () => loadRecords(type));
    }
});

/* ---------- FORM VALUE HELPER ---------- */

function getFormValue(form, names) {
    for (const name of names) {
        const element =
            form.elements.namedItem(name) ||
            document.getElementById(name);

        if (element && typeof element.value === "string") {
            return element.value.trim();
        }
    }

    return "";
}

/* ---------- ADD PATIENT ---------- */

const patientForm = document.getElementById("patientForm");

if (patientForm) {
    patientForm.addEventListener("submit", async event => {
        event.preventDefault();

        const form = event.currentTarget;
        const payload = {};

        for (const element of form.elements) {
            if (element.name && element.value.trim()) {
                payload[element.name] = element.value.trim();
            }
        }

        try {
            const result = await apiRequest("/api/patients", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showMessage(
                "patientMessage",
                result.message || "Patient saved successfully.",
                true
            );

            resetForm(form);
            await loadCounts();
        } catch (error) {
            showMessage("patientMessage", error.message);
        }
    });
}

/* ---------- ADD DOCTOR ---------- */

const doctorForm = document.getElementById("doctorForm");

if (doctorForm) {
    doctorForm.addEventListener("submit", async event => {
        event.preventDefault();

        const form = event.currentTarget;
        const payload = {};

        for (const element of form.elements) {
            if (element.name && element.value.trim()) {
                payload[element.name] = element.value.trim();
            }
        }

        try {
            const result = await apiRequest("/api/doctors", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showMessage(
                "doctorMessage",
                result.message || "Doctor saved successfully.",
                true
            );

            resetForm(form);
            await loadCounts();
        } catch (error) {
            showMessage("doctorMessage", error.message);
        }
    });
}

/* ---------- APPOINTMENT DATE VALIDATION ---------- */

function normalizeAppointmentDate(value) {
    let date = String(value || "").trim();

    // Repair a date such as 12026-03-01.
    if (/^1\d{4}-\d{2}-\d{2}$/.test(date)) {
        date = date.substring(1);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error("Please select a valid appointment date.");
    }

    const [year, month, day] = date.split("-").map(Number);

    const check = new Date(Date.UTC(year, month - 1, day));

    if (
        check.getUTCFullYear() !== year ||
        check.getUTCMonth() !== month - 1 ||
        check.getUTCDate() !== day
    ) {
        throw new Error("Please select a valid calendar date.");
    }

    return date;
}

/* ---------- BOOK APPOINTMENT ---------- */

const appointmentForm = document.getElementById("appointmentForm");

if (appointmentForm) {
    appointmentForm.addEventListener("submit", async event => {
        event.preventDefault();

        const form = event.currentTarget;

        try {
            const patientId = getFormValue(
                form,
                ["appointmentPatientId", "patientId", "patient", "patient-id"]
            );

            const doctorId = getFormValue(
                form,
                ["appointmentDoctorId", "doctorId", "doctor", "doctor-id"]

            const rawDate = getFormValue(
                form,
                ["appointmentDate", "date", "appointment-date"]
            );

            const reason = getFormValue(
                form,
                ["reason", "appointmentReason"]
            );

            if (!patientId || !doctorId || !rawDate) {
                throw new Error(
                    "Enter the patient ID, doctor ID, and appointment date."
                );
            }

            const appointmentDate =
                normalizeAppointmentDate(rawDate);

            const payload = {
                patient: { id: Number(patientId) },
                doctor: { id: Number(doctorId) },
                appointmentDate: appointmentDate,
                reason: reason
            };

            const result = await apiRequest("/api/appointments", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showMessage(
                "appointmentMessage",
                result.message || "Appointment booked successfully.",
                true
            );

            // Reset the actual submitted form safely.
            resetForm(form);

            await loadCounts();
        } catch (error) {
            showMessage("appointmentMessage", error.message);
        }
    });
}

/* ---------- FAQ ASSISTANT ---------- */

function getFaqAnswer(question) {
    const text = String(question || "").toLowerCase();

    if (text.includes("appointment") || text.includes("booking")) {
        return "To book an appointment, enter the patient ID, doctor ID, date, and reason.";
    }

    if (text.includes("register") || text.includes("account")) {
        return "Open Register and enter your name, email, and a password of at least 8 characters.";
    }

    if (text.includes("doctor")) {
        return "Use the Doctors section to view doctor records, subject to your permissions.";
    }

    if (text.includes("patient")) {
        return "Use the Patients section to view patient records, subject to your permissions.";
    }

    if (text.includes("payment") || text.includes("bill")) {
        return "Please contact hospital administration for payment and billing information.";
    }

    if (text.includes("hello") || text.includes("hi")) {
        return "Hello! Welcome to CarePoint. How can I help you?";
    }

    return "I can answer questions about registration, patients, doctors, and appointments.";
}

/* ---------- FAQ FORM ---------- */

document.querySelectorAll("form#chatForm").forEach(form => {
    if (form.querySelector("#chatQuestion")) {
        form.addEventListener("submit", event => {
            event.preventDefault();

            const input = document.getElementById("chatQuestion");
            const answer = document.getElementById("chatAnswer");

            if (input && answer) {
                answer.textContent = getFaqAnswer(input.value);
            }
        });
    }

    if (form.querySelector("#chatInput")) {
        form.addEventListener("submit", event => {
            event.preventDefault();

            const input = document.getElementById("chatInput");
            const messages = document.getElementById("chatMessages");

            if (!input || !messages || !input.value.trim()) return;

            const question = input.value.trim();

            const userMessage = document.createElement("p");
            userMessage.textContent = `You: ${question}`;
            messages.appendChild(userMessage);

            const botMessage = document.createElement("p");
            botMessage.textContent =
                `CarePoint: ${getFaqAnswer(question)}`;
            messages.appendChild(botMessage);

            input.value = "";
            messages.scrollTop = messages.scrollHeight;
        });
    }
});

/* ---------- FLOATING CHAT WINDOW ---------- */

const chatToggle = document.getElementById("chat-toggle");
const chatWindow = document.getElementById("chat-window");
const chatClose = document.getElementById("chat-close");

if (chatToggle && chatWindow) {
    chatToggle.addEventListener("click", () => {
        chatWindow.style.display =
            chatWindow.style.display === "block" ? "none" : "block";
    });
}

if (chatClose && chatWindow) {
    chatClose.addEventListener("click", () => {
        chatWindow.style.display = "none";
    });
}

/* ---------- INITIAL PAGE SETUP ---------- */

document.addEventListener("DOMContentLoaded", () => {
    const dashboard = document.getElementById("dashboard");

    if (dashboard && !currentUser) {
        dashboard.style.display = "none";
    }

    loadCounts();
});
