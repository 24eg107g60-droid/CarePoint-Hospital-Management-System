// ==========================================
// SMART HOSPITAL ASSISTANT
// ==========================================

const chatbotAnswers = [
    {
        keywords: ["hello", "hi", "hii", "hey", "good morning", "good evening"],
        answer: "Hello! 👋 Welcome to CarePoint Hospital. How can I help you today?"
    },
    {
        keywords: ["register", "registration", "sign up", "create account"],
        answer: "To register, select Patient, open Register, enter your name, email and password, and submit the form."
    },
    {
        keywords: ["login", "log in", "sign in", "password"],
        answer: "Select your account role, open Login, and enter your registered email and password."
    },
    {
        keywords: ["doctor", "doctors", "specialist", "specialization"],
        answer: "Open the Doctors section and select Load Doctors to view available doctor records, subject to your account permissions."
    },
    {
        keywords: ["appointment", "appointments", "book", "booking", "schedule"],
        answer: "To book an appointment, select a patient and doctor, enter the appointment date and reason, then submit the form."
    },
    {
        keywords: ["patient", "patients", "patient records"],
        answer: "Open the Patients section and select Load Patients. Patient records are available only to authorized roles."
    },
    {
        keywords: ["dashboard", "statistics", "analytics", "total count"],
        answer: "Your dashboard provides summary counts for doctors, patients and appointments when the relevant data is available."
    },
    {
        keywords: ["admin", "administrator", "role", "permission"],
        answer: "Your available features depend on your assigned account role. Public registration creates patient accounts."
    },
    {
        keywords: ["cancel", "cancel appointment"],
        answer: "Please contact the hospital administrator to cancel an appointment. This chatbot cannot cancel bookings."
    },
    {
        keywords: ["timing", "timings", "working hours", "address", "phone number"],
        answer: "Hospital contact details and working hours have not been configured in this demo. Please contact the hospital directly."
    },
    {
        keywords: ["prescription", "medicine", "medication", "treatment"],
        answer: "I can help you use the website, but I cannot prescribe medicines or recommend treatment. Please consult a qualified healthcare professional."
    },
    {
        keywords: ["symptom", "symptoms", "diagnosis", "diagnose", "pain", "fever"],
        answer: "I cannot diagnose medical conditions. Please consult a qualified healthcare professional. For emergencies, contact your local emergency service."
    },
    {
        keywords: ["thank", "thanks", "thank you"],
        answer: "You're welcome! 😊 I'm happy to help."
    },
    {
        keywords: ["help", "features", "what can you do"],
        answer: "I can help with registration, login, doctors, appointments and dashboard features. Try asking: How do I book an appointment?"
    },
    {
        keywords: ["bye", "goodbye"],
        answer: "Thank you for visiting CarePoint Hospital. Have a great day! 👋"
    }
];

function getChatbotAnswer(message) {
    const text = message
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    let bestAnswer =
        "I'm the CarePoint Smart Assistant. I can help with registration, login, doctors, appointments and dashboard features.";

    let bestScore = 0;

    for (const item of chatbotAnswers) {
        let score = 0;

        for (const keyword of item.keywords) {
            if (text.includes(keyword)) {
                score += keyword.includes(" ") ? 2 : 1;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestAnswer = item.answer;
        }
    }

    return bestAnswer;
}

function addChatMessage(message, sender) {
    const container = document.getElementById("chatMessages");

    if (!container) {
        console.error("Chat messages container was not found.");
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

// ==========================================
// CHAT OPEN AND CLOSE CONTROLS
// ==========================================

const chatToggle = document.getElementById("chat-toggle");
const chatWindow = document.getElementById("chat-window");
const chatClose = document.getElementById("chat-close");

if (chatToggle && chatWindow) {
    chatToggle.addEventListener("click", () => {
        chatWindow.hidden = false;
        chatToggle.hidden = true;

        const input = document.getElementById("chatInput");

        if (input) {
            input.focus();
        }
    });
}

if (chatClose && chatWindow && chatToggle) {
    chatClose.addEventListener("click", () => {
        chatWindow.hidden = true;
        chatToggle.hidden = false;
    });
}

// ==========================================
// CHATBOT SUBMIT HANDLER FIX
// Prevents page reload when sending a message
// ==========================================

document.addEventListener("submit", function (event) {
    if (!event.target || event.target.id !== "chatForm") {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const input = document.getElementById("chatInput");

    if (!input) {
        console.error("Chat input was not found.");
        return;
    }

    const message = input.value.trim();

    if (!message) {
        return;
    }

    addChatMessage(message, "user");
    addChatMessage(getChatbotAnswer(message), "bot");

    input.value = "";
    input.focus();
}, true);

// ==========================================
// APPLICATION STARTUP
// ==========================================

console.log("CarePoint Hospital Management System loaded.");
console.log("Smart Hospital Assistant is ready.");