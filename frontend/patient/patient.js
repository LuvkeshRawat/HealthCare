const themeBtn = document.getElementById("themeBtn");
const form = document.querySelector(".book-form");
const heading = document.querySelector(".topbar h1");
const prescriptionList = document.getElementById("prescriptionList");
const patientProfileName = document.getElementById("patientProfileName");
const patientNameInput = document.getElementById("patientNameInput");
const doctorSelect = document.getElementById("doctorSelect");
const departmentSelect = document.getElementById("departmentSelect");
const appointmentDate = document.getElementById("appointmentDate");
const bookingStatus = document.getElementById("bookingStatus");
const appointmentList = document.getElementById("appointmentList");
const doctorList = document.getElementById("doctorList");
const dashboardNotifications = document.getElementById("dashboardNotifications");
const allNotifications = document.getElementById("allNotifications");
const upcomingVisits = document.getElementById("upcomingVisits");

let currentPatientName = getStoredPatientName();
let doctors = [];
let patientAppointments = [];
let patientPrescriptions = [];
let patientNotices = [];

window.addEventListener("load", async () => {
    if(localStorage.getItem("patientTheme") === "dark"){
        document.body.classList.add("dark");
        if(themeBtn) themeBtn.innerHTML = "&#9728;";
    }

    syncPatientName(currentPatientName);
    runGreeting();
    revealPanels();
    animateCards();
    bindNotesInteraction();
    await loadPatientWorkspace();
});

if(themeBtn){
    themeBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark");

        if(document.body.classList.contains("dark")){
            localStorage.setItem("patientTheme", "dark");
            themeBtn.innerHTML = "&#9728;";
        }else{
            localStorage.setItem("patientTheme", "light");
            themeBtn.innerHTML = "&#9790;";
        }
    });
}

if(doctorSelect){
    doctorSelect.addEventListener("change", () => {
        const selectedDoctor = doctors.find((doctor) => doctor.name === doctorSelect.value);
        departmentSelect.value = selectedDoctor ? selectedDoctor.specialty : "";
    });
}

if(patientNameInput){
    patientNameInput.addEventListener("change", () => {
        const nextName = patientNameInput.value.trim();

        if(nextName){
            syncPatientName(nextName);
            loadPatientWorkspace();
        }
    });
}

if(form){
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const patientName = patientNameInput.value.trim();
        const doctorName = doctorSelect.value;
        const department = departmentSelect.value;
        const date = appointmentDate.value;
        const btn = form.querySelector("button");

        if(!patientName || !doctorName || !department || !date){
            updateBookingStatus("Please fill in your name, doctor, date, and department.");
            return;
        }

        btn.innerText = "Booking...";
        btn.disabled = true;
        updateBookingStatus("");

        try {
            const res = await fetch("/book-appointment", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: patientName,
                    doctor: doctorName,
                    date,
                    department
                })
            });

            const result = await res.json();

            if(!res.ok){
                updateBookingStatus(result.message || "Could not book appointment.");
                return;
            }

            syncPatientName(patientName);
            updateBookingStatus(result.message, true);
            form.reset();
            patientNameInput.value = currentPatientName;
            doctorSelect.value = "";
            departmentSelect.value = "";
            appointmentDate.value = "";

            await loadPatientWorkspace();
        } catch (error) {
            updateBookingStatus("Server error. Please try again.");
        } finally {
            btn.innerText = "Book Now";
            btn.disabled = false;
        }
    });
}

function showSection(sectionId){
    document.querySelectorAll(".section").forEach((sec) => {
        sec.classList.remove("active");
    });

    const section = document.getElementById(sectionId);
    if(section){
        section.classList.add("active");
    }

    document.querySelectorAll(".sidebar li").forEach((item) => item.classList.remove("active"));
    const activeItem = Array.from(document.querySelectorAll(".sidebar li")).find((item) => item.getAttribute("onclick")?.includes(sectionId));
    if(activeItem){
        activeItem.classList.add("active");
    }
}

async function loadPatientWorkspace(){
    await Promise.all([
        loadDoctors(),
        loadAppointments(),
        loadPrescriptions(),
        loadNotifications()
    ]);

    renderStats();
}

