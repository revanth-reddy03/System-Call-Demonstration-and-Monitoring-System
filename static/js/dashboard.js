/**
 * System Call Monitoring and Execution System
 * Real-time Dashboard Controller
 */

let currentSyscall = 'open';

// Param form definitions for each system call
const SYSCALL_CONFIGS = {
    open: {
        fields: `
            <div class="param-row">
                <label>File Name</label>
                <input type="text" class="param-input" id="paramFilename" value="test.txt" placeholder="e.g. test.txt">
            </div>
            <div class="param-row">
                <label>Access Mode</label>
                <select class="param-select" id="paramMode">
                    <option value="w" selected>Write / Create (O_CREAT | O_WRONLY | O_TRUNC)</option>
                    <option value="r">Read Only (O_RDONLY)</option>
                    <option value="a">Append (O_CREAT | O_WRONLY | O_APPEND)</option>
                </select>
            </div>
        `,
        userAction: 'open("test.txt", O_WRONLY)',
        kernelAction: 'VFS directory lookup & allocate fd',
        resultAction: 'Returns File Descriptor (fd)'
    },
    read: {
        fields: `
            <div class="param-row">
                <label>File Name to Read</label>
                <input type="text" class="param-input" id="paramFilename" value="test.txt">
            </div>
        `,
        userAction: 'read(fd, buffer, 1024)',
        kernelAction: 'Page cache transfer to user space',
        resultAction: 'Returns total bytes read'
    },
    write: {
        fields: `
            <div class="param-row">
                <label>File Name</label>
                <input type="text" class="param-input" id="paramFilename" value="test.txt">
            </div>
            <div class="param-row">
                <label>Data to Write</label>
                <input type="text" class="param-input" id="paramContent" value="Hello Operating Systems! Writing via system call.">
            </div>
        `,
        userAction: 'write(fd, buffer, bytes)',
        kernelAction: 'Copies bytes to page cache blocks',
        resultAction: 'Returns bytes written count'
    },
    close: {
        fields: `
            <div class="param-row">
                <label>File Descriptor to Close</label>
                <input type="number" class="param-input" id="paramFd" value="3">
            </div>
        `,
        userAction: 'close(fd)',
        kernelAction: 'Decrements ref count & releases fd',
        resultAction: 'Returns 0 (Success) or -1'
    },
    fork: {
        fields: `
            <div class="param-row">
                <label>Operation Details</label>
                <div style="font-size: 13px; color: #cbd5e1;">Creates duplicate child process via Copy-On-Write (COW).</div>
            </div>
        `,
        userAction: 'fork()',
        kernelAction: 'Clones task_struct & memory pages',
        resultAction: 'Returns 0 to child, PID to parent'
    },
    exec: {
        fields: `
            <div class="param-row">
                <label>Binary Program</label>
                <input type="text" class="param-input" id="paramBinary" value="./child_worker" readonly>
            </div>
        `,
        userAction: 'execvp("./child_worker", argv)',
        kernelAction: 'Discards memory & loads ELF binary',
        resultAction: 'Replaces image; retains PID'
    },
    wait: {
        fields: `
            <div class="param-row">
                <label>Process Synchronization</label>
                <div style="font-size: 13px; color: #cbd5e1;">Parent waits for child process termination and reaps zombie status.</div>
            </div>
        `,
        userAction: 'waitpid(child_pid, &status, 0)',
        kernelAction: 'Suspends parent & reaps child PCB',
        resultAction: 'Returns child termination exit code'
    },
    getpid: {
        fields: `
            <div class="param-row">
                <label>Process Info Query</label>
                <div style="font-size: 13px; color: #cbd5e1;">Fetches current process identifier from active task_struct.</div>
            </div>
        `,
        userAction: 'getpid()',
        kernelAction: 'Reads current->pid from PCB',
        resultAction: 'Returns active process ID'
    },
    getppid: {
        fields: `
            <div class="param-row">
                <label>Process Info Query</label>
                <div style="font-size: 13px; color: #cbd5e1;">Fetches parent process identifier from task_struct hierarchy.</div>
            </div>
        `,
        userAction: 'getppid()',
        kernelAction: 'Reads current->real_parent->tgid',
        resultAction: 'Returns parent process ID'
    },
    mkdir: {
        fields: `
            <div class="param-row">
                <label>New Directory Name</label>
                <input type="text" class="param-input" id="paramDirname" value="os_test_directory">
            </div>
        `,
        userAction: 'mkdir(dirname, 0755)',
        kernelAction: 'Creates directory inode in VFS',
        resultAction: 'Returns 0 on success'
    },
    rmdir: {
        fields: `
            <div class="param-row">
                <label>Directory Name to Remove</label>
                <input type="text" class="param-input" id="paramDirname" value="os_test_directory">
            </div>
        `,
        userAction: 'rmdir(dirname)',
        kernelAction: 'Unlinks directory inode from dentry',
        resultAction: 'Returns 0 on success'
    }
};

// Switch active syscall selection
function selectSyscall(name, el) {
    currentSyscall = name;
    
    document.querySelectorAll('.syscall-item').forEach(item => item.classList.remove('active'));
    if (el) el.classList.add('active');

    document.getElementById('activeCallBadge').innerText = `Call: ${name}()`;
    
    const config = SYSCALL_CONFIGS[name] || SYSCALL_CONFIGS.open;
    document.getElementById('paramContainer').innerHTML = config.fields;

    // Update diagram actions
    document.getElementById('stepUser').innerText = config.userAction;
    document.getElementById('stepKernel').innerText = config.kernelAction;
    document.getElementById('stepResult').innerText = config.resultAction;
}

