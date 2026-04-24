const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 3000;

/* ===============================
   MIDDLEWARE
=============================== */

app.use(cors());
app.use(express.json());

/* ===============================
   DATABASE (MongoDB Atlas)
=============================== */

mongoose.connect("mongodb+srv://luvkeshrawat14_db_user:vgSef6LuvKna6J9a@cluster0.dzgttfi.mongodb.net/healthcareDB?retryWrites=true&w=majority")
.then(async () => {
    console.log("MongoDB Atlas Connected");
    await seedDoctors();
})
.catch(err => console.log("DB Error:", err));

/* ===============================
   SCHEMA
=============================== */

const appointmentSchema = new mongoose.Schema({
    name: String,
    doctor: String,
    date: String,
    department: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

const prescriptionSchema = new mongoose.Schema({
    patientName: String,
    doctorName: String,
    notes: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Prescription = mongoose.model("Prescription", prescriptionSchema);

const doctorSchema = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    specialty: String,
    status: {
        type: String,
        default: "Available"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Doctor = mongoose.model("Doctor", doctorSchema);

const noticeSchema = new mongoose.Schema({
    message: String,
    targetRole: {
        type: String,
        default: "all"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Notice = mongoose.model("Notice", noticeSchema);

/* ===============================
   LOGIN USERS
=============================== */

const users = {
    patient: { username: "patient", password: "123" },
    admin: { username: "admin", password: "123" }
};

const defaultDoctors = [
    { name: "Dr. Sharma", username: "drsharma", password: "123", specialty: "Dental", status: "Available" },
    { name: "Dr. Khan", username: "drkhan", password: "123", specialty: "Cardiology", status: "Available" },
    { name: "Dr. Mehta", username: "drmehta", password: "123", specialty: "Neurology", status: "On Leave" }
];

async function seedDoctors() {
    try {
        for (const doctor of defaultDoctors) {
            await Doctor.updateOne(
                { name: doctor.name },
                {
                    $setOnInsert: {
                        name: doctor.name,
                        status: doctor.status,
                        createdAt: new Date()
                    },
                    $set: {
                        username: doctor.username,
                        password: doctor.password,
                        specialty: doctor.specialty
                    }
                },
                { upsert: true }
            );
        }
    } catch (error) {
        console.log("Doctor seed error:", error);
    }
}

function slugifyDoctorUsername(name = "") {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function buildUniqueDoctorUsername(name) {
    const base = slugifyDoctorUsername(name) || "doctor";
    let username = base;
    let counter = 1;

    while (await Doctor.exists({ username })) {
        counter += 1;
        username = `${base}${counter}`;
    }

    return username;
}

function sanitizeDoctor(doctorDoc) {
    const doctor = doctorDoc.toObject ? doctorDoc.toObject() : doctorDoc;
    delete doctor.password;
    return doctor;
}

/* ===============================
   API ROUTES
=============================== */

// LOGIN
app.post("/login", (req, res) => {

    const { username, password, role } = req.body;

    if (role === "doctor") {
        return Doctor.findOne({ username, password })
            .then((doctor) => {
                if (!doctor) {
                    return res.json({ success: false });
                }

                res.json({
                    success: true,
                    doctor: sanitizeDoctor(doctor)
                });
            })
            .catch(() => {
                res.status(500).json({ success: false, message: "Server error" });
            });
    }

    if(users[role] &&
       users[role].username === username &&
       users[role].password === password){

        res.json({ success: true });

    } else {
        res.json({ success: false });
    }

});

// BOOK APPOINTMENT
app.post("/book-appointment", async (req, res) => {

    try {
        const { name, doctor, date, department } = req.body;

        if (!name || !doctor || !date || !department) {
            return res.status(400).json({ message: "Patient, doctor, date and department are required." });
        }

        const assignedDoctor = await Doctor.findOne({ name: doctor });

        if (!assignedDoctor) {
            return res.status(400).json({ message: "Selected doctor was not found." });
        }

        if ((assignedDoctor.specialty || "").toLowerCase() !== String(department).toLowerCase()) {
            return res.status(400).json({
                message: `${assignedDoctor.name} only handles ${assignedDoctor.specialty}. Please choose the correct department.`
            });
        }

        const newAppointment = new Appointment({
            name,
            doctor,
            date,
            department: assignedDoctor.specialty
        });
        await newAppointment.save();

        res.json({ message: "Appointment booked successfully!" });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }

});

// GET APPOINTMENTS
app.get("/appointments", async (req, res) => {

    const data = await Appointment.find().sort({ createdAt: -1 });
    res.json(data);

});

// SAVE PRESCRIPTION
app.post("/prescriptions", async (req, res) => {

    try {
        const { patientName, doctorName, notes } = req.body;

        if (!patientName || !doctorName || !notes) {
            return res.status(400).json({ message: "Patient, doctor and notes are required." });
        }

        const newPrescription = new Prescription({
            patientName,
            doctorName,
            notes
        });

        await newPrescription.save();

        res.json({ message: "Prescription notes saved successfully!" });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }

});

// GET PRESCRIPTIONS
app.get("/prescriptions", async (req, res) => {

    try {
        const data = await Prescription.find().sort({ createdAt: -1 });
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Error fetching prescriptions" });
    }

});

// DOCTORS
app.get("/doctors", async (req, res) => {

    try {
        const data = await Doctor.find().sort({ createdAt: -1 });
        res.json(data.map(sanitizeDoctor));
    } catch (error) {
        res.status(500).json({ message: "Error fetching doctors" });
    }

});

app.post("/doctors", async (req, res) => {

    try {
        const { name, specialty, status } = req.body;

        if (!name || !specialty) {
            return res.status(400).json({ message: "Doctor name and specialty are required." });
        }

        const exists = await Doctor.findOne({ name });

        if (exists) {
            return res.status(400).json({ message: "Doctor already exists." });
        }

        const username = await buildUniqueDoctorUsername(name);
        const password = "123";

        const newDoctor = new Doctor({
            name,
            username,
            password,
            specialty,
            status: status || "Available"
        });

        await newDoctor.save();

        res.json({
            message: `Doctor added successfully. Login: ${username} / ${password}`,
            doctor: sanitizeDoctor(newDoctor)
        });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }

});

// NOTICES
app.get("/notices", async (req, res) => {

    try {
        const { role } = req.query;
        const filter = role ? { $or: [{ targetRole: role }, { targetRole: "all" }] } : {};
        const data = await Notice.find(filter).sort({ createdAt: -1 });
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Error fetching notices" });
    }

});

app.post("/notices", async (req, res) => {

    try {
        const { message, targetRole } = req.body;

        if (!message) {
            return res.status(400).json({ message: "Notice message is required." });
        }

        const newNotice = new Notice({
            message,
            targetRole: targetRole || "all"
        });

        await newNotice.save();

        res.json({ message: "Notice sent successfully!" });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }

});

// ADMIN STATS
app.get("/admin-stats", async (req, res) => {

    try {

        const totalAppointments = await Appointment.countDocuments();
        const totalPatients = await Appointment.distinct("name");
        const totalDoctors = await Doctor.countDocuments();
        const totalPrescriptions = await Prescription.countDocuments();

        res.json({
            totalAppointments,
            totalPatients: totalPatients.length,
            totalDoctors,
            totalPrescriptions
        });

    } catch (error) {
        res.status(500).json({ message: "Error fetching stats" });
    }

});

// ADMIN REPORTS
app.get("/admin-reports", async (req, res) => {

    try {
        const [appointments, doctors, prescriptions, notices] = await Promise.all([
            Appointment.find(),
            Doctor.find(),
            Prescription.find(),
            Notice.find().sort({ createdAt: -1 }).limit(5)
        ]);

        const departmentSummary = appointments.reduce((acc, item) => {
            const key = item.department || "General";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const doctorSummary = appointments.reduce((acc, item) => {
            const key = item.doctor || "Unassigned";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const activity = [
            ...appointments.slice(-3).map(item => ({
                text: `Appointment booked for ${item.name} with ${item.doctor}`,
                createdAt: item.createdAt || new Date()
            })),
            ...prescriptions.slice(-3).map(item => ({
                text: `${item.doctorName} added a prescription for ${item.patientName}`,
                createdAt: item.createdAt || new Date()
            })),
            ...notices.map(item => ({
                text: `Notice sent to ${item.targetRole}: ${item.message}`,
                createdAt: item.createdAt || new Date()
            })),
            ...doctors.slice(-2).map(item => ({
                text: `${item.name} was added to the doctor directory`,
                createdAt: item.createdAt || new Date()
            }))
        ]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 8);

        res.json({
            departmentSummary,
            doctorSummary,
            totalRevenue: appointments.length * 4000,
            totalPrescriptions: prescriptions.length,
            activity
        });

    } catch (error) {
        res.status(500).json({ message: "Error fetching reports" });
    }

});

/* ===============================
   FRONTEND ROUTES
=============================== */

const frontendPath = path.join(__dirname, "..", "frontend");

app.use(express.static(frontendPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(frontendPath, "login", "login.html"));
});

app.get("/patient", (req, res) => {
    res.sendFile(path.join(frontendPath, "patient", "patient.html"));
});

app.get("/doctor", (req, res) => {
    res.sendFile(path.join(frontendPath, "doctor", "doctor.html"));
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(frontendPath, "admin", "admin.html"));
});

/* ===============================
   SERVER
=============================== */

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