async function loadDoctors(){
    try {
        const res = await fetch("/doctors");
        doctors = await res.json();

        renderDoctorOptions();
        renderDoctorDirectory();
    } catch (error) {
        doctorList.innerHTML = '<div class="appointment-card">Unable to load doctors right now.</div>';
    }
}

async function loadAppointments(){
    try {
        const res = await fetch("/appointments");
        const data = await res.json();
        patientAppointments = data.filter((item) => normalize(item.name) === normalize(currentPatientName));

        renderAppointments();
        renderUpcomingVisits();
    } catch (error) {
        appointmentList.innerHTML = "<p>Unable to load appointments.</p>";
    }
}

async function loadPrescriptions(){
    if(!prescriptionList) return;

    try {
        const res = await fetch("/prescriptions");
        const data = await res.json();
        patientPrescriptions = data.filter((item) => normalize(item.patientName) === normalize(currentPatientName));

        if(!patientPrescriptions.length){
            prescriptionList.innerHTML = "<p>No prescription notes available yet.</p>";
            return;
        }

        prescriptionList.innerHTML = patientPrescriptions.map((item) => `
            <div class="prescription-card">
                <span class="prescription-doctor">${item.doctorName}</span>
                <h3>${item.patientName}</h3>
                <p>${item.notes}</p>
                <span class="prescription-date">${formatDate(item.createdAt)}</span>
            </div>
        `).join("");
    } catch (error) {
        prescriptionList.innerHTML = "<p>Unable to load prescription notes right now.</p>";
    }
}

async function loadNotifications(){
    try {
        const res = await fetch("/notices?role=patient");
        const notices = await res.json();

        patientNotices = [
            ...patientAppointments.slice(0, 2).map((item) => ({
                message: `Upcoming appointment with ${item.doctor} on ${item.date}`,
                createdAt: item.createdAt
            })),
            ...patientPrescriptions.slice(0, 2).map((item) => ({
                message: `New prescription added by ${item.doctorName}`,
                createdAt: item.createdAt
            })),
            ...notices
        ].slice(0, 6);

        renderNotifications();
    } catch (error) {
        dashboardNotifications.innerHTML = '<div class="note">Unable to load notifications.</div>';
        allNotifications.innerHTML = '<div class="note">Unable to load notifications.</div>';
    }
}

function renderDoctorOptions(){
    const previousValue = doctorSelect.value;
    const uniqueDepartments = [...new Set(doctors.map((doctor) => doctor.specialty).filter(Boolean))];

    doctorSelect.innerHTML = '<option value="">Select Doctor</option>';
    departmentSelect.innerHTML = '<option value="">Select Department</option>';

    doctors.forEach((doctor) => {
        doctorSelect.innerHTML += `<option value="${doctor.name}">${doctor.name}</option>`;
    });

    uniqueDepartments.forEach((department) => {
        departmentSelect.innerHTML += `<option value="${department}">${department}</option>`;
    });

    if(previousValue){
        doctorSelect.value = previousValue;
        const selectedDoctor = doctors.find((doctor) => doctor.name === previousValue);
        departmentSelect.value = selectedDoctor ? selectedDoctor.specialty : "";
    }
}

function renderDoctorDirectory(){
    if(!doctors.length){
        doctorList.innerHTML = '<div class="appointment-card">No doctors available right now.</div>';
        return;
    }

    doctorList.innerHTML = doctors.map((doctor) => `
        <div class="appointment-card doctor-card">
            <strong>${doctor.name}</strong><br>
            ${doctor.specialty}<br>
            <span class="doctor-status ${doctor.status === "Available" ? "available" : "busy"}">${doctor.status}</span>
        </div>
    `).join("");
}

function renderAppointments(){
    if(!patientAppointments.length){
        appointmentList.innerHTML = "<p>No appointments found for your profile yet.</p>";
        return;
    }

    appointmentList.innerHTML = patientAppointments.map((app) => `
        <div class="appointment-card">
            <strong>${app.name}</strong><br>
            Doctor: ${app.doctor}<br>
            Date: ${app.date}<br>
            Department: ${app.department}
        </div>
    `).join("");
}

