const currentDoctorName = localStorage.getItem("currentDoctorName")
    || localStorage.getItem("currentUsername")
    || "Dr. Sharma";
const currentDoctorDepartment = localStorage.getItem("currentDoctorDepartment") || "";
const themeBtn = document.getElementById("themeBtn");
const statusToggle = document.getElementById("statusToggle");
const statusText = document.getElementById("statusText");
const saveBtn = document.querySelector(".saveBtn");
const heading = document.querySelector(".topbar h1");
const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".section");
const appointmentTable = document.getElementById("appointmentTable");
const allAppointmentsTable = document.getElementById("allAppointmentsTable");
const patientSelect = document.getElementById("patientSelect");
const notesInput = document.getElementById("prescriptionNotes");
const prescriptionStatus = document.getElementById("prescriptionStatus");
const doctorSignature = document.getElementById("doctorSignature");
const doctorProfileName = document.getElementById("doctorProfileName");
const patientQueueList = document.getElementById("patientQueueList");
const patientDirectory = document.getElementById("patientDirectory");
const savedPrescriptionsList = document.getElementById("savedPrescriptionsList");
const doctorAlertsList = document.getElementById("doctorAlertsList");
const doctorNoticesList = document.getElementById("doctorNoticesList");

let doctorAppointments = [];
let doctorPrescriptions = [];

doctorSignature.innerText = currentDoctorName;
doctorProfileName.innerText = currentDoctorName;

window.addEventListener("load", async () => {
    if(localStorage.getItem("doctorTheme") === "dark"){
        document.body.classList.add("dark");
        themeBtn.innerHTML = "&#9728;";
    }

    const savedStatus = localStorage.getItem("doctorStatus");

    if(savedStatus === "offline"){
        statusToggle.checked = false;
        statusText.innerText = "Offline";
    }

    setGreeting();
    revealPanels();
    bindNavigation();
    await loadDoctorWorkspace();
});

themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if(document.body.classList.contains("dark")){
        localStorage.setItem("doctorTheme","dark");
        themeBtn.innerHTML = "&#9728;";
    }else{
        localStorage.setItem("doctorTheme","light");
        themeBtn.innerHTML = "&#9790;";
    }
});

statusToggle.addEventListener("change", () => {
    if(statusToggle.checked){
        statusText.innerText = "Online";
        localStorage.setItem("doctorStatus","online");
    }else{
        statusText.innerText = "Offline";
        localStorage.setItem("doctorStatus","offline");
    }
});

saveBtn.addEventListener("click", async () => {
    const patientName = patientSelect.value;
    const notes = notesInput.value.trim();

    if(!patientName){
        updatePrescriptionStatus("Please select a patient first.");
        return;
    }

    if(!notes){
        updatePrescriptionStatus("Please write prescription notes before saving.");
        return;
    }

    saveBtn.innerText = "Saving...";
    saveBtn.disabled = true;
    updatePrescriptionStatus("");

    try {
        const res = await fetch("/prescriptions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                patientName,
                doctorName: currentDoctorName,
                notes
            })
        });

        const data = await res.json();

        if(!res.ok){
            updatePrescriptionStatus(data.message || "Unable to save prescription notes.");
            return;
        }

        notesInput.value = "";
        patientSelect.value = "";
        updatePrescriptionStatus(data.message, true);
        await loadPrescriptions();
        renderDashboardSummary();
    } catch (error) {
        updatePrescriptionStatus("Server error while saving prescription notes.");
    } finally {
        saveBtn.innerText = "Save Notes";
        saveBtn.disabled = false;
    }
});

function bindNavigation(){
    navItems.forEach((item) => {
        item.addEventListener("click", () => showSection(item.dataset.section));
    });
}

function showSection(sectionId){
    sections.forEach((section) => section.classList.remove("active"));
    navItems.forEach((item) => item.classList.remove("active"));

    const nextSection = document.getElementById(sectionId);
    const nextNav = document.querySelector(`.nav-item[data-section="${sectionId}"]`);

    if(nextSection) nextSection.classList.add("active");
    if(nextNav) nextNav.classList.add("active");
}

async function loadDoctorWorkspace(){
    await Promise.all([
        loadAppointments(),
        loadPrescriptions(),
        loadNotices()
    ]);

    renderDashboardSummary();
}

async function loadAppointments(){
    try {
        const res = await fetch("/appointments");
        const data = await res.json();

        doctorAppointments = data.filter((app) => {
            const isDoctorMatch = app.doctor === currentDoctorName;
            const isDepartmentMatch = !currentDoctorDepartment || app.department === currentDoctorDepartment;
            return isDoctorMatch && isDepartmentMatch;
        });
        renderAppointments();
        populatePatientSelect();
        renderPatients();
    } catch (error) {
        appointmentTable.innerHTML = '<tr><td colspan="5" style="text-align:center; color:gray;">Unable to load appointments</td></tr>';
        allAppointmentsTable.innerHTML = '<tr><td colspan="4" style="text-align:center; color:gray;">Unable to load appointments</td></tr>';
    }
}

async function loadPrescriptions(){
    try {
        const res = await fetch("/prescriptions");
        const data = await res.json();

        doctorPrescriptions = data.filter((item) => item.doctorName === currentDoctorName);
        renderPrescriptions();
    } catch (error) {
        savedPrescriptionsList.innerHTML = '<div class="queue">Unable to load prescriptions</div>';
    }
}

