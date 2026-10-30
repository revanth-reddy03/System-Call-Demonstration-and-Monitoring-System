/**
 * ==============================================================================
 * Project: System Call Monitoring Dashboard
 * Controller: dashboard.js
 * Clean, Simple, Professional OS Dashboard Logic
 * ==============================================================================
 */

let currentSyscall = 'open';
let currentMonitorTab = 'history';

// Configuration definitions for each system call
const SYSCALL_CONFIGS = {
    open: {
        signature: 'int open(const char *pathname, int flags, mode_t mode);',
        userStep: 'open("test.txt", O_RDONLY)',
        kernelStep: 'VFS directory lookup & allocate lowest free fd',
        resultStep: 'Returns File Descriptor (fd = 3)',
        steps: [
            'User application invokes open() with pathname and permission flags.',
            'System call interface triggers CPU software interrupt / syscall instruction.',
            'Virtual File System traverses filesystem dentry cache to locate file inode.',
            'Kernel allocates lowest available index in the Process File Descriptor Table.',
            'Kernel returns integer file descriptor (fd) to the application register (%rax).'
        ],
        formHtml: `
            <div class="param-field">
                <label class="param-label">File Name</label>
                <input type="text" class="param-input" id="inputFilename" value="test.txt" placeholder="e.g. test.txt">
            </div>
            <div class="param-field">
                <label class="param-label">Access Mode</label>
                <select class="param-select" id="inputMode">
                    <option value="r" selected>Read Only (O_RDONLY)</option>
                    <option value="w">Write / Create (O_CREAT | O_WRONLY | O_TRUNC)</option>
                    <option value="a">Append (O_CREAT | O_WRONLY | O_APPEND)</option>
                </select>
                <span class="param-hint">Kernel validates mode permissions against inode DAC attributes.</span>
            </div>
        `
    },
    read: {
        signature: 'ssize_t read(int fd, void *buf, size_t count);',
        userStep: 'read(fd, buffer, 1024)',
        kernelStep: 'Page cache transfer from disk to user memory',
        resultStep: 'Returns total bytes read into buffer',
        steps: [
            'User program passes file descriptor, destination buffer, and max byte count.',
            'Kernel verifies descriptor is valid and open with read access.',
            'Kernel checks page cache blocks; issues block I/O if data not cached.',
            'Data is copied across privilege boundary from kernel space to user buffer.',
            'Returns total bytes transferred (0 indicates EOF).'
        ],
        formHtml: `
            <div class="param-field">
                <label class="param-label">File Name to Read</label>
                <input type="text" class="param-input" id="inputFilename" value="test.txt" placeholder="e.g. test.txt">
                <span class="param-hint">Will retrieve data previously saved in the file by write().</span>
            </div>
        `
    },
    write: {
        signature: 'ssize_t write(int fd, const void *buf, size_t count);',
        userStep: 'write(fd, user_buffer, byte_count)',
        kernelStep: 'Copy user bytes across boundary into page cache',
        resultStep: 'Returns total bytes written to disk',
        steps: [
            'User program supplies file descriptor, data buffer, and byte count.',
            'Kernel validates write permissions on the file descriptor.',
            'Kernel transfers data into page cache buffers; marks pages dirty.',
            'Filesystem updates inode metadata (file size, modification time).',
            'Returns number of bytes successfully accepted by the kernel.'
        ],
        formHtml: `
            <div class="param-field">
                <label class="param-label">File Name</label>
                <input type="text" class="param-input" id="inputFilename" value="test.txt" placeholder="e.g. test.txt">
            </div>
            <div class="param-field">
                <label class="param-label" style="color: var(--primary);">Data to Enter in File (Required)</label>
                <textarea class="param-textarea" id="inputContent" rows="3" placeholder="Enter custom text/data to write into the file..." autofocus></textarea>
                <span class="param-hint" style="color: var(--warning);">* Please type your data here. The write() system call will store this exact data on disk.</span>
            </div>
        `
    },
    close: {
        signature: 'int close(int fd);',
        userStep: 'close(fd)',
        kernelStep: 'Release descriptor index & decrement reference',
        resultStep: 'Returns 0 (Success) or -1 (Error)',
        steps: [
            'User program requests deallocation of integer descriptor handle.',
            'Kernel locates file table pointer corresponding to descriptor index.',
            'Reference count on open file description is decremented.',
            'Index in descriptor table becomes immediately available for future open() calls.',
            'Returns 0 on success, or -1 with errno set on invalid descriptor.'
        ],
        formHtml: `
            <div class="param-field">
                <label class="param-label">File Descriptor to Close</label>
                <input type="number" class="param-input" id="inputFd" value="3" min="0">
                <span class="param-hint">Releases index from Process File Descriptor Table.</span>
            </div>
        `
    },
    fork: {
        signature: 'pid_t fork(void);',
        userStep: 'fork()',
        kernelStep: 'Clone PCB (task_struct) & duplicate address space',
        resultStep: 'Returns 0 to child, Child PID to parent',
        steps: [
            'Parent process invokes fork() system call.',
            'Kernel allocates new Process Control Block (task_struct) for child.',
            'Kernel assigns unique Process Identifier (PID) to child.',
            'Memory pages shared using Copy-On-Write (COW) mechanism.',
            'Returns 0 within child execution context; returns child PID to parent.'
        ],
        formHtml: `
            <div class="param-field">
                <label class="param-label">Process Creation Mechanism</label>
                <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                    Creates a duplicate child process via <strong>Copy-On-Write (COW)</strong>. The child duplicates
                    parent file descriptors, registers, and memory mappings.
                </div>
            </div>
        `
    },
    exec: {
        signature: 'int execvp(const char *file, char *const argv[]);',
        userStep: 'execvp("./child_worker", argv)',
        kernelStep: 'Discard old memory & load new ELF executable',
        resultStep: 'Retains PID; executes child_worker (exit 42)',
        steps: [
            'Process requests replacement of current memory space with new binary.',
            'Kernel releases old text, data, heap, and stack virtual memory segments.',
            'Kernel ELF binary loader reads ./child_worker and maps new segments.',
            'Instruction pointer (%rip) is reset to binary entry point (_start).',
            'Process retains original PID and begins running the new worker image.'
        ],
        formHtml: `
            <div class="param-field">
                <label class="param-label">Binary Executable</label>
                <input type="text" class="param-input" id="inputBinary" value="./child_worker" readonly>
                <span class="param-hint">Executes address space replacement with PID retention.</span>
            </div>
        `
    },
    wait: {
        signature: 'pid_t waitpid(pid_t pid, int *status, int options);',
        userStep: 'waitpid(child_pid, &status, 0)',
        kernelStep: 'Suspend parent & reap terminated child PCB',
        resultStep: 'Returns child exit status code (42)',
        steps: [
            'Parent invokes waitpid() to block until child changes execution state.',
            'Parent transitions to TASK_INTERRUPTIBLE until SIGCHLD arrives.',
            'When child exits, kernel collects child exit code into status pointer.',
            'Kernel destroys remaining child PCB entry, preventing zombie (&lt;defunct&gt;) process.',
            'Parent execution resumes cleanly.'
        ],
        formHtml: `
            <div class="param-field">
                <label class="param-label">Process Synchronization</label>
                <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                    Parent blocks until child process terminates, reaps zombie status, and extracts exit code.
                </div>
            </div>
        `
    },
    getpid: {
        signature: 'pid_t getpid(void);',
        userStep: 'getpid()',
        kernelStep: 'Read current->pid from active task_struct',
        resultStep: 'Returns active Process ID in %rax',
        steps: [
            'User space application calls getpid().',
            'CPU traps to kernel mode.',
            'Kernel inspects current active task_struct->pid in O(1) time.',
            'Value placed into %rax register and returned to user space.'
        ],
        formHtml: `
            <div class="param-field">
                <label class="param-label">Process ID Query</label>
                <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                    Fetches the Process ID (PID) of the calling process directly from the kernel task_struct.
                </div>
            </div>
        `
    },
    getppid: {
        signature: 'pid_t getppid(void);',
        userStep: 'getppid()',
        kernelStep: 'Traverse current->real_parent in task tree',
        resultStep: 'Returns Parent Process ID in %rax',
        steps: [
            'User space application calls getppid().',
            'Kernel traverses task hierarchy pointer current->real_parent->tgid.',
            'Extracts parent process identifier.',
            'Returns parent PID to user application.'
        ],
        formHtml: `
            <div class="param-field">
                <label class="param-label">Parent Process ID Query</label>
                <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                    Fetches the Parent Process ID (PPID) of the calling process by traversing the process tree.
                </div>
            </div>
        `
    },
    mkdir: {
        signature: 'int mkdir(const char *pathname, mode_t mode);',
        userStep: 'mkdir("os_test_directory", 0755)',
        kernelStep: 'Allocate directory inode & create dentries in VFS',
        resultStep: 'Returns 0 (Success) or -1 (Error)',
        steps: [
            'User space requests directory creation with permission mode (0755).',
            'Kernel checks parent directory permissions (W_OK).',
            'Allocates new directory inode on filesystem blocks.',
            'Creates "." (self) and ".." (parent) directory entries.',
            'Returns 0 on success or negative errno code.'
        ],
        formHtml: `
            <div class="param-field">
                <label class="param-label">Directory Name</label>
                <input type="text" class="param-input" id="inputDirname" value="os_test_directory" placeholder="e.g. os_test_directory">
            </div>
        `
    },
    rmdir: {
        signature: 'int rmdir(const char *pathname);',
        userStep: 'rmdir("os_test_directory")',
        kernelStep: 'Verify directory is empty & unlink inode',
        resultStep: 'Returns 0 (Success) or -1 (Error)',
        steps: [
            'User space requests directory removal.',
            'Kernel checks that target directory is completely empty.',
            'Unlinks directory entry from parent dentry tree.',
            'Decrements link count and frees allocated inode.',
            'Returns 0 on success or -ENOTEMPTY if files exist.'
        ],
        formHtml: `
            <div class="param-field">
                <label class="param-label">Directory Name to Remove</label>
                <input type="text" class="param-input" id="inputDirname" value="os_test_directory" placeholder="e.g. os_test_directory">
            </div>
        `
    }
};

