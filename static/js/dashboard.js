/**
 * ==============================================================================
 * Project: System Call Monitoring & Execution System
 * Frontend Controller: dashboard.js (Production Grade)
 * ==============================================================================
 */

let currentSyscall = 'open';
let syscallChartInstance = null;
let resourceChartInstance = null;

// Syscall metadata & parameter form templates
const SYSCALL_CONFIGS = {
    open: {
        signature: 'int open(const char *pathname, int flags, mode_t mode);',
        fields: `
            <div class="param-row">
                <label>Target File Name</label>
                <input type="text" class="param-input" id="paramFilename" value="test.txt" placeholder="e.g. test.txt">
            </div>
            <div class="param-row">
                <label>Access Mode Flags</label>
                <select class="param-select" id="paramMode">
                    <option value="w" selected>Write / Create (O_CREAT | O_WRONLY | O_TRUNC)</option>
                    <option value="r">Read Only (O_RDONLY)</option>
                    <option value="a">Append (O_CREAT | O_WRONLY | O_APPEND)</option>
                </select>
                <div class="param-hint">Kernel checks permissions and allocates lowest free integer descriptor.</div>
            </div>
        `,
        userAction: 'open("test.txt", O_CREAT|O_WRONLY|O_TRUNC, 0644)',
        kernelAction: 'VFS directory lookup & allocate lowest free fd',
        resultAction: 'Returns File Descriptor (fd = 3)'
    },
    read: {
        signature: 'ssize_t read(int fd, void *buf, size_t count);',
        fields: `
            <div class="param-row">
                <label>File Name to Read</label>
                <input type="text" class="param-input" id="paramFilename" value="test.txt" placeholder="e.g. test.txt">
                <div class="param-hint">Will retrieve data previously saved in the file by write().</div>
            </div>
        `,
        userAction: 'read(fd, buffer, sizeof(buffer))',
        kernelAction: 'Page cache lookup & copy bytes across boundary',
        resultAction: 'Returns total bytes read into buffer'
    },
    write: {
        signature: 'ssize_t write(int fd, const void *buf, size_t count);',
        fields: `
            <div class="param-row">
                <label>Target File Name</label>
                <input type="text" class="param-input" id="paramFilename" value="test.txt" placeholder="e.g. test.txt">
            </div>
            <div class="param-row">
                <label style="color: var(--primary); font-weight: 700;">Data to Enter into File (Required)</label>
                <input type="text" class="param-input" id="paramContent" placeholder="Enter custom text/data to write into the file..." value="" autofocus>
                <div class="param-hint" style="color: var(--warning);">* Please type custom data. The system call will transfer these exact bytes into the kernel.</div>
            </div>
        `,
        userAction: 'write(fd, user_buffer, byte_count)',
        kernelAction: 'Copies user bytes across privilege boundary into page cache',
        resultAction: 'Returns number of bytes accepted'
    },
    close: {
        signature: 'int close(int fd);',
        fields: `
            <div class="param-row">
                <label>File Descriptor to Close</label>
                <input type="number" class="param-input" id="paramFd" value="3" min="0">
                <div class="param-hint">Releases index from process descriptor table.</div>
            </div>
        `,
        userAction: 'close(fd)',
        kernelAction: 'Decrements refcount & deallocates table index',
        resultAction: 'Returns 0 on success, -1 on error'
    },
    fork: {
        signature: 'pid_t fork(void);',
        fields: `
            <div class="param-row">
                <label>Operation Mechanism</label>
                <div class="param-hint" style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                    Clones current Process Control Block (<code>task_struct</code>). Memory pages are shared via 
                    <strong>Copy-On-Write (COW)</strong> until write occurs. Returns 0 to Child context, Child PID to Parent context.
                </div>
            </div>
        `,
        userAction: 'fork()',
        kernelAction: 'Allocates child PCB & duplicates address space (COW)',
        resultAction: 'Returns 0 to child, PID to parent'
    },
    exec: {
        signature: 'int execvp(const char *file, char *const argv[]);',
        fields: `
            <div class="param-row">
                <label>Target Executable Image</label>
                <input type="text" class="param-input" id="paramBinary" value="./child_worker" readonly>
                <div class="param-hint">Executes standalone binary; discards old address space while retaining PID.</div>
            </div>
        `,
        userAction: 'execvp("./child_worker", argv)',
        kernelAction: 'Unmaps old address space & loads ELF binary segments',
        resultAction: 'Replaces image; retains PID; exit code 42'
    },
    wait: {
        signature: 'pid_t waitpid(pid_t pid, int *status, int options);',
        fields: `
            <div class="param-row">
                <label>Process Synchronization</label>
                <div class="param-hint" style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                    Suspends parent execution until child state changes. Reaps child PCB and extracts termination exit code 
                    to prevent Zombie (<code>&lt;defunct&gt;</code>) process state.
                </div>
            </div>
        `,
        userAction: 'waitpid(child_pid, &status, 0)',
        kernelAction: 'Blocks parent execution & reaps terminated child PCB',
        resultAction: 'Returns child exit code (42)'
    },
    getpid: {
        signature: 'pid_t getpid(void);',
        fields: `
            <div class="param-row">
                <label>Process Info Query</label>
                <div class="param-hint" style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                    Reads active <code>current->pid</code> directly from kernel <code>task_struct</code> in O(1) time.
                </div>
            </div>
        `,
        userAction: 'getpid()',
        kernelAction: 'Reads current->pid from active task_struct',
        resultAction: 'Returns active Process ID in %rax'
    },
    getppid: {
        signature: 'pid_t getppid(void);',
        fields: `
            <div class="param-row">
                <label>Parent Process Info Query</label>
                <div class="param-hint" style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                    Traverses <code>current->real_parent->tgid</code> in task hierarchy to resolve parent process identifier.
                </div>
            </div>
        `,
        userAction: 'getppid()',
        kernelAction: 'Traverses real_parent pointer in task hierarchy',
        resultAction: 'Returns Parent Process ID in %rax'
    },
    mkdir: {
        signature: 'int mkdir(const char *pathname, mode_t mode);',
        fields: `
            <div class="param-row">
                <label>New Directory Name</label>
                <input type="text" class="param-input" id="paramDirname" value="os_test_directory">
                <div class="param-hint">Allocates directory inode and creates entries . and .. in filesystem.</div>
            </div>
        `,
        userAction: 'mkdir("os_test_directory", 0755)',
        kernelAction: 'Allocates directory inode in VFS blocks',
        resultAction: 'Returns 0 on success, -1 on error'
    },
    rmdir: {
        signature: 'int rmdir(const char *pathname);',
        fields: `
            <div class="param-row">
                <label>Directory Name to Remove</label>
                <input type="text" class="param-input" id="paramDirname" value="os_test_directory">
                <div class="param-hint">Unlinks empty directory inode from Virtual File System.</div>
            </div>
        `,
        userAction: 'rmdir("os_test_directory")',
        kernelAction: 'Verifies directory is empty & unlinks inode from dentry',
        resultAction: 'Returns 0 on success, -1 on error'
    }
};

