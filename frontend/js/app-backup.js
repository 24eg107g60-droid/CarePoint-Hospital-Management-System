// ==========================================
// CAREPOINT HOSPITAL MANAGEMENT SYSTEM
// Frontend JavaScript + Smart Hospital Chatbot
// ==========================================

const API = "/api";
let selectedRole = "PATIENT";
let currentUser = null;

// Helper to select HTML elements
const $ = (id) => document.getElementById(id);

// ==========================================
// API REQUEST HELPER
// ==========================================

async function apiRequest(path, options = {}) {
    const response = await fetch(API + path, {
        ...options,
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const text = await response.text();
    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!response.ok) {
        const message =
            data && typeof data === "object"
                ? data.message || data.error
                : data;

        throw new Error(
            message || `Request failed (${response.status})`
        );
    }

    return data;
}

function showMessage(elementId, message) {
    const element = $(elementId);
    if (element) {
        element.textContent = message;
    }
}

function showError(error) {
    alert(error.message || "Something went wrong.");
}

// ==========================================
// ROLE SELECTION
// ==========================================

document.querySelectorAll("[data-role]").forEach(button => {
    button.addEventListener("click", () => {
        selectedRole = button.dataset.role;

        if ($("selectedRole")) {
            $("selectedRole").value = selectedRole;
        }

        document.querySelectorAll("[data-role]").forEach(item => {
            item.classList.toggle("active", item === button);
        });

        const loginSection = $("authSection") || $("loginForm");

        if (loginSection) {
            loginSection.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    });
});

// ==========================================
// LOGIN AND REGISTER TABS
// ==========================================

function showAuthTab(tab) {
    const loginForm = $("loginForm");
    const registerForm = $("registerForm");

    if (loginForm) {
        loginForm.hidden = tab !== "login";
    }

    if (registerForm) {
        registerForm.hidden = tab !== "register";
    }
}

document.querySelectorAll("[data-auth-tab]").forEach(button => {
    button.addEventListener("click", () => {
        showAuthTab(button.dataset.authTab);
    });
});

// ==========================================
// PATIENT REGISTRATION
// ==========================================

if ($("registerForm")) {
    $("registerForm").addEventListener("submit", async event => {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        const name =
            formData.get("name") ||
            form.querySelector('[name="name"]')?.value;

        const email =
            formData.get("email") ||
            form.querySelector('[name="email"]')?.value;

        const password =
            formData.get("password") ||
            form.querySelector('[name="password"]')?.value;

        try {
            await apiRequest("/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            });

            alert("Registration successful! Please log in.");

            if ($("loginForm")?.elements.email) {
                $("loginForm").elements.email.value = email;
            }

            form.reset();
            showAuthTab("login");
        } catch (error) {
            showError(error);
        }
    });
}

// ==========================================
// LOGIN
// ==========================================

if ($("loginForm")) {
    $("loginForm").addEventListener("submit", async event => {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        const email = formData.get("email");
        const password = formData.get("password");

        try {
            const user = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const actualRole = String(user.role || "")
                .replace("ROLE_", "")
                .toUpperCase();

            if (actualRole !== selectedRole) {
                try {
                    await apiRequest("/auth/logout", {
                        method: "POST"
                    });
                } catch {
                    // Preserve the original role mismatch message.
                }

                alert(
                    `You selected ${selectedRole}, but this account is ${actualRole}. Please select the correct role.`
                );
                return;
            }

            currentUser = user;

            if ($("sessionPanel")) {
                $("sessionPanel").hidden = false;
            }

            if ($("sessionStatus")) {
                $("sessionStatus").textContent =
                    `Logged in as ${user.name || user.email} (${actualRole})`;
            }

            if ($("dashboardButton")) {
                $("dashboardButton").hidden = false;
            }

            form.reset();

            const registerForm = $("registerForm");
            if (registerForm) {
                registerForm.hidden = true;
            }

            form.hidden = true;

            document.querySelectorAll("[data-auth-tab]").forEach(button => {
                button.hidden = true;
            });

            openDashboard();
        } catch (error) {
            showError(error);
        }
    });
}

// ==========================================
// LOGOUT
// ==========================================

if ($("logoutButton")) {
    $("logoutButton").addEventListener("click", async () => {
        try {
            await apiRequest("/auth/logout", {
                method: "POST"
            });
        } catch (error) {
            console.error("Logout request failed:", error);
        }

        currentUser = null;
        selectedRole = "PATIENT";

        if ($("sessionPanel")) {
            $("sessionPanel").hidden = true;
        }

        if ($("dashboardButton")) {
            $("dashboardButton").hidden = true;
        }

        if ($("loginForm")) {
            $("loginForm").hidden = false;
        }

        if ($("registerForm")) {
            $("registerForm").hidden = false;
        }

        document.querySelectorAll("[data-auth-tab]").forEach(button => {
            button.hidden = false;
        });

        if ($("dashboard")) {
            $("dashboard").hidden = true;
        }

        alert("You have been logged out.");
    });
}

// ==========================================
// DASHBOARD
// ==========================================

function openDashboard() {
    if (!currentUser) {
        alert("Please log in first.");
        return;
    }

    const dashboard = $("dashboard");

    if (dashboard) {
        dashboard.hidden = false;
        dashboard.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    const role = String(currentUser.role || "")
        .replace("ROLE_", "")
        .toUpperCase();

    // Show role-specific sections if these IDs exist.
    document.querySelectorAll("[data-allowed-roles]").forEach(section => {
        const allowedRoles = section.dataset.allowedRoles
            .split(",")
            .map(value => value.trim().toUpperCase());

        section.hidden = !allowedRoles.includes(role);
    });

    loadDoctors();
}

if ($("dashboardButton")) {
    $("dashboardButton").addEventListener("click", openDashboard);
}

// ==========================================
// LOAD DOCTORS
// ==========================================

async function loadDoctors() {
    try {
        const doctors = await apiRequest("/doctors");

        if ($("doctorCount")) {
            $("doctorCount").textContent = doctors.length;
        }

        displayRecords("doctorRecords", doctors, [
            "name",
            "specialization",
            "email",
            "phone"
        ]);

        // Fill appointment doctor dropdown if available.
        const select = $("appointmentDoctor");

        if (select) {
            select.innerHTML = '<option value="">Select doctor</option>';

            doctors.forEach(doctor => {
                const option = document.createElement("option");
                option.value = doctor.id;
                option.textContent =
                    `${doctor.name} - ${doctor.specialization || "General"}`;

                select.appendChild(option);
            });
        }

        return doctors;
    } catch (error) {
        console.error("Could not load doctors:", error);
        showMessage("records", error.message);
    }
}

if ($("loadDoctors")) {
    $("loadDoctors").addEventListener("click", loadDoctors);
}

// ==========================================
// LOAD PATIENTS
// ==========================================

async function loadPatients() {
    try {
        const patients = await apiRequest("/patients");

        if ($("patientCount")) {
            $("patientCount").textContent = patients.length;
        }

        displayRecords("patientRecords", patients, [
            "name",
            "email",
            "phone",
            "gender"
        ]);

        const select = $("appointmentPatient");

        if (select) {
            select.innerHTML = '<option value="">Select patient</option>';

            patients.forEach(patient => {
                const option = document.createElement("option");
                option.value = patient.id;
                option.textContent = patient.name;
                select.appendChild(option);
            });
        }

        return patients;
    } catch (error) {
        console.error("Could not load patients:", error);
        showMessage("records", error.message);
    }
}

if ($("loadPatients")) {
    $("loadPatients").addEventListener("click", loadPatients);
}

// ==========================================
// LOAD APPOINTMENTS
// ==========================================

async function loadAppointments() {
    try {
        const appointments = await apiRequest("/appointments");

        if ($("appointmentCount")) {
            $("appointmentCount").textContent = appointments.length;
        }

        const records = appointments.map(appointment => ({
            patient: appointment.patient?.name ||
                appointment.patient?.id || "N/A",
            doctor: appointment.doctor?.name ||
                appointment.doctor?.id || "N/A",
            appointmentDate: appointment.appointmentDate || "N/A",
            reason: appointment.reason || "N/A"
        }));

        displayRecords("appointmentRecords", records, [
            "patient",
            "doctor",
            "appointmentDate",
            "reason"
        ]);

        return appointments;
    } catch (error) {
        console.error("Could not load appointments:", error);
        showMessage("records", error.message);
    }
}

if ($("loadAppointments")) {
    $("loadAppointments").addEventListener(
        "click",
        loadAppointments
    );
}

// ==========================================
// DISPLAY RECORDS SAFELY
// ==========================================

function displayRecords(containerId, records, fields) {
    const container = $(containerId);

    if (!container) {
        return;
    }

    container.replaceChildren();

    if (!records || records.length === 0) {
        container.textContent = "No records found.";
        return;
    }

    records.forEach(record => {
        const item = document.createElement("div");
        item.className = "record-item";

        fields.forEach(field => {
            const line = document.createElement("p");
            line.textContent =
                `${field}: ${record[field] ?? "N/A"}`;
            item.appendChild(line);
        });

        container.appendChild(item);
    });
}

// ==========================================
// ADD PATIENT
// ==========================================

if ($("patientForm")) {
    $("patientForm").addEventListener("submit", async event => {
        event.preventDefault();

        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());

        try {
            await apiRequest("/patients", {
                method: "POST",
                body: JSON.stringify(data)
            });

            alert("Patient added successfully.");
            form.reset();
            await loadPatients();
        } catch (error) {
            showError(error);
        }
    });
}

// ==========================================
// ADD DOCTOR
// ==========================================

if ($("doctorForm")) {
    $("doctorForm").addEventListener("submit", async event => {
        event.preventDefault();

        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());

        try {
            await apiRequest("/doctors", {
                method: "POST",
                body: JSON.stringify(data)
            });

            alert("Doctor added successfully.");
            form.reset();
            await loadDoctors();
        } catch (error) {
            showError(error);
        }
    });
}

// ==========================================
// BOOK APPOINTMENT
// ==========================================

if ($("appointmentForm")) {
    $("appointmentForm").addEventListener("submit", async event => {
        event.preventDefault();

        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());

        const patientId = data.patientId || data.patient;
        const doctorId = data.doctorId || data.doctor;

        if (!patientId || !doctorId) {
            alert("Please select a patient and doctor.");
            return;
        }

        const appointment = {
            patient: { id: Number(patientId) },
            doctor: { id: Number(doctorId) },
            appointmentDate:
                data.appointmentDate || data.date,
            reason: data.reason
        };

        try {
            await apiRequest("/appointments", {
                method: "POST",
                body: JSON.stringify(appointment)
            });

            alert("Appointment booked successfully.");
            form.reset();
            await loadAppointments();
        } catch (error) {
            showError(error);
        }
    });
}

// ==========================================
// SMART HOSPITAL CHATBOT
// No external API required
// ==========================================

const chatbotAnswers = [
    {
        keywords: ["hello", "hi", "hey", "good morning", "good evening"],
        answer: "Hello! Welcome to CarePoint Hospital. 😊 How can I help you today?"
    },
    {
        keywords: ["register", "registration", "create account", "sign up"],
        answer: "To register, select the Patient role, open Register, enter your name, email and password, then submit the form."
    },
    {
        keywords: ["login", "log in", "sign in", "password"],
        answer: "Select your account role, open Login, and enter your registered email and password. If login fails, check your details and try again."
    },
    {
        keywords: ["doctor", "doctors", "specialist", "specialization"],
        answer: "You can use the Doctors section to view available doctor records and their specializations. Please log in with an account that has permission to access the relevant section."
    },
    {
        keywords: ["appointment", "book", "booking", "schedule", "meeting"],
        answer: "To book an appointment, open the appointment form, select a patient and doctor, enter the appointment date and reason, and submit. Your account must have the required permissions."
    },
    {
        keywords: ["patient", "patients", "patient records"],
        answer: "Patient records are available in the Patients section to authorized users. You can use the Load Patients option to retrieve records."
    },
    {
        keywords: ["cancel", "delete appointment", "remove appointment"],
        answer: "Please contact the hospital administrator to cancel an appointment. This demo chatbot does not cancel or change bookings."
    },
    {
        keywords: ["dashboard", "statistics", "count", "total", "analytics"],
        answer: "The dashboard displays available summary counts for doctors, patients and appointments. Use the relevant Load buttons to refresh the data."
    },
    {
        keywords: ["admin", "administrator", "role", "access"],
        answer: "Access depends on your assigned account role. Patient registration creates patient accounts; administrator and doctor accounts require authorized setup."
    },
    {
        keywords: ["timing", "timings", "hours", "open", "working hours", "location", "address", "phone"],
        answer: "Hospital contact details and working hours have not been configured in this demo. Please contact the hospital directly for verified information."
    },
    {
        keywords: ["prescription", "medicine", "medication"],
        answer: "This demo chatbot cannot issue prescriptions or recommend medicines. Please consult a qualified healthcare professional."
    },
    {
        keywords: ["symptom", "symptoms", "diagnose", "diagnosis", "treatment", "pain", "fever", "sick"],
        answer: "I can help with website navigation, but I cannot diagnose symptoms or recommend treatment. Please consult a qualified healthcare professional. For an emergency, contact your local emergency service."
    },
    {
        keywords: ["thank", "thanks", "thank you"],
        answer: "You're welcome! 😊 I'm happy to help you use CarePoint."
    },
    {
        keywords: ["help", "what can you do", "options", "features"],
        answer: "I can help with patient registration, login, doctor records, appointments, dashboard statistics and general website navigation. Try asking, 'How do I book an appointment?'"
    },
    {
        keywords: ["bye", "goodbye", "see you"],
        answer: "Thank you for visiting CarePoint Hospital. Have a great day! 👋"
    }
];

function getChatbotAnswer(message) {
    const normalizedMessage = message
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!normalizedMessage) {
        return "Please type a question so I can help you.";
    }

    let bestAnswer = null;
    let bestScore = 0;

    chatbotAnswers.forEach(item => {
        let score = 0;

        item.keywords.forEach(keyword => {
            if (normalizedMessage.includes(keyword.toLowerCase())) {
                score += keyword.includes(" ") ? 2 : 1;
            }
        });

        if (score > bestScore) {
            bestScore = score;
            bestAnswer = item.answer;
        }
    });

    if (bestAnswer) {
        return bestAnswer;
    }

    return "I'm the CarePoint Smart Assistant. I can help with registration, login, doctors, appointments and dashboard features. Please try asking a more specific question.";
}