async function loadNotices(){
    try {
        const res = await fetch("/notices?role=doctor");
        const data = await res.json();
        renderNotices(data);
    } catch (error) {
        doctorAlertsList.innerHTML = '<div class="alert">Unable to load alerts</div>';
        doctorNoticesList.innerHTML = '<div class="alert">Unable to load notices</div>';
    }
}

function renderAppointments(){
    appointmentTable.innerHTML = "";
    allAppointmentsTable.innerHTML = "";

    if(!doctorAppointments.length){
        appointmentTable.innerHTML = `<tr><td colspan="5" style="text-align:center; color:gray;">No appointments yet for ${currentDoctorName}</td></tr>`;
        allAppointmentsTable.innerHTML = '<tr><td colspan="4" style="text-align:center; color:gray;">No appointments available</td></tr>';
        patientQueueList.innerHTML = '<div class="queue">No patients are currently in queue</div>';
        return;
    }

    doctorAppointments.forEach((app, index) => {
        const row = `
            <tr>
                <td>${app.name}</td>
                <td>${app.doctor}</td>
                <td>${app.date}</td>
                <td>${app.department}</td>
                <td style="color:${index === 0 ? "#16a34a" : "orange"};">${index === 0 ? "Next" : "Pending"}</td>
            </tr>
        `;

        appointmentTable.innerHTML += row;
        allAppointmentsTable.innerHTML += `
            <tr>
                <td>${app.name}</td>
                <td>${app.date}</td>
                <td>${app.department}</td>
                <td style="color:${index < 2 ? "#16a34a" : "orange"};">${index < 2 ? "Ready" : "Waiting"}</td>
            </tr>
        `;
    });

    patientQueueList.innerHTML = doctorAppointments.slice(0, 4).map((app, index) => `
        <div class="queue">
            <strong>${index + 1}. ${app.name}</strong><br>
            ${app.department} consultation
        </div>
    `).join("");
}

function populatePatientSelect(){
    const uniquePatients = [...new Set(doctorAppointments.map((app) => app.name).filter(Boolean))];
    patientSelect.innerHTML = '<option value="">Choose patient</option>';

    uniquePatients.forEach((name) => {
        patientSelect.innerHTML += `<option value="${name}">${name}</option>`;
    });
}

function renderPatients(){
    const groupedPatients = [...new Map(doctorAppointments.map((app) => [app.name, app])).values()];

    if(!groupedPatients.length){
        patientDirectory.innerHTML = '<div class="queue">No patients assigned yet</div>';
        return;
    }

    patientDirectory.innerHTML = groupedPatients.map((patient) => `
        <div class="queue">
            <strong>${patient.name}</strong><br>
            ${patient.department} | Appointment on ${patient.date}
        </div>
    `).join("");
}

function renderPrescriptions(){
    if(!doctorPrescriptions.length){
        savedPrescriptionsList.innerHTML = '<div class="queue">No prescriptions saved yet</div>';
        return;
    }

    savedPrescriptionsList.innerHTML = doctorPrescriptions.map((item) => `
        <div class="queue">
            <strong>${item.patientName}</strong><br>
            ${item.notes}<br>
            <span class="item-meta">${formatDate(item.createdAt)}</span>
        </div>
    `).join("");
}

function renderNotices(notices){
    if(!notices.length){
        doctorAlertsList.innerHTML = '<div class="alert">No alerts right now</div>';
        doctorNoticesList.innerHTML = '<div class="alert">No notices right now</div>';
        return;
    }

    doctorAlertsList.innerHTML = notices.slice(0, 3).map((item) => `
        <div class="alert">${item.message}</div>
    `).join("");

    doctorNoticesList.innerHTML = notices.map((item) => `
        <div class="alert">
            ${item.message}<br>
            <span class="item-meta">${formatDate(item.createdAt)}</span>
        </div>
    `).join("");
}

function renderDashboardSummary(){
    document.getElementById("todayPatientsCount").innerText = doctorAppointments.length;
    document.getElementById("pendingReviewsCount").innerText = doctorAppointments.length;
    document.getElementById("completedCasesCount").innerText = doctorPrescriptions.length;
    animateNumbers();
}

function updatePrescriptionStatus(message, isSuccess = false){
    prescriptionStatus.innerText = message;
    prescriptionStatus.className = isSuccess ? "prescription-status success" : "prescription-status";
}

function setGreeting(){
    const hour = new Date().getHours();
    const doctorLabel = currentDoctorName || "Doctor";

    if(hour < 12){
        heading.innerText = `Good Morning, ${doctorLabel}`;
    }
    else if(hour < 18){
        heading.innerText = `Good Afternoon, ${doctorLabel}`;
    }
    else{
        heading.innerText = `Good Evening, ${doctorLabel}`;
    }
}

function animateNumbers(){
    const nums = document.querySelectorAll(".mini-card h2");

    nums.forEach((num) => {
        const target = parseInt(num.innerText, 10) || 0;
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

function revealPanels(){
    const items = document.querySelectorAll(".mini-card, .online-card, .panel");

    items.forEach((item,index) => {
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

setInterval(loadDoctorWorkspace, 10000);
