
const API = {
    all: "/students",
    get: roll => `/get_student/${encodeURIComponent(roll)}`,
    add: "/add_student",
    edit: roll => `/edit_student/${encodeURIComponent(roll)}`,
    delete: roll => `/delete_student/${encodeURIComponent(roll)}`
};

const $ = id => document.getElementById(id);

let students = {};
let formMode = "add";
let editingRoll = null;
let alertTimer = null;

const table = $("studentTable");
const studentModal = $("studentModal");
const viewModal = $("viewModal");
const studentForm = $("studentForm");

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function request(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });

    const text = await response.text();
    let data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }

    if (!response.ok) {
        let detail = data?.detail;

        if (Array.isArray(detail)) {
            detail = detail.map(item => item.msg).join(", ");
        }

        throw new Error(
            detail || `Request failed with status ${response.status}`
        );
    }

    return data;
}

function showAlert(message, type = "success") {
    const alertBox = $("alert");

    alertBox.textContent = message;
    alertBox.className = `alert ${type}`;
    alertBox.hidden = false;

    clearTimeout(alertTimer);
    alertTimer = setTimeout(() => {
        alertBox.hidden = true;
    }, 4500);
}

function showTableMessage(message) {
    table.innerHTML = `
        <tr>
            <td colspan="6" class="message-cell">${escapeHTML(message)}</td>
        </tr>
    `;
}

function getPlaced(student) {
    return student.Placed === true || student.Placed === "true";
}

function getStudentEntries() {
    return Object.entries(students).sort(
        ([rollA], [rollB]) => Number(rollA) - Number(rollB)
    );
}

function updateStats() {
    const entries = getStudentEntries();
    const count = entries.length;

    const placed = entries.filter(
        ([, student]) => getPlaced(student)
    ).length;

    const totalMarks = entries.reduce(
        (sum, [, student]) => sum + (Number(student.Marks) || 0),
        0
    );

    $("totalCount").textContent = count;
    $("placedCount").textContent = placed;
    $("averageMarks").textContent = count
        ? (totalMarks / count).toFixed(1)
        : "0.0";
}