// Select a system call from the left list
function selectSyscall(name, el) {
    currentSyscall = name;

    document.querySelectorAll('.syscall-item').forEach(item => item.classList.remove('active'));
    if (el) el.classList.add('active');

    const config = SYSCALL_CONFIGS[name] || SYSCALL_CONFIGS.open;

    document.getElementById('activeCallBadge').innerText = `Call: ${name}()`;
    document.getElementById('activeCallSignature').innerText = config.signature;
    document.getElementById('paramContainer').innerHTML = config.fields;

    // Update architecture diagram
    document.getElementById('stepUser').innerText = config.userAction;
    document.getElementById('stepKernel').innerText = config.kernelAction;
    document.getElementById('stepResult').innerText = config.resultAction;

    // Auto-focus first input if present
    setTimeout(() => {
        const firstInput = document.querySelector('#paramContainer input:not([readonly])');
        if (firstInput) firstInput.focus();
    }, 50);
}

// Execute selected system call
async function executeSelectedSyscall() {
    const btn = document.getElementById('btnExecuteCall');
    const params = {};

    if (document.getElementById('paramFilename')) {
        params.filename = document.getElementById('paramFilename').value.trim() || 'test.txt';
    }
    if (document.getElementById('paramMode')) {
        params.mode = document.getElementById('paramMode').value;
    }
    if (document.getElementById('paramFd')) {
        params.fd = parseInt(document.getElementById('paramFd').value, 10);
    }
    if (document.getElementById('paramDirname')) {
        params.dirname = document.getElementById('paramDirname').value.trim() || 'os_test_directory';
    }

    // Explicit validation: Require user data entry for write()
    if (currentSyscall === 'write') {
        const contentInput = document.getElementById('paramContent');
        const contentVal = contentInput ? contentInput.value.trim() : '';
        if (!contentVal) {
            showToast('⚠️ Please enter the data you want to write into the file!', 'warning');
            if (contentInput) {
                contentInput.focus();
                contentInput.style.borderColor = 'var(--danger)';
                contentInput.style.boxShadow = '0 0 14px var(--danger-glow)';
            }
            return;
        }
        params.content = contentVal;
    } else if (document.getElementById('paramContent')) {
        params.content = document.getElementById('paramContent').value;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="btn-text">⏳ Executing Syscall...</span>';

    try {
        const res = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ syscall: currentSyscall, params })
        });
        const data = await res.json();

        // Update telemetry values
        document.getElementById('resReturnValue').innerText = data.return_value;

        const statusEl = document.getElementById('resStatus');
        statusEl.innerText = data.status;
        statusEl.className = 'telemetry-value font-mono ' + 
            (data.status === 'SUCCESS' ? 'status-badge-success' : 'status-badge-error');

        document.getElementById('resTime').innerText = data.duration;

        // Update OS Steps Walkthrough
        if (data.os_info && data.os_info.steps) {
            let stepsHtml = data.os_info.steps.map(s => 
                `<div class="os-step-item">${s}</div>`
            ).join('');

            // If read() was executed and data was read back, show prominently
            if (currentSyscall === 'read' && data.data) {
                stepsHtml += `
                    <div class="os-step-item" style="border-left: 3px solid var(--success); background: var(--success-subtle); margin-top: 10px;">
                        <strong style="color: var(--success);">📥 Content Read Back From File:</strong>
                        <div style="font-family: var(--font-mono); font-size: 13px; color: #fff; margin-top: 5px; padding: 8px 12px; background: rgba(0,0,0,0.4); border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
                            ${escapeHtml(data.data)}
                        </div>
                    </div>
                `;
            }

            document.getElementById('osStepsList').innerHTML = stepsHtml;
        }

        // Add to history table
        prependHistoryRow(data.history_entry);

        // Append to terminal output
        if (data.raw_output) {
            appendTerminalOutput(`$ ./syscall_runner --${currentSyscall}\n${data.raw_output}`);
        }

        showToast(`Syscall ${currentSyscall}() executed in ${data.duration}`, 'success');

        // Refresh stats
        loadSystemStatus();
        loadSyscallStats();

    } catch (e) {
        console.error("Execution failed:", e);
        showToast(`Execution failed: ${e.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <span class="btn-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </span>
            <span class="btn-text">[ Execute System Call ]</span>
            <span class="kbd-hint">Ctrl + Enter</span>
        `;
    }
}

