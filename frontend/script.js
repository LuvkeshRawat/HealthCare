const themeBtn = document.getElementById("themeBtn");
const learnBtn = document.getElementById("learnBtn");
const chatBtn = document.getElementById("chatBtn");
const chatBox = document.getElementById("chatBox");
const closeChat = document.getElementById("closeChat");
const sendBtn = document.getElementById("sendBtn");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const nav = document.querySelector(".navbar");
const revealItems = document.querySelectorAll(".card, .box");
const counters = document.querySelectorAll(".box h2");
const heroParagraph = document.querySelector(".hero .left p");

let assistantContext = {
    doctors: [],
    notices: []
};

if(themeBtn){
    themeBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark");

        if(document.body.classList.contains("dark")){
            localStorage.setItem("theme","dark");
            themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            localStorage.setItem("theme","light");
            themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    });
}

window.onload = async () => {
    if(localStorage.getItem("theme") === "dark"){
        document.body.classList.add("dark");
        if(themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    loadScrollReveal();
    await loadAssistantContext();
};

if(nav){
    const clock = document.createElement("div");
    clock.id = "clock";
    clock.style.fontWeight = "bold";
    clock.style.marginLeft = "20px";
    nav.appendChild(clock);

    setInterval(() => {
        const now = new Date();
        clock.innerHTML = now.toLocaleTimeString();
    },1000);
}

if(learnBtn){
    learnBtn.addEventListener("click", () => {
        document.getElementById("services")?.scrollIntoView({
            behavior: "smooth"
        });
    });
}

document.querySelectorAll("a[href^='#']").forEach((anchor) => {
    anchor.addEventListener("click", function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if(target){
            target.scrollIntoView({
                behavior: "smooth"
            });
        }
    });
});

counters.forEach((counter) => {
    const target = parseInt(counter.innerText, 10);
    if(Number.isNaN(target)) return;

    let count = 0;
    const speed = Math.max(1, Math.ceil(target / 40));

    const update = () => {
        count += speed;
        if(count < target){
            counter.innerText = `${count}+`;
            requestAnimationFrame(update);
        } else {
            counter.innerText = `${target}+`;
        }
    };

    update();
});

const rotatingText = [
    "Appointments, patient records, doctor scheduling, and care management in one place.",
    "Connect patients with available doctors quickly and clearly.",
    "Track reports, prescriptions, and hospital operations from a single platform.",
    "Get guided support through the health assistant any time."
];

let rotatingIndex = 0;

if(heroParagraph){
    setInterval(() => {
        heroParagraph.textContent = rotatingText[rotatingIndex];
        rotatingIndex = (rotatingIndex + 1) % rotatingText.length;
    }, 3000);
}

function loadScrollReveal(){
    revealItems.forEach((item) => {
        item.style.opacity = "0";
        item.style.transform = "translateY(20px)";
    });
}

window.addEventListener("scroll", () => {
    revealItems.forEach((item) => {
        const top = item.getBoundingClientRect().top;
        if(top < window.innerHeight - 80){
            item.style.opacity = "1";
            item.style.transform = "translateY(0)";
        }
    });
});

if(chatBtn){
    chatBtn.onclick = () => {
        chatBox.style.display = chatBox.style.display === "block" ? "none" : "block";
        chatInput?.focus();
    };
}

if(closeChat){
    closeChat.onclick = () => {
        chatBox.style.display = "none";
    };
}

if(sendBtn){
    sendBtn.onclick = sendMessage;
}

if(chatInput){
    chatInput.addEventListener("keypress", (event) => {
        if(event.key === "Enter"){
            event.preventDefault();
            sendMessage();
        }
    });
}

async function loadAssistantContext(){
    try {
        const [doctorsRes, noticesRes] = await Promise.all([
            fetch("/doctors"),
            fetch("/notices")
        ]);

        const doctors = await doctorsRes.json();
        const notices = await noticesRes.json();

        assistantContext = { doctors, notices };
    } catch (error) {
        assistantContext = { doctors: [], notices: [] };
    }
}

function sendMessage(){
    const msg = chatInput.value.trim();
    if(msg === "") return;

    appendChatMessage("user-msg", msg);
    const reply = getAssistantReply(msg);

    setTimeout(() => {
        appendChatMessage("bot-msg", reply);
    }, 300);

    chatInput.value = "";
}

function appendChatMessage(className, text){
    if(!chatMessages) return;

    chatMessages.innerHTML += `<div class="${className}">${text}</div>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getAssistantReply(message){
    const msg = message.toLowerCase();
    const doctorNames = assistantContext.doctors.map((doctor) => doctor.name);
    const availableDoctors = assistantContext.doctors
        .filter((doctor) => doctor.status === "Available")
        .map((doctor) => `${doctor.name} (${doctor.specialty})`);
    const latestNotice = assistantContext.notices[0]?.message;
    const matchedDoctor = assistantContext.doctors.find((doctor) => {
        const normalizedName = String(doctor.name || "").toLowerCase();
        return normalizedName && msg.includes(normalizedName);
    });

    if(msg.includes("hello") || msg.includes("hi")){
        return "Hello! I can help with appointments, doctors, notices, login routes, and patient guidance.";
    }

    if(msg.includes("appointment") || msg.includes("book")){
        return availableDoctors.length
            ? `You can log in as a patient and book with ${availableDoctors.slice(0, 3).join(", ")}.`
            : "You can log in as a patient and use the Book Appointment section to connect with a doctor.";
    }

    if(matchedDoctor){
        return `${matchedDoctor.name} is assigned to the ${matchedDoctor.specialty} department and is currently ${matchedDoctor.status}. Patients should book ${matchedDoctor.specialty} appointments with this doctor.`;
    }

    if(msg.includes("doctor") || msg.includes("specialist")){
        return doctorNames.length
            ? `Current doctors in the system are ${doctorNames.join(", ")}. Ask for a doctor by name to get that doctor's department and availability.`
            : "Doctor details are not available right now. Please try again after the server loads.";
    }

    if(msg.includes("patient")){
        return "The patient dashboard now shows your own appointments, prescriptions, doctor list, and notices after you log in and book an appointment.";
    }

    if(msg.includes("admin")){
        return "The admin section can add doctors, send notices, manage users, and generate reports from live project data.";
    }

    if(msg.includes("notice") || msg.includes("alert") || msg.includes("notification")){
        return latestNotice
            ? `Latest notice: ${latestNotice}`
            : "There are no broadcast notices right now.";
    }

    if(msg.includes("login") || msg.includes("sign in")){
        return "Use the login page and choose your role. Patient login is patient / 123, admin login is admin / 123, and each doctor has their own username with password 123 shown on the login page.";
    }

    if(msg.includes("emergency")){
        return "For urgent emergencies, contact local emergency services immediately and do not wait for the web dashboard.";
    }

    return "I can help with doctors, appointments, login, reports, or notices. Try asking about available doctors or how to book an appointment.";
}