// Switch selected system call
function selectSyscall(name, el) {
    currentSyscall = name;

    // Update left list selection visual state
    document.querySelectorAll('.syscall-item').forEach(item => {
        item.classList.remove('active');
        const circle = item.querySelector('.radio-circle');
        if (circle) circle.textContent = '○';
    });

    if (el) {
        el.classList.add('active');
        const activeCircle = el.querySelector('.radio-circle');
        if (activeCircle) activeCircle.textContent = '●';
    }

    const config = SYSCALL_CONFIGS[name] || SYSCALL_CONFIGS.open;

    // Update details pane headers
    document.getElementById('detailCallName').textContent = `${name}()`;
    document.getElementById('detailCallSignature').textContent = config.signature;
    document.getElementById('paramFormContainer').innerHTML = config.formHtml;

    // Update OS flow diagram
    document.getElementById('osFlowUser').textContent = config.userStep;
    document.getElementById('osFlowKernel').textContent = config.kernelStep;
    document.getElementById('osFlowResult').textContent = config.resultStep;

    // Update step-by-step lines
    const stepsBox = document.getElementById('osStepsBox');
    if (stepsBox) {
        stepsBox.innerHTML = config.steps.map(s => `<div class="step-line">• ${s}</div>`).join('');
    }

    // Hide file preview box
    document.getElementById('fileReadPreview').style.display = 'none';

    // Focus input if any
    const firstInput = document.querySelector('#paramFormContainer input:not([readonly]), #paramFormContainer textarea');
    if (firstInput) firstInput.focus();
}