// Prepend row to history table
function prependHistoryRow(entry) {
    if (!entry) return;
    const tbody = document.getElementById('historyTableBody');
    const isSuccess = entry.status === 'SUCCESS';

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${entry.time}</td>
        <td><span style="color: #cbd5e1;">${escapeHtml(entry.process)}</span></td>
        <td><strong style="color: var(--primary);">${escapeHtml(entry.syscall)}</strong></td>
        <td><span style="color: var(--text-secondary);">${escapeHtml(entry.params)}</span></td>
        <td><span style="color: var(--primary);">${escapeHtml(entry.return_value)}</span></td>
        <td class="${isSuccess ? 'status-ok' : 'status-err'}">${entry.status}</td>
        <td style="color: var(--warning);">${entry.duration}</td>
    `;
    tbody.insertBefore(tr, tbody.firstChild);
}

// Load System Status (Processes, Syscalls, CPU, RAM)
async function loadSystemStatus() {
    try {
        const res = await fetch('/api/system_status');
        const data = await res.json();

        document.getElementById('statProcesses').innerText = data.processes;
        document.getElementById('statSyscalls').innerText = Number(data.syscalls).toLocaleString();
        document.getElementById('statCPU').innerText = data.cpu;
        document.getElementById('statMemory').innerText = data.memory;

        // Update CPU progress bar
        const cpuVal = data.cpu_val !== undefined ? data.cpu_val : parseFloat(data.cpu) || 15;
        const cpuBar = document.getElementById('cpuProgressBar');
        if (cpuBar) cpuBar.style.width = `${Math.min(100, Math.max(5, cpuVal))}%`;

        // Update Memory progress bar
        const memVal = data.memory_val !== undefined ? data.memory_val : 38;
        const memBar = document.getElementById('memProgressBar');
        if (memBar) memBar.style.width = `${Math.min(100, Math.max(5, memVal))}%`;

        // Update live chart if active
        if (data.metrics_history && resourceChartInstance) {
            updateResourceChart(data.metrics_history);
        }

    } catch (e) {
        console.error("Status load error:", e);
    }
}

// Load Call History Table
async function loadHistory() {
    try {
        const res = await fetch('/api/history');
        const list = await res.json();

        const tbody = document.getElementById('historyTableBody');
        tbody.innerHTML = list.map(item => `
            <tr>
                <td>${item.time}</td>
                <td><span style="color: #cbd5e1;">${escapeHtml(item.process)}</span></td>
                <td><strong style="color: var(--primary);">${escapeHtml(item.syscall)}</strong></td>
                <td><span style="color: var(--text-secondary);">${escapeHtml(item.params)}</span></td>
                <td><span style="color: var(--primary);">${escapeHtml(item.return_value)}</span></td>
                <td class="${item.status === 'SUCCESS' ? 'status-ok' : 'status-err'}">${item.status}</td>
                <td style="color: var(--warning);">${item.duration}</td>
            </tr>
        `).join('');
    } catch (e) {
        console.error("History load error:", e);
    }
}

// Load Running Processes List
async function loadProcessList() {
    try {
        const res = await fetch('/api/process_list');
        const procs = await res.json();

        const tbody = document.getElementById('processTableBody');
        tbody.innerHTML = procs.map(p => `
            <tr>
                <td><span class="font-mono" style="color: var(--primary);">${p.pid}</span></td>
                <td><strong style="color: #fff;">${escapeHtml(p.name)}</strong></td>
                <td><span style="color: var(--warning); font-weight: 600;">${p.cpu}</span></td>
                <td><span style="color: #c084fc;">${p.memory}</span></td>
                <td><span class="status-ok">RUNNING</span></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error("Process load error:", e);
    }
}

