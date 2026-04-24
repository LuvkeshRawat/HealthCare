const themeBtn = document.getElementById("themeBtn");
const heading = document.querySelector(".topbar h1");
const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".section");
const doctorForm = document.getElementById("doctorForm");
const noticeForm = document.getElementById("noticeForm");
const generateReportBtn = document.getElementById("generateReportBtn");
const actionStatus = document.getElementById("actionStatus");

let reportCache = null;

window.addEventListener("load", async () => {
    if(localStorage.getItem("adminTheme") === "dark"){
        document.body.classList.add("dark");
        themeBtn.innerHTML = "&#9728;";
    }

    setGreeting();
    revealItems();
    bindNavigation();
    bindActions();
    await loadAdminWorkspace();
});

themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if(document.body.classList.contains("dark")){
        localStorage.setItem("adminTheme","dark");
        themeBtn.innerHTML = "&#9728;";
    }else{
        localStorage.setItem("adminTheme","light");
        themeBtn.innerHTML = "&#9790;";
    }
});

function bindNavigation(){
    navItems.forEach((item) => {
        item.addEventListener("click", () => showSection(item.dataset.section));
    });
}

function bindActions(){
    doctorForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {
            name: document.getElementById("doctorName").value.trim(),
            specialty: document.getElementById("doctorSpecialty").value.trim(),
            status: document.getElementById("doctorStatus").value
        };

        if(!payload.name || !payload.specialty){
            updateActionStatus("Please enter doctor name and specialty.");
            return;
        }

        updateActionStatus("Adding doctor...");

        try {
            const res = await fetch("/doctors", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if(!res.ok){
                updateActionStatus(data.message || "Unable to add doctor.");
                return;
            }

            doctorForm.reset();
            updateActionStatus(data.message, true);
            await loadAdminWorkspace();
        } catch (error) {
            updateActionStatus("Server error while adding doctor.");
        }
    });

    noticeForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const message = document.getElementById("noticeMessage").value.trim();
        const targetRole = document.getElementById("noticeRole").value;

        if(!message){
            updateActionStatus("Please write a notice first.");
            return;
        }

        updateActionStatus("Sending notice...");

        try {
            const res = await fetch("/notices", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message, targetRole })
            });

            const data = await res.json();

            if(!res.ok){
                updateActionStatus(data.message || "Unable to send notice.");
                return;
            }

            noticeForm.reset();
            updateActionStatus(data.message, true);
            await loadAdminWorkspace();
        } catch (error) {
            updateActionStatus("Server error while sending notice.");
        }
    });

    generateReportBtn.addEventListener("click", async () => {
        generateReportBtn.innerText = "Generating...";
        updateActionStatus("");

        await loadReports();

        generateReportBtn.innerText = "Generate Report";
        updateActionStatus("Latest report generated successfully.", true);
        showSection("reportsSection");
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

async function loadAdminWorkspace(){
    await Promise.all([
        loadStats(),
        loadUsers(),
        loadDoctors(),
        loadAppointments(),
        loadReports()
    ]);
}

async function loadStats(){
    try {
        const res = await fetch("/admin-stats");
        const data = await res.json();

        document.getElementById("totalPatients").innerText = data.totalPatients || 0;
        document.getElementById("totalDoctors").innerText = data.totalDoctors || 0;
        document.getElementById("totalAppointments").innerText = data.totalAppointments || 0;
        document.getElementById("totalPrescriptions").innerText = data.totalPrescriptions || 0;
        animateNumbers();
    } catch (error) {
        console.log("Error loading admin stats:", error);
    }
}

async function loadUsers(){
    try {
        const [appointmentsRes, doctorsRes] = await Promise.all([
            fetch("/appointments"),
            fetch("/doctors")
        ]);

        const appointments = await appointmentsRes.json();
        const doctors = await doctorsRes.json();

        const uniquePatients = [...new Set(appointments.map((item) => item.name).filter(Boolean))];
        const userTable = document.getElementById("userTable");
        const usersList = document.getElementById("usersList");

        userTable.innerHTML = "";

        const rows = [
            ...uniquePatients.map((name) => ({ name, role: "Patient", status: "Active" })),
            ...doctors.map((doctor) => ({ name: doctor.name, role: "Doctor", status: doctor.status || "Available" }))
        ];

        if(!rows.length){
            userTable.innerHTML = '<tr><td colspan="3" style="text-align:center; color:gray;">No users available</td></tr>';
            usersList.innerHTML = '<div class="activity">No users available</div>';
            return;
        }

        rows.forEach((user) => {
            userTable.innerHTML += `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.role}</td>
                    <td style="color:${user.status === "Active" || user.status === "Available" ? "green" : "orange"};">${user.status}</td>
                </tr>
            `;
        });

        usersList.innerHTML = rows.map((user) => `
            <div class="activity">
                <strong>${user.name}</strong><br>
                ${user.role} | ${user.status}
            </div>
        `).join("");
    } catch (error) {
        console.log("Error loading users:", error);
    }
}

async function loadDoctors(){
    try {
        const res = await fetch("/doctors");
        const doctors = await res.json();
        const doctorDirectory = document.getElementById("doctorDirectory");

        if(!doctors.length){
            doctorDirectory.innerHTML = '<div class="activity">No doctors available</div>';
            return;
        }

        doctorDirectory.innerHTML = doctors.map((doctor) => `
            <div class="activity">
                <strong>${doctor.name}</strong><br>
                ${doctor.specialty} | ${doctor.status}<br>
                Login: ${doctor.username || "Not set"}
            </div>
        `).join("");
    } catch (error) {
        console.log("Error loading doctors:", error);
    }
}

async function loadAppointments(){
    try {
        const res = await fetch("/appointments");
        const appointments = await res.json();
        const appointmentsTable = document.getElementById("appointmentsTable");

        appointmentsTable.innerHTML = "";

        if(!appointments.length){
            appointmentsTable.innerHTML = '<tr><td colspan="4" style="text-align:center; color:gray;">No appointments available</td></tr>';
            return;
        }

        appointments.forEach((item) => {
            appointmentsTable.innerHTML += `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.doctor}</td>
                    <td>${item.date}</td>
                    <td>${item.department}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.log("Error loading appointments:", error);
    }
}

async function loadReports(){
    try {
        const res = await fetch("/admin-reports");
        reportCache = await res.json();
        renderReports();
    } catch (error) {
        console.log("Error loading reports:", error);
    }
}

function renderReports(){
    if(!reportCache){
        return;
    }

    const departmentReport = document.getElementById("departmentReport");
    const doctorReport = document.getElementById("doctorReport");
    const reportSummary = document.getElementById("reportSummary");
    const activityList = document.getElementById("activityList");

    const departments = Object.entries(reportCache.departmentSummary || {});
    const doctorLoad = Object.entries(reportCache.doctorSummary || {});

    departmentReport.innerHTML = departments.length
        ? departments.map(([name, count]) => `<div class="activity"><strong>${name}</strong><br>${count} appointments</div>`).join("")
        : '<div class="activity">No department report data yet</div>';

    doctorReport.innerHTML = doctorLoad.length
        ? doctorLoad.map(([name, count]) => `<div class="activity"><strong>${name}</strong><br>${count} appointments assigned</div>`).join("")
        : '<div class="activity">No doctor workload data yet</div>';

    reportSummary.innerHTML = `
        <div class="activity"><strong>Revenue Estimate</strong><br>Rs. ${reportCache.totalRevenue || 0}</div>
        <div class="activity"><strong>Prescriptions Saved</strong><br>${reportCache.totalPrescriptions || 0}</div>
        <div class="activity"><strong>Departments Covered</strong><br>${departments.length}</div>
    `;

    activityList.innerHTML = (reportCache.activity || []).length
        ? reportCache.activity.map((item) => `
            <div class="activity">
                ${item.text}<br>
                <span class="item-meta">${formatDate(item.createdAt)}</span>
            </div>
        `).join("")
        : '<div class="activity">No recent activity</div>';
}

function updateActionStatus(message, isSuccess = false){
    actionStatus.innerText = message;
    actionStatus.className = isSuccess ? "action-status success" : "action-status";
}

function setGreeting(){
    const hour = new Date().getHours();

    if(hour < 12){
        heading.innerText = "Good Morning, Admin";
    }
    else if(hour < 18){
        heading.innerText = "Good Afternoon, Admin";
    }
    else{
        heading.innerText = "Good Evening, Admin";
    }
}

function animateNumbers(){
    const nums = document.querySelectorAll(".card h2");

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

function revealItems(){
    const items = document.querySelectorAll(".card, .panel");

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