// Execute selected system call
async function executeCurrentSyscall() {
    const btn = document.getElementById('btnExecuteCall');
    const params = {};

    const filenameEl = document.getElementById('inputFilename');
    if (filenameEl) params.filename = filenameEl.value.trim() || 'test.txt';

    const modeEl = document.getElementById('inputMode');
    if (modeEl) params.mode = modeEl.value;

    const fdEl = document.getElementById('inputFd');
    if (fdEl) params.fd = parseInt(fdEl.value, 10);

    const dirnameEl = document.getElementById('inputDirname');
    if (dirnameEl) params.dirname = dirnameEl.value.trim() || 'os_test_directory';

    // Explicit validation: Require user data entry for write()
    if (currentSyscall === 'write') {
        const contentEl = document.getElementById('inputContent');
        const contentVal = contentEl ? contentEl.value.trim() : '';
        if (!contentVal) {
            alert('⚠️ Please enter the data you want to write into the file!');
            if (contentEl) {
                contentEl.focus();
                contentEl.style.borderColor = 'var(--danger)';
            }
            return;
        }
        params.content = contentVal;
    } else if (document.getElementById('inputContent')) {
        params.content = document.getElementById('inputContent').value;
    }

    btn.disabled = true;
    btn.textContent = 'Executing System Call...';

    try {
        const res = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ syscall: currentSyscall, params })
        });
        const data = await res.json();

        // Update telemetry numbers
        document.getElementById('resReturnValue').textContent = data.return_value;

        const statusEl = document.getElementById('resStatus');
        statusEl.textContent = data.status;
        statusEl.className = 'telemetry-val font-mono ' + 
            (data.status === 'SUCCESS' ? 'status-success' : 'status-error');

        document.getElementById('resTime').textContent = data.duration;

        // Update result node in diagram
        document.getElementById('osFlowResult').textContent = `Return: ${data.return_value} (${data.status})`;

        // Update steps list if returned from backend
        if (data.os_info && data.os_info.steps) {
            document.getElementById('osStepsBox').innerHTML = 
                data.os_info.steps.map(s => `<div class="step-line">• ${s}</div>`).join('');
        }

        // Display read file data preview if available
        const readPreview = document.getElementById('fileReadPreview');
        const readContent = document.getElementById('fileReadContent');
        if (currentSyscall === 'read' && data.data) {
            readContent.textContent = data.data;
            readPreview.style.display = 'block';
        } else {
            readPreview.style.display = 'none';
        }

        // Prepend to Call History table
        prependHistoryRow(data.history_entry);

        // Refresh status and stats
        loadSystemStatus();
        if (currentMonitorTab === 'stats') {
            loadSyscallStats();
        }

    } catch (e) {
        console.error('Execution error:', e);
        alert('Execution failed: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '[ Execute System Call ]';
    }
}

