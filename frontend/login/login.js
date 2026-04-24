const loginForm = document.getElementById("loginForm");
const roleInput = document.getElementById("role");
const roleChips = document.querySelectorAll(".role-chip");
const passwordInput = document.getElementById("password");
const togglePasswordBtn = document.getElementById("togglePassword");
const statusMessage = document.getElementById("statusMessage");
const submitBtn = document.getElementById("submitBtn");
const doctorCredentialsList = document.getElementById("doctorCredentialsList");

window.addEventListener("load", loadDoctorCredentials);

roleChips.forEach((chip) => {
    chip.addEventListener("click", () => {
        roleChips.forEach((item) => item.classList.remove("active"));
        chip.classList.add("active");
        roleInput.value = chip.dataset.role;
        statusMessage.textContent = "";
        statusMessage.className = "status-message";
    });
});

togglePasswordBtn.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    togglePasswordBtn.innerHTML = isPassword
        ? '<i class="fa-solid fa-eye-slash"></i>'
        : '<i class="fa-solid fa-eye"></i>';
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = passwordInput.value.trim();
    const role = roleInput.value;

    if (!username || !password) {
        statusMessage.textContent = "Please enter both username and password.";
        statusMessage.className = "status-message";
        return;
    }

    submitBtn.disabled = true;
    submitBtn.querySelector("span").textContent = "Signing in...";
    statusMessage.textContent = "";
    statusMessage.className = "status-message";

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password, role })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem("currentRole", role);
            localStorage.setItem("currentUsername", username);

            if (role === "doctor" && data.doctor) {
                localStorage.setItem("currentDoctorName", data.doctor.name || "");
                localStorage.setItem("currentDoctorDepartment", data.doctor.specialty || "");
            }

            if (role === "patient") {
                localStorage.removeItem("currentDoctorName");
                localStorage.removeItem("currentDoctorDepartment");
            }

            statusMessage.textContent = "Login successful. Redirecting to your dashboard...";
            statusMessage.className = "status-message success";

            setTimeout(() => {
                if (role === "patient") window.location.href = "/patient";
                if (role === "doctor") window.location.href = "/doctor";
                if (role === "admin") window.location.href = "/admin";
            }, 500);
        } else {
            statusMessage.textContent = "Invalid credentials. Try the demo details shown on the left.";
            statusMessage.className = "status-message";
        }
    } catch (error) {
        statusMessage.textContent = "The server is not responding right now. Please try again.";
        statusMessage.className = "status-message";
    } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector("span").textContent = "Login to Dashboard";
    }
});

async function loadDoctorCredentials() {
    if (!doctorCredentialsList) return;

    try {
        const response = await fetch("/doctors");
        const doctors = await response.json();

        if (!Array.isArray(doctors) || !doctors.length) {
            doctorCredentialsList.innerHTML = "<span>No doctor accounts available yet</span>";
            return;
        }

        doctorCredentialsList.innerHTML = doctors
            .map((doctor) => `<span>${doctor.username} / 123 (${doctor.name})</span>`)
            .join("");
    } catch (error) {
        doctorCredentialsList.innerHTML = "<span>Doctor logins unavailable right now</span>";
    }
}