// Load Syscall Frequency Stats & Render Charts
async function loadSyscallStats() {
    try {
        const res = await fetch('/api/syscall_stats');
        const data = await res.json();

        document.getElementById('totalCallsSummary').innerText = Number(data.total).toLocaleString();

        const counts = data.counts || {};
        const maxVal = Math.max(...Object.values(counts), 1);
        const container = document.getElementById('statsBarsContainer');

        if (container) {
            container.innerHTML = Object.entries(counts).map(([name, count]) => {
                const pct = Math.round((count / maxVal) * 100);
                return `
                    <div class="bar-row">
                        <div class="bar-name">${name}()</div>
                        <div class="bar-track">
                            <div class="bar-fill" style="width: ${pct}%;"></div>
                        </div>
                        <div class="bar-count">${count}</div>
                    </div>
                `;
            }).join('');
        }

        // Render / Update Doughnut Chart
        renderSyscallChart(counts);

    } catch (e) {
        console.error("Stats load error:", e);
    }
}

// Render Syscall Distribution Doughnut Chart via Chart.js
function renderSyscallChart(counts) {
    const ctx = document.getElementById('syscallPieChart');
    if (!ctx) return;

    const labels = Object.keys(counts).map(k => `${k}()`);
    const values = Object.values(counts);

    const colors = [
        '#00e5ff', '#10b981', '#38bdf8', '#f59e0b', '#a855f7',
        '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#eab308'
    ];

    if (syscallChartInstance) {
        syscallChartInstance.data.labels = labels;
        syscallChartInstance.data.datasets[0].data = values;
        syscallChartInstance.update();
        return;
    }

    syscallChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#0a0f1d'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#94a3b8',
                        font: { family: "'JetBrains Mono', monospace", size: 11 },
                        padding: 10
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Initialize Resource Line Chart (CPU / RAM Live Stream)
function initResourceChart() {
    const ctx = document.getElementById('resourceLineChart');
    if (!ctx) return;

    resourceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'CPU Load (%)',
                    data: [],
                    borderColor: '#00e5ff',
                    backgroundColor: 'rgba(0, 229, 255, 0.08)',
                    borderWidth: 2,
                    tension: 0.35,
                    fill: true,
                    pointRadius: 2
                },
                {
                    label: 'Memory (%)',
                    data: [],
                    borderColor: '#c084fc',
                    backgroundColor: 'rgba(192, 132, 252, 0.08)',
                    borderWidth: 2,
                    tension: 0.35,
                    fill: true,
                    pointRadius: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#64748b', font: { family: "'JetBrains Mono', monospace", size: 10 } }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#64748b', font: { family: "'JetBrains Mono', monospace", size: 10 } }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#94a3b8', font: { family: "'Inter', sans-serif", size: 11 } }
                }
            }
        }
    });
}

