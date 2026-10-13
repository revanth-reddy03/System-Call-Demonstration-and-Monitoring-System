# System Call Monitoring and Execution System

[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Ubuntu%20%7C%20WSL2-blue.svg)](https://ubuntu.com)
[![Language](https://img.shields.io/badge/Language-C%20%28C99%20%2F%20POSIX%29-brightgreen.svg)](https://en.wikipedia.org/wiki/C_(programming_language))
[![Compiler](https://img.shields.io/badge/Compiler-GCC%2014.2%2B-orange.svg)](https://gcc.gnu.org)
[![Dashboard](https://img.shields.io/badge/Web%20Dashboard-Flask%20%2B%20Chart.js-blueviolet.svg)](http://localhost:5000)
[![Tests](https://img.shields.io/badge/Test%20Suite-12%2F12%20Passed-success.svg)](./tests/test_runner.sh)

An interactive, university-grade operating systems monitoring and execution system developed for **Operating Systems and Systems Programming (25CS2104E)**. This system allows users to execute individual POSIX system calls, inspect exact parameters, return values, and execution times, observe the transition between User Space (Ring 3) and Kernel Space (Ring 0), monitor real-time running processes and CPU/memory load, and trace kernel traps using `strace`.

---

## Team Details

- **Course**: Operating Systems and Systems Programming (`25CS2104E`)
- **Term**: 2026–27, Term-I
- **Section**: 03 | **Team**: 18
- **Faculty Guide**: Dr. K. Hema

| Roll Number | Student Name | Assigned Responsibility |
| :--- | :--- | :--- |
| **2520030423** | **Akhil AD** | File Operations Module (`open`, `read`, `write`, `close`, `mkdir`, `rmdir`), File Descriptor tracking, and return value error checking. |
| **2520030424** | **Revanth Reddy** | Process Management Module (`fork`, `execvp`, `waitpid`, `getpid`, `getppid`), Process Synchronization, and CLI architecture. |
| **2520039623** | **Advik** | `strace` monitoring engine, Web Monitoring Dashboard, Process Monitoring integration, and automated test suite. |

---

## System Architecture & Layout

```
┌─────────────────────────────────────────────────────────────┐
│    SYS_CALL // KERNEL MONITORING & EXECUTION DASHBOARD      │
├─────────────────────────────────────────────────────────────┤
│  System Status                                [Live Sync]   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Processes│ │ Syscalls │ │ CPU      │ │ Memory       │   │
│  │    42    │ │   1,284  │ │  14.7 %  │ │   8.4 GB     │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
├───────────────────────┬─────────────────────────────────────┤
│ SYSTEM CALL           │ SYSTEM CALL DETAILS                 │
│ [All][Proc][File][Dir]│ Signature: int open(...)            │
│                       │ Parameters: test.txt (mode: w)      │
│ ○ fork()              │ Return Value: 3           [%rax]    │
│ ○ exec()              │ Status: SUCCESS           [errno]   │
│ ○ open()              │ Duration: 0.42 ms                   │
│ ○ read()              │ [ Execute System Call ] (Ctrl+Enter)│
│ ○ write()             │ ─────────────────────────────────── │
│ ○ close()             │ What Happens Inside the OS:         │
│ ○ wait()              │ Ring 3 -> Syscall Trap -> Ring 0    │
│ ○ getpid() / getppid()│ [📥 Content Read Back from File]    │
│ ○ mkdir() / rmdir()   │                                     │
├───────────────────────┴─────────────────────────────────────┤
│              SYSTEM CALL ACTIVITY / MONITOR                 │
│ Time       Process       System Call    Status    Duration  │
│ 10:42:01   syscall_run   open()         SUCCESS   0.42 ms   │
│ 10:42:02   syscall_run   write()        SUCCESS   0.51 ms   │
│ 10:42:03   syscall_run   read()         SUCCESS   0.31 ms   │
│ 10:42:04   syscall_run   close()        SUCCESS   0.12 ms   │
├─────────────────────────────────────────────────────────────┤
│ [Process Monitor] [Call History] [Charts & Stats] [Terminal]│
│ [Export CSV] [Export JSON] [Clear Logs]                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Implemented System Calls

| Category | System Calls | Action & Operating System Mechanism |
| :--- | :--- | :--- |
| **Process Control** | `fork()` | Clones calling process via Copy-On-Write (COW), allocates new `task_struct`. |
| **Process Control** | `exec()` / `execvp()` | Replaces process address space with new binary (`./child_worker`), retaining original PID. |
| **Process Control** | `wait()` / `waitpid()` | Suspends parent process, collects child exit status (`42`), and prevents zombie processes. |
| **Process Info** | `getpid()`, `getppid()` | Queries current PID and parent PID from active kernel `task_struct`. |
| **File Management** | `open()` | Resolves path via VFS dentry cache, assigns lowest available File Descriptor (fd=3). |
| **File Management** | `read()` | Copies data from kernel page cache into user-space memory buffer. |
| **File Management** | `write()` | Transfers user-space memory bytes into kernel page cache blocks on disk. |
| **File Management** | `close()` | Decrements open file description reference count and reclaims file descriptor index. |
| **Directory Operations** | `mkdir()`, `rmdir()` | Creates or unlinks directory inodes in the filesystem hierarchy. |

---

## Directory Structure

```
.
├── include/
│   ├── common.h         # Headers, ANSI styling, high-resolution timers
│   ├── file_ops.h       # Function prototypes for file & directory operations
│   ├── process_ops.h    # Function prototypes for process lifecycle & queries
│   └── error_ops.h      # Function prototypes for error handling & errno
├── src/
│   ├── main.c           # Main CLI coordinator and individual call dispatcher
│   ├── file_ops.c       # Implementation of open, write, read, close, mkdir, rmdir
│   ├── process_ops.c    # Implementation of fork, execvp, waitpid, getpid, getppid
│   ├── error_ops.c      # Deliberate fault injection & errno validation
│   └── child_worker.c   # Target binary executed via execvp()
├── templates/
│   └── index.html       # Web Dashboard template
├── static/
│   ├── css/style.css    # Modern dark dashboard styling
│   └── js/dashboard.js  # Real-time dashboard controller
├── scripts/
│   ├── run_trace.sh     # Strace profiling script
│   └── analyze_trace.py # Parser & automated report generator
├── tests/
│   └── test_runner.sh   # 12-test automated validation suite
├── docs/
│   └── PROJECT_REPORT.md # Comprehensive university-grade project report
├── traces/              # Generated strace output logs (.log)
├── app.py               # Flask backend with psutil process & telemetry monitoring
├── Makefile             # Clean build and execution recipes
└── README.md            # Project documentation
```

---

## Getting Started

### Prerequisites
- **Operating System**: Linux (Ubuntu 22.04 / 24.04 recommended) or Windows Subsystem for Linux (WSL2).
- **Packages**: `gcc`, `make`, `strace`, `python3`.

On Ubuntu / WSL:
```bash
sudo apt update
sudo apt install -y build-essential gcc make strace python3 python3-pip
```

---

## Launching the Web Dashboard (Recommended for Presentation)

Launch the interactive monitoring dashboard:

```bash
python app.py
# or via Makefile
make app
```

Open your browser and navigate to:  
👉 **`http://localhost:5000`**

### What You Can Do in the Dashboard:
1. **Live System Status & Sparklines**: Real-time CPU load %, RAM usage in GB, and running process counts via `psutil`.
2. **Execute System Calls on Demand**: Select any system call from the left menu (`open`, `read`, `write`, `fork`, `getpid`, etc.), customize parameters, and click **[ Execute System Call ]** (or press **`Ctrl + Enter`**).
3. **Interactive File Lifecycle**: Use the top bar action or `write()` to enter custom data. The system writes your exact text into the kernel and displays the retrieved data upon `read()`.
4. **Kernel Telemetry**: Observe exact Return Value (`%rax`), Status (`SUCCESS` / `ERROR`), and microsecond Execution Time.
5. **Operating System Transition Flow**: Step-by-step transition diagram showing CPU privilege elevation from User Space (Ring 3) to Kernel Space (Ring 0).
6. **Live Process Monitor**: Inspect active Linux processes, PIDs, names, CPU %, and memory allocations auto-synced every 2.5s.
7. **Chart.js Dynamic Analytics**: Interactive Doughnut chart for syscall frequency distribution and live dual-axis line graph for CPU & Memory load.
8. **Embedded Linux Terminal**: Real-time console window streaming raw stdout and strace logs.
9. **Export Ledger**: Download telemetry logs via **[ Export CSV ]** or **[ Export JSON ]**.

---

## CLI Execution & Automated Testing

You can also run all system call operations directly from the terminal:

### 1. Build Binaries
```bash
make clean && make all
```

### 2. Run Automated Test Suite (12/12)
```bash
make test
```

### 3. Interactive Terminal Menu
```bash
make run
# or
./syscall_runner
```

### 4. Trigger Individual System Calls via CLI
```bash
./syscall_runner --open test.txt w
./syscall_runner --write test.txt "Writing test string"
./syscall_runner --read test.txt
./syscall_runner --close 3
./syscall_runner --fork
./syscall_runner --getpid
./syscall_runner --mkdir my_dir
./syscall_runner --rmdir my_dir
```

### 5. Kernel Monitoring with `strace`
```bash
make trace     # Capture full, filtered, and summary strace logs
make analyze   # Parse strace logs into markdown report
```

---

## License & Acknowledgments

Developed for Course **25CS2104E: Operating Systems and Systems Programming**, Term-I, 2026–27.  
Guided by **Dr. K. Hema**, KL University.
