// Category Toggle
function toggleCategory(button) {
  const list = button.nextElementSibling;
  const arrow = button.querySelector(".category-arrow");

  // Close other categories
  document.querySelectorAll(".utilities-list.open").forEach((el) => {
    if (el !== list) {
      el.classList.remove("open");
      el.previousElementSibling.classList.remove("active");
      el.previousElementSibling
        .querySelector(".category-arrow")
        .classList.remove("open");
    }
  });

  list.classList.toggle("open");
  button.classList.toggle("active");
  arrow.classList.toggle("open");
}

// Switch Utility
async function switchUtility(utilityId, element) {
  // Hide all views
  document.querySelectorAll(".utility-view").forEach((view) => {
    view.classList.remove("active");
  });

  // Remove active from all utility items
  document.querySelectorAll(".utility-item").forEach((item) => {
    item.classList.remove("active");
  });

  // Show selected view
  document.getElementById(utilityId).classList.add("active");

  // Mark item as active - use the passed element or find it
  if (element) {
    element.classList.add("active");
  }

  // Update top bar
  const utilityNames = {
    "in-generator":
      "<i class='fas fa-database'></i> SQL IN Statement Generator",
    "code-blocks": "<i class='fas fa-code'></i> Frequently Used Code Blocks",
  };
  document.getElementById("utilityName").innerHTML = utilityNames[utilityId];

  // Render code blocks if viewing code blocks
  if (utilityId === "code-blocks") {
    await renderCodeBlocks();
  }
}

// Code Blocks Files to Load
const codeBlockFiles = [
  "sql-user-role.json",
  "sql-patient-study.json",
  "ngrok.json",
  "migration-patnav.json",
  "migration-user.json",
  "angular-form-inspector.json",
];

let codeBlocks = [];

// Load Code Blocks from files
async function loadCodeBlocks() {
  codeBlocks = [];
  for (const file of codeBlockFiles) {
    try {
      const response = await fetch(`utilities/code-blocks/${file}`);
      if (response.ok) {
        const block = await response.json();
        codeBlocks.push(block);
      }
    } catch (error) {
      console.error(`Failed to load ${file}:`, error);
    }
  }
  return codeBlocks;
}

// Render Code Blocks
async function renderCodeBlocks() {
  // Load code blocks if not already loaded
  if (codeBlocks.length === 0) {
    await loadCodeBlocks();
  }

  const container = document.getElementById("codeBlocksContainer");
  container.innerHTML = "";

  if (codeBlocks.length === 0) {
    container.innerHTML =
      '<div class="col-12"><div class="alert alert-info text-center">No code blocks loaded</div></div>';
    return;
  }

  codeBlocks.forEach((block, index) => {
    const card = document.createElement("div");
    card.innerHTML = `
      <div class="card h-100 border-0 shadow-sm">
        <div class="card-header bg-light border-bottom d-flex justify-content-between align-items-center">
          <div>
            <div class="card-title mb-2 text-dark fw-bold" style="font-size: 14px">${block.title}</div>
            <span class="badge bg-primary">${block.language}</span>
          </div>
          <button class="btn btn-outline-primary btn-sm" onclick="copyCodeBlock(${index})" title="Copy to clipboard">
            <i class="fas fa-copy"></i>
          </button>
        </div>
        <div class="card-body p-3">
          <div class="code-preview">${escapeHtml(block.code)}</div>
        </div>
        <div class="card-footer bg-light border-top">
          <span class="code-copy-feedback" id="codeFeedback${index}"><i class="fas fa-check text-success"></i> Copied!</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Copy Code Block
function copyCodeBlock(index) {
  const code = codeBlocks[index].code;
  navigator.clipboard
    .writeText(code)
    .then(() => {
      const feedback = document.getElementById(`codeFeedback${index}`);
      feedback.classList.add("show");
      setTimeout(() => feedback.classList.remove("show"), 2000);
    })
    .catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      const feedback = document.getElementById(`codeFeedback${index}`);
      feedback.classList.add("show");
      setTimeout(() => feedback.classList.remove("show"), 2000);
    });
}

// Helper function to escape HTML
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// SQL IN Generator Functions
function generateInQuery() {
  const table = document.getElementById("tableName").value.trim();
  const column = document.getElementById("columnName").value.trim();
  const raw = document.getElementById("rawIds").value;
  const format = document.getElementById("idFormat").value;

  if (!table || !column || !raw) {
    alert("Please fill in all fields");
    return;
  }

  const ids = raw
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

  if (ids.length === 0) {
    alert("No valid IDs found");
    return;
  }

  let inBlock;
  if (format === "no-quote") {
    inBlock = ids.join(",\n");
  } else if (format === "double-quote") {
    inBlock = ids.map((id) => `"${id}"`).join(",\n");
  } else {
    inBlock = ids.map((id) => `'${id}'`).join(",\n");
  }

  const query = `SELECT *\nFROM ${table}\nWHERE ${column} IN (\n  ${inBlock}\n);`;

  document.getElementById("outputQuery").value = query;
  document.getElementById("idCount").textContent = ids.length;
  document.getElementById("charCount").textContent = query.length;
  document.getElementById("stats").style.display = "grid";
}

function copyInQuery() {
  const output = document.getElementById("outputQuery");
  if (!output.value) {
    alert("Nothing to copy");
    return;
  }

  navigator.clipboard
    .writeText(output.value)
    .then(() => {
      showCopyFeedback();
    })
    .catch(() => {
      output.select();
      document.execCommand("copy");
      showCopyFeedback();
    });
}

function showCopyFeedback() {
  const feedback = document.getElementById("copyFeedback");
  feedback.classList.add("show");
  setTimeout(() => feedback.classList.remove("show"), 2000);
}

function downloadInQuery() {
  const output = document.getElementById("outputQuery");
  if (!output.value) {
    alert("Nothing to download");
    return;
  }

  const table = document.getElementById("tableName").value || "query";
  const blob = new Blob([output.value], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${table}-query.sql`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

function clearInInputs() {
  document.getElementById("tableName").value = "";
  document.getElementById("columnName").value = "";
  document.getElementById("rawIds").value = "";
  document.getElementById("outputQuery").value = "";
  document.getElementById("stats").style.display = "none";
}

// Keyboard shortcut
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    const activeView = document.querySelector(".utility-view.active");
    if (activeView && activeView.id === "in-generator") {
      generateInQuery();
    }
  }
});