function renderUpcomingVisits(){
    if(!patientAppointments.length){
        upcomingVisits.innerHTML = `
            <div class="visit">
                <strong>No upcoming visits</strong>
                <span>Book an appointment to get started</span>
            </div>
        `;
        return;
    }

    upcomingVisits.innerHTML = patientAppointments.slice(0, 3).map((app) => `
        <div class="visit">
            <strong>${app.doctor}</strong>
            <span>${app.date} | ${app.department}</span>
        </div>
    `).join("");
}

function renderNotifications(){
    if(!patientNotices.length){
        dashboardNotifications.innerHTML = '<div class="note">No notifications right now.</div>';
        allNotifications.innerHTML = '<div class="note">No notifications right now.</div>';
        bindNotesInteraction();
        return;
    }

    const notificationMarkup = patientNotices.map((item) => `
        <div class="note">
            ${item.message}
            <span class="note-meta">${formatDate(item.createdAt)}</span>
        </div>
    `).join("");

    dashboardNotifications.innerHTML = patientNotices.slice(0, 3).map((item) => `
        <div class="note">
            ${item.message}
            <span class="note-meta">${formatDate(item.createdAt)}</span>
        </div>
    `).join("");

    allNotifications.innerHTML = notificationMarkup;
    bindNotesInteraction();
}

function renderStats(){
    document.getElementById("totalAppointmentsCount").innerText = patientAppointments.length;
    document.getElementById("totalReportsCount").innerText = patientPrescriptions.length;
    document.getElementById("totalAlertsCount").innerText = patientNotices.length;
    animateCards();
}

function updateBookingStatus(message, isSuccess = false){
    bookingStatus.innerText = message;
    bookingStatus.className = isSuccess ? "booking-status success" : "booking-status";
}

function syncPatientName(name){
    currentPatientName = name || "Abhijeet";
    localStorage.setItem("patientDisplayName", currentPatientName);
    patientProfileName.innerText = currentPatientName;
    patientNameInput.value = currentPatientName;
}

function getStoredPatientName(){
    return localStorage.getItem("patientDisplayName")
        || localStorage.getItem("currentUsername")
        || "Abhijeet";
}

function normalize(value){
    return String(value || "").trim().toLowerCase();
}

function runGreeting(){
    const hour = new Date().getHours();

    if(hour < 12){
        heading.innerText = "Good Morning, Patient";
    }
    else if(hour < 18){
        heading.innerText = "Good Afternoon, Patient";
    }
    else{
        heading.innerText = "Good Evening, Patient";
    }
}

function animateCards(){
    const nums = document.querySelectorAll(".card h2");

    nums.forEach((num) => {
        const text = num.innerText.trim();

        if(Number.isNaN(parseInt(text, 10))){
            return;
        }

        const target = parseInt(text, 10);
        let count = 0;
        const speed = Math.max(1, Math.ceil(target / 20));

        const update = () => {
            count += speed;

            if(count < target){
                num.innerText = count;
                requestAnimationFrame(update);
            }else{
                num.innerText = target;
            }
        };

        update();
    });
}

function bindNotesInteraction(){
    document.querySelectorAll(".note").forEach((note) => {
        note.style.cursor = "pointer";

        note.onclick = () => {
            note.classList.toggle("done");
        };
    });
}

function revealPanels(){
    const items = document.querySelectorAll(".card, .panel");

    items.forEach((item, index) => {
        item.style.opacity = "0";
        item.style.transform = "translateY(20px)";

        setTimeout(() => {
            item.style.transition = "0.5s ease";
            item.style.opacity = "1";
            item.style.transform = "translateY(0)";
        }, index * 100);
    });
}

function formatDate(value){
    const date = new Date(value);

    if(Number.isNaN(date.getTime())){
        return "Recently updated";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

const tips = document.querySelectorAll(".tip");
let tipIndex = 0;

setInterval(() => {
    tips.forEach((tip) => {
        tip.style.background = "";
    });

    if(tips.length){
        tips[tipIndex].style.background = "#dbeafe";
        tipIndex = (tipIndex + 1) % tips.length;
    }
}, 2000);