// Prepend row to Call History table
function prependHistoryRow(entry) {
    if (!entry) return;
    const tbody = document.getElementById('tbodyHistory');
    const isSuccess = entry.status === 'SUCCESS';

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${escapeHtml(entry.time)}</td>
        <td><span style="color: #cbd5e1;">${escapeHtml(entry.process)}</span></td>
        <td><strong style="color: var(--primary);">${escapeHtml(entry.syscall)}</strong></td>
        <td><span style="color: var(--text-secondary);">${escapeHtml(entry.params)}</span></td>
        <td><span style="color: var(--primary);">${escapeHtml(entry.return_value)}</span></td>
        <td class="${isSuccess ? 'status-cell-ok' : 'status-cell-err'}">${escapeHtml(entry.status)}</td>
        <td style="color: var(--warning);">${escapeHtml(entry.duration)}</td>
    `;
    tbody.insertBefore(tr, tbody.firstChild);
}

// Load System Status (Processes, Syscalls, CPU, RAM)
async function loadSystemStatus() {
    try {
        const res = await fetch('/api/system_status');
        const data = await res.json();

        document.getElementById('statProcesses').textContent = data.processes;
        document.getElementById('statSyscalls').textContent = Number(data.syscalls).toLocaleString();
        document.getElementById('statCPU').textContent = data.cpu;
        document.getElementById('statMemory').textContent = data.memory;
    } catch (e) {
        console.error('Status fetch error:', e);
    }
}

// Load Call History
async function loadHistory() {
    try {
        const res = await fetch('/api/history');
        const list = await res.json();

        const tbody = document.getElementById('tbodyHistory');
        tbody.innerHTML = list.map(item => `
            <tr>
                <td>${escapeHtml(item.time)}</td>
                <td><span style="color: #cbd5e1;">${escapeHtml(item.process)}</span></td>
                <td><strong style="color: var(--primary);">${escapeHtml(item.syscall)}</strong></td>
                <td><span style="color: var(--text-secondary);">${escapeHtml(item.params)}</span></td>
                <td><span style="color: var(--primary);">${escapeHtml(item.return_value)}</span></td>
                <td class="${item.status === 'SUCCESS' ? 'status-cell-ok' : 'status-cell-err'}">${escapeHtml(item.status)}</td>
                <td style="color: var(--warning);">${escapeHtml(item.duration)}</td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('History fetch error:', e);
    }
}