function updateResourceChart(history) {
    if (!resourceChartInstance) initResourceChart();
    if (!resourceChartInstance) return;

    resourceChartInstance.data.labels = history.timestamps || [];
    resourceChartInstance.data.datasets[0].data = history.cpu || [];
    resourceChartInstance.data.datasets[1].data = history.memory || [];
    resourceChartInstance.update();
}

// Switch Bottom Tabs
function switchTab(tabId) {
    document.querySelectorAll('.tab-bar .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));

    const tabMap = {
        history: { btn: 'tabBtnHistory', view: 'viewHistory' },
        process: { btn: 'tabBtnProcess', view: 'viewProcess', action: loadProcessList },
        stats: { btn: 'tabBtnStats', view: 'viewStats', action: loadSyscallStats },
        terminal: { btn: 'tabBtnTerminal', view: 'viewTerminal' }
    };

    const target = tabMap[tabId] || tabMap.history;
    const btnEl = document.getElementById(target.btn);
    const viewEl = document.getElementById(target.view);

    if (btnEl) btnEl.classList.add('active');
    if (viewEl) viewEl.classList.add('active');
    if (target.action) target.action();
}

// Filter Syscall List in Left Panel
function filterSyscallList() {
    const q = document.getElementById('filterSyscallsInput').value.toLowerCase();
    const items = document.querySelectorAll('.syscall-item');

    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(q) ? 'flex' : 'none';
    });
}