// Execute selected system call
async function executeSelectedSyscall() {
    const btn = document.getElementById('btnExecuteCall');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Executing System Call...</span>';

    const params = {};
    if (document.getElementById('paramFilename')) params.filename = document.getElementById('paramFilename').value;
    if (document.getElementById('paramMode')) params.mode = document.getElementById('paramMode').value;
    if (document.getElementById('paramContent')) params.content = document.getElementById('paramContent').value;
    if (document.getElementById('paramFd')) params.fd = parseInt(document.getElementById('paramFd').value);
    if (document.getElementById('paramDirname')) params.dirname = document.getElementById('paramDirname').value;

    try {
        const res = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ syscall: currentSyscall, params })
        });
        const data = await res.json();

        // Update telemetry cards
        document.getElementById('resReturnValue').innerText = data.return_value;
        
        const statusEl = document.getElementById('resStatus');
        statusEl.innerText = data.status;
        statusEl.className = 'telemetry-value ' + (data.status === 'SUCCESS' ? 'status-badge-success' : 'status-badge-error');

        document.getElementById('resTime').innerText = data.duration;

        // Update OS Steps Walkthrough
        if (data.os_info && data.os_info.steps) {
            document.getElementById('osStepsList').innerHTML = data.os_info.steps.map(s => 
                `<div class="os-step-item">${s}</div>`
            ).join('');
        }

        // Add to history table
        prependHistoryRow(data.history_entry);

        // Refresh telemetry metrics
        loadSystemStatus();
        loadSyscallStats();

    } catch (e) {
        console.error("Execution failed:", e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>▶ [ Execute System Call ]</span>';
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
        <td>${entry.process}</td>
        <td><strong style="color: var(--primary);">${entry.syscall}</strong></td>
        <td>${entry.params}</td>
        <td>${entry.return_value}</td>
        <td class="${isSuccess ? 'status-ok' : 'status-err'}">${entry.status}</td>
        <td>${entry.duration}</td>
    `;
    tbody.insertBefore(tr, tbody.firstChild);
}

// Load System Status Cards (CPU, Mem, Procs, Syscalls)
async function loadSystemStatus() {
    try {
        const res = await fetch('/api/system_status');
        const data = await res.json();

        document.getElementById('statProcesses').innerText = data.processes;
        document.getElementById('statSyscalls').innerText = Number(data.syscalls).toLocaleString();
        document.getElementById('statCPU').innerText = data.cpu;
        document.getElementById('statMemory').innerText = data.memory;
    } catch (e) {
        console.error("Status load error:", e);
    }
}

// Load History
async function loadHistory() {
    try {
        const res = await fetch('/api/history');
        const list = await res.json();

        const tbody = document.getElementById('historyTableBody');
        tbody.innerHTML = list.map(item => `
            <tr>
                <td>${item.time}</td>
                <td>${item.process}</td>
                <td><strong style="color: var(--primary);">${item.syscall}</strong></td>
                <td>${item.params}</td>
                <td>${item.return_value}</td>
                <td class="${item.status === 'SUCCESS' ? 'status-ok' : 'status-err'}">${item.status}</td>
                <td>${item.duration}</td>
            </tr>
        `).join('');
    } catch (e) {
        console.error("History load error:", e);
    }
}

// Load Running Processes
async function loadProcessList() {
    try {
        const res = await fetch('/api/process_list');
        const procs = await res.json();

        const tbody = document.getElementById('processTableBody');
        tbody.innerHTML = procs.map(p => `
            <tr>
                <td>${p.pid}</td>
                <td><strong style="color: #fff;">${p.name}</strong></td>
                <td><span style="color: var(--warning);">${p.cpu}</span></td>
                <td><span style="color: var(--purple);">${p.memory}</span></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error("Process load error:", e);
    }
}

// Load Frequency Stats Bars
async function loadSyscallStats() {
    try {
        const res = await fetch('/api/syscall_stats');
        const data = await res.json();

        document.getElementById('totalCallsSummary').innerText = Number(data.total).toLocaleString();

        const counts = data.counts || {};
        const maxVal = Math.max(...Object.values(counts), 1);
        const container = document.getElementById('statsBarsContainer');

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
    } catch (e) {
        console.error("Stats load error:", e);
    }
}

// Switch Bottom Tabs
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));

    if (tabId === 'history') {
        document.getElementById('tabBtnHistory').classList.add('active');
        document.getElementById('viewHistory').classList.add('active');
    } else if (tabId === 'process') {
        document.getElementById('tabBtnProcess').classList.add('active');
        document.getElementById('viewProcess').classList.add('active');
        loadProcessList();
    } else if (tabId === 'stats') {
        document.getElementById('tabBtnStats').classList.add('active');
        document.getElementById('viewStats').classList.add('active');
        loadSyscallStats();
    }
}

// Filter history table
function filterActivityTable() {
    const filter = document.getElementById('logSearchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#historyTableBody tr');

    rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(filter) ? '' : 'none';
    });
}

// Export CSV
function exportCSV() {
    window.location.href = '/api/export_csv';
}

// Clear History
async function clearHistoryLogs() {
    if (confirm("Clear all recorded system call activity logs?")) {
        await fetch('/api/clear_history', { method: 'POST' });
        document.getElementById('historyTableBody').innerHTML = '';
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    selectSyscall('open', document.querySelector('.syscall-item[onclick*="open"]'));
    loadSystemStatus();
    loadHistory();
    loadSyscallStats();

    // Periodic telemetry update every 2.5 seconds
    setInterval(loadSystemStatus, 2500);
});