// Load Running Processes List
async function loadProcessList() {
    try {
        const res = await fetch('/api/process_list');
        const procs = await res.json();

        const tbody = document.getElementById('tbodyProcess');
        tbody.innerHTML = procs.map(p => `
            <tr>
                <td><span class="font-mono" style="color: var(--primary);">${p.pid}</span></td>
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td><span style="color: var(--warning);">${p.cpu}</span></td>
                <td><span style="color: var(--purple);">${p.memory}</span></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Process list error:', e);
    }
}

// Load Syscall Frequency Statistics
async function loadSyscallStats() {
    try {
        const res = await fetch('/api/syscall_stats');
        const data = await res.json();

        document.getElementById('statsTotalCount').textContent = Number(data.total).toLocaleString();

        const counts = data.counts || {};
        const maxVal = Math.max(...Object.values(counts), 1);
        const container = document.getElementById('statsBarsContainer');

        container.innerHTML = Object.entries(counts).map(([name, count]) => {
            const pct = Math.round((count / maxVal) * 100);
            return `
                <div class="stat-bar-row">
                    <div class="stat-bar-name">${name}()</div>
                    <div class="stat-bar-track">
                        <div class="stat-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                    <div class="stat-bar-count">${count}</div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Stats fetch error:', e);
    }
}

// Switch Bottom Tabs
function switchMonitorTab(tabKey) {
    currentMonitorTab = tabKey;

    // Toggle button active state
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.monitor-tab-content').forEach(c => c.classList.remove('active'));

    if (tabKey === 'history') {
        document.getElementById('tabBtnHistory').classList.add('active');
        document.getElementById('tabContentHistory').classList.add('active');
    } else if (tabKey === 'process') {
        document.getElementById('tabBtnProcess').classList.add('active');
        document.getElementById('tabContentProcess').classList.add('active');
        loadProcessList();
    } else if (tabKey === 'stats') {
        document.getElementById('tabBtnStats').classList.add('active');
        document.getElementById('tabContentStats').classList.add('active');
        loadSyscallStats();
    }
}

// Filter history table
function filterHistoryTable() {
    const q = document.getElementById('filterInput').value.toLowerCase();
    const rows = document.querySelectorAll('#tbodyHistory tr');

    rows.forEach(r => {
        const text = r.textContent.toLowerCase();
        r.style.display = text.includes(q) ? '' : 'none';
    });
}

// Export CSV
function exportCSV() {
    window.location.href = '/api/export_csv';
}

// Clear Activity Logs
async function clearActivityLogs() {
    if (confirm('Clear all recorded system call activity logs?')) {
        await fetch('/api/clear_history', { method: 'POST' });
        document.getElementById('tbodyHistory').innerHTML = '';
        loadSyscallStats();
    }
}

// Escape HTML helper
function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Select open() by default matching user wireframe
    selectSyscall('open', document.querySelector('.syscall-item'));

    loadSystemStatus();
    loadHistory();

    // Auto-update system metrics every 2.5 seconds
    setInterval(loadSystemStatus, 2500);
});
