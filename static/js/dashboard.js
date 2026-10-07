/**
 * System Call Demonstration & Monitoring System
 * Dashboard Frontend Controller
 */

let freqChart = null;
let timeChart = null;

// ANSI to HTML color converter
function ansiToHtml(text) {
    if (!text) return "";
    let clean = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const ansiMap = {
        '\\033\\[1;31m': '<span style="color: #ff5252; font-weight: bold;">',
        '\\033\\[1;32m': '<span style="color: #00e676; font-weight: bold;">',
        '\\033\\[1;33m': '<span style="color: #ffb300; font-weight: bold;">',
        '\\033\\[1;34m': '<span style="color: #40a9ff; font-weight: bold;">',
        '\\033\\[1;35m': '<span style="color: #d946ef; font-weight: bold;">',
        '\\033\\[1;36m': '<span style="color: #00d2ff; font-weight: bold;">',
        '\\033\\[1;37m': '<span style="color: #ffffff; font-weight: bold;">',
        '\\033\\[1m': '<span style="font-weight: bold;">',
        '\\033\\[2m': '<span style="opacity: 0.6;">',
        '\\033\\[0m': '</span>'
    };

    for (let key in ansiMap) {
        clean = clean.replace(new RegExp(key, 'g'), ansiMap[key]);
    }
    return clean;
}

// Log message to terminal console
function logToTerminal(message, isCommand = false) {
    const terminal = document.getElementById("terminalOutput");
    const timestamp = new Date().toLocaleTimeString();
    
    if (isCommand) {
        terminal.innerHTML += `\n<span style="color: #00d2ff; font-weight: bold;">[${timestamp}] $ ${message}</span>\n`;
    } else {
        terminal.innerHTML += ansiToHtml(message);
    }
    terminal.scrollTop = terminal.scrollHeight;
}

function clearTerminal() {
    document.getElementById("terminalOutput").innerHTML = 
        '<span style="color: #64748b;">Terminal initialized. Select an action above to execute.</span>\n';
}

// Execute backend action
async function runAction(action) {
    const statusText = document.getElementById("systemStatusText");
    statusText.innerText = `Executing ${action.toUpperCase()}...`;
    
    logToTerminal(`make ${action}`, true);

    try {
        const response = await fetch(`/api/run/${action}`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.output) {
            logToTerminal(data.output);
        }

        if (data.success) {
            statusText.innerText = "System Idle (Ready)";
        } else {
            statusText.innerText = `Failed (Exit Code ${data.return_code})`;
        }

        // Animate visual widgets based on action
        updateInteractiveWidgets(action);

        // Fetch fresh traces if profiling actions were run
        if (['batch', 'trace', 'analyze', 'test'].includes(action)) {
            loadTraces();
        }

    } catch (err) {
        logToTerminal(`[ERROR] Network error: ${err.message}`);
        statusText.innerText = "Error";
    }
}

// Animate visualizers based on the executed module
function updateInteractiveWidgets(action) {
    const fd3 = document.getElementById("fd3");
    const flowFork = document.getElementById("flowFork");
    const flowExec = document.getElementById("flowExec");
    const flowWait = document.getElementById("flowWait");

    if (action === 'file' || action === 'batch') {
        fd3.classList.add("active");
        document.getElementById("fd3State").innerText = "Active (0644)";
    } else if (action === 'clean') {
        fd3.classList.remove("active");
        document.getElementById("fd3State").innerText = "Closed / Unassigned";
    }

    if (action === 'process' || action === 'batch') {
        flowFork.style.borderColor = "var(--primary)";
        flowExec.style.borderColor = "var(--purple)";
        flowWait.style.borderColor = "var(--success)";
    }
}

// Load and render trace data for charts and tables
async function loadTraces() {
    try {
        const res = await fetch('/api/traces');
        const data = await res.json();

        const calls = data.summary.calls || [];
        updateCharts(calls);
        updateSyscallTable(data.events || []);
        updateErrorTable(data.errors || []);

    } catch (e) {
        console.error("Failed to load traces:", e);
    }
}

// Render Chart.js Analytics
function updateCharts(calls) {
    if (!calls || calls.length === 0) return;

    const topCalls = calls.slice(0, 7);
    const labels = topCalls.map(c => c.syscall);
    const callCounts = topCalls.map(c => c.calls);
    const times = topCalls.map(c => c.percent_time);

    const colors = [
        '#00d2ff', '#9d4edd', '#00e676', '#ffb300', 
        '#ff5252', '#3a86ff', '#8338ec'
    ];

    // Donut Chart: Syscall Frequencies
    const ctxFreq = document.getElementById('chartSyscallFreq').getContext('2d');
    if (freqChart) freqChart.destroy();
    freqChart = new Chart(ctxFreq, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: callCounts,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 } } }
            }
        }
    });

    // Bar Chart: Kernel CPU Time %
    const ctxTime = document.getElementById('chartSyscallTime').getContext('2d');
    if (timeChart) timeChart.destroy();
    timeChart = new Chart(ctxTime, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '% CPU Time in Kernel',
                data: times,
                backgroundColor: 'rgba(0, 210, 255, 0.75)',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

// Populate Syscall Events Table
function updateSyscallTable(events) {
    const tbody = document.getElementById('syscallTableBody');
    if (!events || events.length === 0) return;

    tbody.innerHTML = events.slice(0, 15).map(e => `
        <tr>
            <td><code style="color: #94a3b8;">${e.pid}</code></td>
            <td><strong style="color: #00d2ff;">${e.name}</strong></td>
            <td><code style="font-size: 11px; color: #cbd5e1;">${e.args}</code></td>
            <td>
                ${e.is_error ? 
                    `<span class="badge-err">${e.ret} ${e.error_name}</span>` : 
                    `<span class="badge-ok">${e.ret}</span>`}
            </td>
        </tr>
    `).join('');
}

// Populate Errors Audit Table
function updateErrorTable(errors) {
    const tbody = document.getElementById('errorTableBody');
    if (!errors || errors.length === 0) return;

    tbody.innerHTML = errors.map(err => `
        <tr>
            <td><code>${err.pid}</code></td>
            <td><strong style="color: #ffb300;">${err.name}</strong></td>
            <td><span class="badge-err">${err.error_name || 'ERROR'}</span></td>
            <td><code>${err.args}</code></td>
        </tr>
    `).join('');
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    loadTraces();
});