function addChatMessage(message, sender) {
    // Support common message container IDs.
    const container =
        $("chatMessages") ||
        $("chatHistory") ||
        $("chatBox") ||
        $("chatOutput");

    if (!container) {
        return;
    }

    const bubble = document.createElement("div");
    bubble.className = sender === "user"
        ? "chat-message user-message"
        : "chat-message bot-message";

    bubble.textContent = message;
    container.appendChild(bubble);

    container.scrollTop = container.scrollHeight;
}

if ($("chatForm")) {
    $("chatForm").addEventListener("submit", event => {
        event.preventDefault();

        const form = event.currentTarget;

        const input =
            $("chatInput") ||
            $("chatMessage") ||
            form.querySelector('input[type="text"]') ||
            form.querySelector("textarea");

        if (!input) {
            return;
        }

        const message = input.value.trim();

        if (!message) {
            return;
        }

        addChatMessage(message, "user");

        const answer = getChatbotAnswer(message);
        addChatMessage(answer, "bot");

        input.value = "";
        input.focus();
    });
}

// ==========================================
// CHATBOT WELCOME MESSAGE
// ==========================================

const chatContainer =
    $("chatMessages") ||
    $("chatHistory") ||
    $("chatBox") ||
    $("chatOutput");

if (chatContainer && !chatContainer.dataset.initialized) {
    chatContainer.dataset.initialized = "true";

    addChatMessage(
        "Hi! I'm the CarePoint Smart Assistant. Ask me about registration, doctors, appointments or using the website.",
        "bot"
    );
}

// ==========================================
// STARTUP
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("CarePoint Hospital Management System loaded.");
    console.log("Smart Hospital Assistant is ready.");
});

/* ===== CarePoint Chat Window Controls ===== */

const chatToggle = document.getElementById("chat-toggle");
const chatWindow = document.getElementById("chat-window");
const chatClose = document.getElementById("chat-close");

if (chatToggle && chatWindow) {
    chatToggle.addEventListener("click", () => {
        chatWindow.hidden = false;
        chatToggle.hidden = true;

        const chatInput = document.getElementById("chatInput");
        if (chatInput) {
            chatInput.focus();
        }
    });
}

if (chatClose && chatWindow && chatToggle) {
    chatClose.addEventListener("click", () => {
        chatWindow.hidden = true;
        chatToggle.hidden = false;
    });
}