// Filter Category Pills
function filterCategory(cat, el) {
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');

    const items = document.querySelectorAll('.syscall-item');
    items.forEach(item => {
        if (cat === 'all' || item.getAttribute('data-category') === cat) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Filter History Table
function filterActivityTable() {
    const q = document.getElementById('logSearchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#historyTableBody tr');

    rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(q) ? '' : 'none';
    });
}

// Quick Workflow Triggers
function triggerWorkflow(action) {
    if (action === 'file') {
        openFileWorkflowModal();
    } else if (action === 'process') {
        runFullAction('process', 'Process Management Lifecycle (fork, execvp, waitpid)');
    } else if (action === 'test') {
        runFullAction('test', '12-Stage Automated Test Suite');
    }
}

// Modal management for File Pipeline
function openFileWorkflowModal() {
    document.getElementById('fileWorkflowModal').style.display = 'flex';
    document.getElementById('modalFileContent').focus();
}

function closeFileWorkflowModal() {
    document.getElementById('fileWorkflowModal').style.display = 'none';
}

async function executeFileWorkflow() {
    const filename = document.getElementById('modalFileName').value.trim() || 'syscall_testfile.txt';
    const content = document.getElementById('modalFileContent').value.trim();

    if (!content) {
        showToast('⚠️ Please enter custom text to write into the file!', 'warning');
        document.getElementById('modalFileContent').focus();
        return;
    }

    closeFileWorkflowModal();
    showToast('Executing Interactive File Pipeline...', 'warning');

    try {
        const res = await fetch('/api/run/file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ custom_text: content })
        });
        const data = await res.json();

        appendTerminalOutput(`$ ./syscall_runner --file "${content}"\n${data.output}`);
        switchTab('terminal');

        showToast('File Lifecycle completed successfully!', 'success');
        loadSystemStatus();
        loadHistory();
    } catch (e) {
        showToast(`Workflow error: ${e.message}`, 'error');
    }
}

// Run Full Action (Process or Test)
async function runFullAction(action, label) {
    showToast(`Executing ${label}...`, 'warning');
    switchTab('terminal');

    try {
        const res = await fetch(`/api/run/${action}`, { method: 'POST' });
        const data = await res.json();

        appendTerminalOutput(`$ ${data.command}\n${data.output}`);
        showToast(`${label} finished! (Exit: ${data.return_code})`, data.success ? 'success' : 'error');

        loadSystemStatus();
        loadHistory();
    } catch (e) {
        showToast(`Action failed: ${e.message}`, 'error');
    }
}

// Terminal Append & Helpers
function appendTerminalOutput(text) {
    const term = document.getElementById('terminalOutput');
    if (!term) return;
    term.textContent += `\n[${new Date().toLocaleTimeString()}] ${text}\n`;
    term.scrollTop = term.scrollHeight;
}

function clearTerminalOutput() {
    const term = document.getElementById('terminalOutput');
    if (term) term.textContent = '[TERMINAL CLEARED]\n';
}

function copyTerminalOutput() {
    const term = document.getElementById('terminalOutput');
    if (!term) return;
    navigator.clipboard.writeText(term.textContent);
    showToast('Terminal text copied to clipboard!', 'success');
}

// Export CSV & JSON
function exportCSV() {
    window.location.href = '/api/export_csv';
    showToast('Downloading CSV activity ledger...', 'success');
}

function exportJSON() {
    window.location.href = '/api/export_json';
    showToast('Downloading structured JSON telemetry...', 'success');
}

// Clear History
async function clearHistoryLogs() {
    if (confirm("Are you sure you want to clear all recorded system call activity logs?")) {
        await fetch('/api/clear_history', { method: 'POST' });
        document.getElementById('historyTableBody').innerHTML = '';
        showToast('System call activity history cleared.', 'warning');
        loadSyscallStats();
    }
}

// Toast notification system
function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(30px)';
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

// HTML escape helper
function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Keyboard shortcut: Ctrl + Enter to execute
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeSelectedSyscall();
    }
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    selectSyscall('open', document.querySelector('.syscall-item[onclick*="open"]'));
    loadSystemStatus();
    loadHistory();
    loadSyscallStats();
    initResourceChart();

    // Periodic telemetry update every 2.5 seconds
    setInterval(loadSystemStatus, 2500);
});