function renderStudents() {
    const search = $("searchInput").value.trim().toLowerCase();

    const filtered = getStudentEntries().filter(([roll, student]) => {
        const searchable = [
            roll,
            student.Name,
            student.Address,
            student.Marks,
            getPlaced(student) ? "placed" : "not placed"
        ].join(" ").toLowerCase();

        return searchable.includes(search);
    });

    $("resultCount").textContent =
        `${filtered.length} of ${Object.keys(students).length} students`;

    updateStats();

    if (filtered.length === 0) {
        showTableMessage(
            search ? "No students match your search." : "No students found. Add your first student."
        );
        return;
    }

    table.innerHTML = filtered.map(([roll, student]) => {
        const name = escapeHTML(student.Name);
        const address = escapeHTML(student.Address);
        const marks = Number(student.Marks);
        const safeMarks = Number.isFinite(marks) ? marks : "—";
        const placed = getPlaced(student);

        return `
            <tr>
                <td><span class="roll-badge">${escapeHTML(roll)}</span></td>
                <td>
                    <span class="student-name">${name}</span>
                    <span class="student-subtitle">Student record</span>
                </td>
                <td>${address}</td>
                <td><strong>${safeMarks}</strong> / 100</td>
                <td>
                    <span class="status ${placed ? "yes" : "no"}">
                        ${placed ? "Placed" : "Not placed"}
                    </span>
                </td>
                <td>
                    <div class="action-group">
                        <button class="action-btn"
                                data-action="view"
                                data-roll="${escapeHTML(roll)}">View</button>
                        <button class="action-btn"
                                data-action="edit"
                                data-roll="${escapeHTML(roll)}">Edit</button>
                        <button class="action-btn delete"
                                data-action="delete"
                                data-roll="${escapeHTML(roll)}">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

async function loadStudents(showMessage = false) {
    $("refreshBtn").disabled = true;
    $("refreshBtn").textContent = "Loading...";
    showTableMessage("Loading student records...");

    try {
        const data = await request(API.all);

        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error(
                "Expected a JSON object from GET /students. Check your FastAPI route."
            );
        }

        students = data;
        renderStudents();

        if (showMessage) {
            showAlert("Student records refreshed successfully.");
        }
    } catch (error) {
        students = {};
        updateStats();
        $("resultCount").textContent = "Unable to load records";
        showTableMessage(error.message);
        showAlert(`Could not load students: ${error.message}`, "error");
    } finally {
        $("refreshBtn").disabled = false;
        $("refreshBtn").textContent = "↻ Refresh";
    }
}

function openAddModal() {
    formMode = "add";
    editingRoll = null;

    studentForm.reset();
    $("modalTitle").textContent = "Add Student";
    $("saveBtn").textContent = "Save Student";
    $("roll").readOnly = false;
    $("formError").hidden = true;

    studentModal.hidden = false;
    $("roll").focus();
}

async function openEditModal(roll) {
    try {
        const student = await request(API.get(roll));

        formMode = "edit";
        editingRoll = String(roll);

        $("modalTitle").textContent = "Edit Student";
        $("saveBtn").textContent = "Update Student";
        $("roll").value = roll;
        $("roll").readOnly = true;
        $("name").value = student.Name ?? "";
        $("marks").value = student.Marks ?? "";
        $("address").value = student.Address ?? "";
        $("placed").checked = getPlaced(student);
        $("formError").hidden = true;

        studentModal.hidden = false;
        $("name").focus();
    } catch (error) {
        showAlert(`Could not open student: ${error.message}`, "error");
    }
}

async function viewStudent(roll) {
    try {
        const student = await request(API.get(roll));
        const placed = getPlaced(student);

        $("viewTitle").textContent = student.Name || "Student Information";

        $("studentDetails").innerHTML = `
            <div class="detail-item">
                <span>Roll Number</span>
                <strong>${escapeHTML(roll)}</strong>
            </div>
            <div class="detail-item">
                <span>Student Name</span>
                <strong>${escapeHTML(student.Name)}</strong>
            </div>
            <div class="detail-item">
                <span>Marks</span>
                <strong>${escapeHTML(student.Marks)} / 100</strong>
            </div>
            <div class="detail-item">
                <span>Address</span>
                <strong>${escapeHTML(student.Address)}</strong>
            </div>
            <div class="detail-item">
                <span>Placement Status</span>
                <strong>${placed ? "Placed" : "Not placed"}</strong>
            </div>
        `;

        viewModal.hidden = false;
    } catch (error) {
        showAlert(`Could not retrieve student: ${error.message}`, "error");
    }
}

async function deleteStudent(roll) {
    const student = students[String(roll)];
    const name = student?.Name || `roll number ${roll}`;

    if (!confirm(`Are you sure you want to delete ${name}?`)) {
        return;
    }

    try {
        await request(API.delete(roll), { method: "DELETE" });
        await loadStudents();
        showAlert(`Student ${name} deleted successfully.`);
    } catch (error) {
        showAlert(`Delete failed: ${error.message}`, "error");
    }
}

studentForm.addEventListener("submit", async event => {
    event.preventDefault();

    const roll = Number($("roll").value);
    const name = $("name").value.trim();
    const marks = Number($("marks").value);
    const address = $("address").value.trim();
    const placed = $("placed").checked;

    const errorBox = $("formError");
    errorBox.hidden = true;

    if (!Number.isSafeInteger(roll) || roll <= 0) {
        errorBox.textContent = "Roll number must be a positive whole number.";
        errorBox.hidden = false;
        return;
    }

    if (!name || !address) {
        errorBox.textContent = "Please enter the student name and address.";
        errorBox.hidden = false;
        return;
    }

    if (!Number.isFinite(marks) || marks < 0 || marks > 100) {
        errorBox.textContent = "Marks must be between 0 and 100.";
        errorBox.hidden = false;
        return;
    }

    if (formMode === "add" &&
        Object.prototype.hasOwnProperty.call(students, String(roll))) {
        errorBox.textContent = "That roll number already exists.";
        errorBox.hidden = false;
        return;
    }

    const payload = { roll, name, marks, address, placed };
    const saveButton = $("saveBtn");

    saveButton.disabled = true;
    saveButton.textContent = formMode === "add" ? "Saving..." : "Updating...";

    try {
        if (formMode === "add") {
            await request(API.add, {
                method: "POST",
                body: JSON.stringify(payload)
            });
        } else {
            // The URL roll is the record being edited.
            await request(API.edit(editingRoll), {
                method: "PUT",
                body: JSON.stringify(payload)
            });
        }

        studentModal.hidden = true;
        studentForm.reset();

        await loadStudents();

        showAlert(
            formMode === "add"
                ? "Student added successfully."
                : "Student updated successfully."
        );
    } catch (error) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
    } finally {
        saveButton.disabled = false;
        saveButton.textContent =
            formMode === "add" ? "Save Student" : "Update Student";
    }
});

// Table actions use event delegation.
table.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const { action, roll } = button.dataset;

    if (action === "view") {
        await viewStudent(roll);
    } else if (action === "edit") {
        await openEditModal(roll);
    } else if (action === "delete") {
        await deleteStudent(roll);
    }
});

$("addBtn").addEventListener("click", openAddModal);
$("refreshBtn").addEventListener("click", () => loadStudents(true));
$("searchInput").addEventListener("input", renderStudents);

function closeStudentModal() {
    studentModal.hidden = true;
}

function closeViewModal() {
    viewModal.hidden = true;
}

$("closeModal").addEventListener("click", closeStudentModal);
$("cancelBtn").addEventListener("click", closeStudentModal);
$("closeView").addEventListener("click", closeViewModal);
$("viewDone").addEventListener("click", closeViewModal);

document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", () => {
        studentModal.hidden = true;
        viewModal.hidden = true;
    });
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        studentModal.hidden = true;
        viewModal.hidden = true;
    }
});

// Load records when the dashboard opens.
loadStudents();
