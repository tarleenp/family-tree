let members = [
  { id:"1", name:"Amit Sharma",  gender:"Male",   dob:"1955-03-10", fatherId:"",  motherId:"" },
  { id:"2", name:"Priya Sharma", gender:"Female", dob:"1958-07-22", fatherId:"",  motherId:"" },
  { id:"3", name:"Rohan Sharma", gender:"Male",   dob:"1980-11-05", fatherId:"1", motherId:"2" },
  { id:"4", name:"Sneha Sharma", gender:"Female", dob:"1983-04-18", fatherId:"1", motherId:"2" },
  { id:"5", name:"Aarav Sharma", gender:"Male",   dob:"2005-09-12", fatherId:"3", motherId:"" },
  { id:"6", name:"Riya Sharma",  gender:"Female", dob:"2008-02-03", fatherId:"3", motherId:"" },
];


let selectedId  = null;
let panelMode   = "placeholder"; // "placeholder" | "detail" | "add" | "edit"
let editingId   = null;
let currentView = "tree";        // "tree" | "text" | "cards"

const byId    = id => members.find(m => m.id === id);
const childOf = id => members.filter(m => m.fatherId === id || m.motherId === id);
const siblOf  = p  => members.filter(m =>
  m.id !== p.id &&
  ((p.fatherId && m.fatherId === p.fatherId) ||
   (p.motherId && m.motherId === p.motherId))
);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function esc(s) {
  return String(s || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function formatDate(dob) {
  if (!dob) return null;
  return new Date(dob).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
}

const genderEmoji = g => ({ Male:"👨", Female:"👩", Other:"🧑" }[g] || "👤");
const barCls      = g => ({ Male:"male", Female:"female", Other:"other" }[g] || "none");

function toggleTheme() {
  const root  = document.documentElement;
  const isDark = root.getAttribute("data-theme") === "dark";
  const next  = isDark ? "light" : "dark";
  root.setAttribute("data-theme", next);
  document.getElementById("themeIcon").textContent = isDark ? "🌙" : "☀️";
  localStorage.setItem("ft-theme", next);
}
function initTheme() {
  const saved = localStorage.getItem("ft-theme");
  if (saved) {
    document.documentElement.setAttribute("data-theme", saved);
    document.getElementById("themeIcon").textContent = saved === "dark" ? "☀️" : "🌙";
  }
}


function buildRoots() {
  const allIds = new Set(members.map(m => m.id));
  return members.filter(m =>
    (!m.fatherId || !allIds.has(m.fatherId)) &&
    (!m.motherId || !allIds.has(m.motherId))
  );
}

function groupTopLevel() {
  const roots = buildRoots();
  const used  = new Set();
  const units = [];

  roots.forEach(m => {
    if (used.has(m.id)) return;
    const partner = roots.find(o =>
      o.id !== m.id && !used.has(o.id) &&
      members.some(c =>
        (c.fatherId === m.id && c.motherId === o.id) ||
        (c.fatherId === o.id && c.motherId === m.id)
      )
    );
    if (partner) {
      used.add(m.id); used.add(partner.id);
      const p1 = (m.gender === "Female" && partner.gender !== "Female") ? partner : m;
      const p2 = p1 === m ? partner : m;
      const kids = uniqueKids([p1.id, p2.id]);
      units.push({ type:"couple", p1, p2, kids });
    } else {
      used.add(m.id);
      units.push({ type:"single", member: m, kids: childOf(m.id) });
    }
  });

  roots.forEach(m => {
    if (!used.has(m.id)) {
      used.add(m.id);
      units.push({ type:"single", member: m, kids: childOf(m.id) });
    }
  });

  return units;
}

function uniqueKids(parentIds) {
  const seen = new Set();
  return members.filter(m => {
    const isKid = parentIds.some(pid => m.fatherId === pid || m.motherId === pid);
    if (isKid && !seen.has(m.id)) { seen.add(m.id); return true; }
    return false;
  });
}

function childToUnit(child) {
  const grandkids = childOf(child.id);
  const partner   = members.find(o =>
    o.id !== child.id &&
    members.some(gc =>
      (gc.fatherId === child.id && gc.motherId === o.id) ||
      (gc.fatherId === o.id && gc.motherId === child.id)
    )
  );
  if (partner && grandkids.length) {
    const p1 = (child.gender === "Female" && partner.gender !== "Female") ? partner : child;
    const p2 = p1 === child ? partner : child;
    return { type:"couple", p1, p2, kids: uniqueKids([p1.id, p2.id]) };
  }
  return { type:"single", member: child, kids: grandkids };
}

function nodeHTML(member) {
  const active = selectedId === member.id ? " active" : "";
  const dob    = formatDate(member.dob);
  return `
    <div class="tree-node${active}" onclick="selectMember('${member.id}')">
      <div class="node-bar ${barCls(member.gender)}"></div>
      <div class="node-body">
        <div class="node-avatar ${barCls(member.gender)}">${genderEmoji(member.gender)}</div>
        <div class="node-name">${esc(member.name)}</div>
        ${dob ? `<div class="node-dob">${dob}</div>` : ""}
      </div>
    </div>`;
}

function renderUnit(unit) {
  const kids = unit.kids || [];

  let parentsHTML = "";
  if (unit.type === "couple") {
    parentsHTML = `
      <div class="parents-strip">
        ${nodeHTML(unit.p1)}
        <div class="couple-heart">❤️</div>
        ${nodeHTML(unit.p2)}
      </div>`;
  } else {
    parentsHTML = `<div class="parents-strip">${nodeHTML(unit.member)}</div>`;
  }

  if (!kids.length) {
    return `<div class="family-unit">${parentsHTML}</div>`;
  }

  const childCols = kids.map(child => {
    const cu = childToUnit(child);
    return `<div class="child-col"><div class="child-rise"></div>${renderUnit(cu)}</div>`;
  }).join("");

  return `
    <div class="family-unit">
      ${parentsHTML}
      <div class="drop-line"></div>
      <div class="children-row">
        ${childCols}
      </div>
    </div>`;
}

function renderTree() {
  const wrap   = document.getElementById("treeView");
  const canvas = document.getElementById("treeCanvas");
  const query  = document.getElementById("searchInput").value.trim().toLowerCase();

  document.getElementById("memberCount").textContent =
    `${members.length} member${members.length !== 1 ? "s" : ""}`;

  if (query) {
    const hits = members.filter(m => m.name.toLowerCase().includes(query));
    wrap.innerHTML = !hits.length
      ? emptyStateHTML("🔍", `No members match "<strong>${esc(query)}</strong>"`)
      : `<div class="search-results">
           <div class="search-results-label">Search results (${hits.length})</div>
           ${hits.map(m => `
             <div class="search-pill${selectedId===m.id?" active":""}"
                  onclick="selectMember('${m.id}');document.getElementById('searchInput').value='';renderAll()">
               <span class="dot ${barCls(m.gender)}"></span>${esc(m.name)}
             </div>`).join("")}
         </div>`;
    return;
  }

  if (!members.length) {
    wrap.innerHTML = emptyStateHTML("🌱", "Your family tree is empty.<br/>Click <strong>+ Add Member</strong> to begin.");
    return;
  }

  wrap.innerHTML = `<div id="treeCanvas" class="tree-canvas"></div>`;
  const newCanvas = document.getElementById("treeCanvas");
  const topUnits  = groupTopLevel();
  newCanvas.innerHTML = `<div class="gen-row">${topUnits.map(u => renderUnit(u)).join("")}</div>`;
}

function renderText() {
  const out = document.getElementById("textOutput");
  if (!members.length) { out.textContent = "(No members yet)"; return; }

  const allIds  = new Set(members.map(m => m.id));
  const roots   = buildRoots();
  const lines   = [];

  function walk(member, prefix, isLast) {
    const connector = isLast ? "└─ " : "├─ ";
    const dob = formatDate(member.dob);
    const dobStr = dob ? ` (${dob})` : "";
    lines.push(prefix + connector + member.name + dobStr);
    const nextPrefix = prefix + (isLast ? "   " : "│  ");
    const kids = childOf(member.id);
    kids.forEach((k, i) => walk(k, nextPrefix, i === kids.length - 1));
  }

  roots.forEach(r => {
    const dob = formatDate(r.dob);
    lines.push(r.name + (dob ? ` (${dob})` : ""));
    const kids = childOf(r.id);
    kids.forEach((k, i) => walk(k, "", i === kids.length - 1));
    lines.push(""); // blank line between root families
  });

  out.textContent = lines.join("\n");
}

function renderCards() {
  const grid  = document.getElementById("cardsGrid");
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const list  = query ? members.filter(m => m.name.toLowerCase().includes(query)) : members;

  document.getElementById("memberCount").textContent =
    `${members.length} member${members.length !== 1 ? "s" : ""}`;

  if (!list.length) {
    grid.innerHTML = emptyStateHTML(query ? "🔍" : "🌱",
      query ? `No members match "<strong>${esc(query)}</strong>"` : "No members yet.");
    return;
  }

  grid.innerHTML = list.map(m => {
    const father = byId(m.fatherId);
    const mother = byId(m.motherId);
    const kids   = childOf(m.id);
    const chips  = [
      father ? `<span class="chip">👨 ${esc(father.name)}</span>` : "",
      mother ? `<span class="chip">👩 ${esc(mother.name)}</span>` : "",
      ...kids.slice(0, 2).map(k => `<span class="chip">🧒 ${esc(k.name)}</span>`),
      kids.length > 2 ? `<span class="chip">+${kids.length - 2} more</span>` : "",
    ].join("");
    const cls  = barCls(m.gender);
    const dob  = formatDate(m.dob);
    const active = selectedId === m.id ? " active" : "";
    return `
      <div class="member-card ${cls}${active}" onclick="selectMember('${m.id}')">
        <div class="card-avatar ${cls}">${genderEmoji(m.gender)}</div>
        <div class="card-name">${esc(m.name)}</div>
        <div class="card-gender ${cls}">${m.gender || "Unknown"}</div>
        ${dob ? `<div class="card-dob">🎂 ${dob}</div>` : ""}
        ${chips ? `<div class="card-chips">${chips}</div>` : ""}
      </div>`;
  }).join("");
}


function openPanel() {
  document.getElementById("rightPanel").classList.add("open");
}
function closePanel() {
  const p = document.getElementById("rightPanel");
  p.classList.remove("open");
  setTimeout(() => {
    if (!p.classList.contains("open")) {
      p.innerHTML = `<div class="panel-placeholder"><div class="placeholder-icon">👨‍👩‍👧‍👦</div><p>Select a member to view details,<br/>or add a new one to get started.</p></div>`;
    }
  }, 310);
}

function renderRight() {
  const panel = document.getElementById("rightPanel");

  if (panelMode === "placeholder") { closePanel(); return; }

  openPanel();

  if (panelMode === "add" || panelMode === "edit") {
    renderForm(panel);
    return;
  }

  const p = byId(selectedId);
  if (!p) { closePanel(); return; }

  const father = byId(p.fatherId);
  const mother = byId(p.motherId);
  const kids   = childOf(p.id);
  const sibs   = siblOf(p);
  const cls    = barCls(p.gender);

  const chipsHTML = arr => arr.length
    ? `<div class="rel-chips">${arr.map(m => `<span class="rel-chip">${esc(m.name)}</span>`).join("")}</div>`
    : null;

  const infoRow = (label, val) =>
    `<div class="info-row">
       <span class="info-label">${label}</span>
       <span class="info-value${val ? "" : " empty"}">${val ? esc(val) : "Not recorded"}</span>
     </div>`;

  const infoRowChips = (label, chipsEl) =>
    `<div class="info-row">
       <span class="info-label">${label}</span>
       <span class="info-value${chipsEl ? "" : " empty"}" style="text-align:right">${chipsEl || "None"}</span>
     </div>`;

  panel.innerHTML = `
    <div class="panel-inner">
      <div class="detail-hero">
        <button class="detail-close" onclick="closeDetail()">✕</button>
        <div class="detail-avatar ${cls}">${genderEmoji(p.gender)}</div>
        <div class="detail-name">${esc(p.name)}</div>
        <div class="detail-gender ${cls}">${p.gender || "Unknown"}</div>
        ${p.dob ? `<div class="detail-dob">🎂 ${formatDate(p.dob)}</div>` : ""}
      </div>
      <div class="detail-body">
        <div class="info-section">
          <div class="info-section-title">Parents</div>
          ${infoRow("Father", father?.name)}
          ${infoRow("Mother", mother?.name)}
        </div>
        <div class="info-section">
          <div class="info-section-title">Family</div>
          ${infoRowChips("Children", chipsHTML(kids))}
          ${infoRowChips("Siblings", chipsHTML(sibs))}
        </div>
      </div>
      <div class="detail-actions">
        <button class="btn btn-edit"   onclick="openEditForm('${p.id}')">✏️ Edit</button>
        <button class="btn btn-danger" onclick="deleteMember('${p.id}')">🗑 Delete</button>
      </div>
    </div>`;
}


function renderForm(panel) {
  const editing = panelMode === "edit" ? byId(editingId) : null;
  const isEdit  = panelMode === "edit";

  // Pre-selected children (members whose parent is editingId)
  const currentKidIds = isEdit
    ? new Set(members.filter(m => m.fatherId === editingId || m.motherId === editingId).map(m => m.id))
    : new Set();

  const gOpts = ["", "Male", "Female", "Other"]
    .map(g => `<option value="${g}"${editing?.gender === g ? " selected" : ""}>${g || "— Select —"}</option>`).join("");
  const fOpts = members.filter(m => m.id !== editingId && m.gender !== "Female")
    .map(m => `<option value="${m.id}"${editing?.fatherId === m.id ? " selected" : ""}>${esc(m.name)}</option>`).join("");
  const mOpts = members.filter(m => m.id !== editingId && m.gender !== "Male")
    .map(m => `<option value="${m.id}"${editing?.motherId === m.id ? " selected" : ""}>${esc(m.name)}</option>`).join("");

  const childCandidates = members.filter(m => m.id !== editingId);
  const childRows = childCandidates.map(m => `
    <label class="child-check-row">
      <input type="checkbox" class="kid-cb" value="${m.id}"${currentKidIds.has(m.id) ? " checked" : ""}/>
      <span class="child-check-name">${esc(m.name)}</span>
    </label>`).join("");

  panel.innerHTML = `
    <div class="panel-inner">
      <div class="form-header">
        <div class="form-title">${isEdit ? "Edit Member" : "Add New Member"}</div>
        <div class="form-subtitle">${isEdit ? "Update the details below" : "Fill in the details below"}</div>
      </div>
      <div class="form-body">
        <div class="error-box" id="formError"></div>
        <div class="field">
          <label class="field-label">Full Name <span class="req">*</span></label>
          <input id="fName" type="text" placeholder="e.g. Rahul Sharma" value="${editing ? esc(editing.name) : ""}"/>
        </div>
        <div class="field">
          <label class="field-label">Gender</label>
          <select id="fGender">${gOpts}</select>
        </div>
        <div class="field">
          <label class="field-label">Date of Birth</label>
          <input id="fDob" type="date" value="${editing?.dob || ""}"/>
        </div>
        <div class="field">
          <label class="field-label">Father</label>
          <select id="fFather"><option value="">— None —</option>${fOpts}</select>
        </div>
        <div class="field">
          <label class="field-label">Mother</label>
          <select id="fMother"><option value="">— None —</option>${mOpts}</select>
        </div>
        ${childCandidates.length ? `
        <div class="field">
          <label class="field-label">Children</label>
          <div class="children-list" id="fChildren">${childRows}</div>
          <div class="field-hint">Check members who are this person's children</div>
        </div>` : ""}
      </div>
      <div class="form-actions">
        <button class="btn btn-save" onclick="saveForm()">💾 Save Member</button>
        <button class="btn btn-cancel" onclick="cancelForm()">Cancel</button>
      </div>
    </div>`;
}


function selectMember(id) {
  selectedId = id;
  panelMode  = "detail";
  editingId  = null;
  renderAll();
}

function closeDetail() {
  selectedId = null;
  panelMode  = "placeholder";
  renderAll();
}

function openAddForm() {
  panelMode = "add";
  editingId = null;
  selectedId = null;
  renderAll();
}

function openEditForm(id) {
  panelMode = "edit";
  editingId = id;
  renderAll();
}

function cancelForm() {
  if (selectedId) { panelMode = "detail"; renderAll(); }
  else { panelMode = "placeholder"; editingId = null; renderAll(); }
}

function saveForm() {
  const name     = document.getElementById("fName").value.trim();
  const gender   = document.getElementById("fGender").value;
  const dob      = document.getElementById("fDob").value;
  const fatherId = document.getElementById("fFather").value;
  const motherId = document.getElementById("fMother").value;
  const errEl    = document.getElementById("formError");

  const checkedKids = Array.from(document.querySelectorAll(".kid-cb:checked")).map(cb => cb.value);

  if (!name) { errEl.textContent = "⚠ Name is required."; errEl.style.display = "block"; return; }
  errEl.style.display = "none";

  let savedId;

  if (panelMode === "edit") {
    const idx = members.findIndex(m => m.id === editingId);
    members[idx] = { id: editingId, name, gender, dob, fatherId, motherId };
    savedId    = editingId;
    selectedId = editingId;
    toast("Member updated ✓");
  } else {
    savedId = uid();
    members.push({ id: savedId, name, gender, dob, fatherId, motherId });
    selectedId = savedId;
    toast("Member added ✓");
  }

  members = members.map(m => {
    if (m.id === savedId) return m;
    if (!checkedKids.includes(m.id)) {
      return {
        ...m,
        fatherId: m.fatherId === savedId ? "" : m.fatherId,
        motherId: m.motherId === savedId ? "" : m.motherId,
      };
    }
    if (gender === "Female") return { ...m, motherId: savedId };
    return { ...m, fatherId: savedId };
  });

  panelMode = "detail";
  editingId = null;
  renderAll();
}

function deleteMember(id) {
  if (!confirm(`Delete "${byId(id)?.name}"?.`)) return;
  members = members
    .filter(m => m.id !== id)
    .map(m => ({
      ...m,
      fatherId: m.fatherId === id ? "" : m.fatherId,
      motherId: m.motherId === id ? "" : m.motherId,
    }));
  selectedId = null;
  panelMode  = "placeholder";
  toast("Member deleted");
  renderAll();
}


function exportData() {
  const blob = new Blob([JSON.stringify(members, null, 2)], { type: "application/json" });
  const a    = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: "family-tree.json",
  });
  a.click();
  toast("Exported ✓");
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error();
      members    = data;
      selectedId = null;
      panelMode  = "placeholder";
      toast("Imported ✓");
      renderAll();
    } catch { alert("Invalid JSON file."); }
  };
  reader.readAsText(file);
  e.target.value = "";
}


let _toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}


function switchView(view) {
  currentView = view;
  ["tree", "text", "cards"].forEach(v => {
    document.getElementById(`${v}View`).style.display  = v === view ? "block" : "none";
    document.getElementById(`tab${v.charAt(0).toUpperCase() + v.slice(1)}`).classList.toggle("active", v === view);
  });
  if (view === "tree") document.getElementById("treeView").style.display = "block";
  renderAll();
}


function renderAll() {
  if (currentView === "tree")  renderTree();
  if (currentView === "text")  renderText();
  if (currentView === "cards") renderCards();
  renderRight();
}


function emptyStateHTML(icon, msg) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;
}


document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("addMemberBtn").addEventListener("click", openAddForm);
  document.getElementById("exportBtn").addEventListener("click", exportData);
  document.getElementById("importFile").addEventListener("change", importData);
  document.getElementById("searchInput").addEventListener("input", renderAll);
  renderAll();
});
