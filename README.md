# System Call Demonstration and Monitoring System

[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Ubuntu%20%7C%20WSL2-blue.svg)](https://ubuntu.com)
[![Language](https://img.shields.io/badge/Language-C%20%28C99%20%2F%20POSIX%29-brightgreen.svg)](https://en.wikipedia.org/wiki/C_(programming_language))
[![Compiler](https://img.shields.io/badge/Compiler-GCC%2014.2%2B-orange.svg)](https://gcc.gnu.org)
[![Tools](https://img.shields.io/badge/Tools-strace%20%7C%20Make%20%7C%20Python3-red.svg)](https://strace.io)
[![Tests](https://img.shields.io/badge/Test%20Suite-12%2F12%20Passed-success.svg)](./tests/test_runner.sh)

A modular, educational systems programming project developed for **Operating Systems and Systems Programming (25CS2104E)**. This project demonstrates how user-space applications request services from the Linux kernel, tracking file descriptors, process lifecycle, address space replacement, error handling with `errno`, and empirical system-call profiling using `strace`.

---

## Team Details

- **Course**: Operating Systems and Systems Programming (`25CS2104E`)
- **Term**: 2026–27, Term-I
- **Section**: 03 | **Team**: 18
- **Faculty Guide**: Dr. K. Hema

| Roll Number | Student Name | Assigned Responsibility |
| :--- | :--- | :--- |
| **2520030423** | **Akhil AD** | File Operations Module (`open`, `read`, `write`, `close`), File Descriptor tracking, and return value error checking. |
| **2520030424** | **Revanth Reddy** | Process Management Module (`fork`, `execvp`, `waitpid`), Process Synchronization, and CLI architecture. |
| **2520039623** | **Advik** | `strace` monitoring scripts, Trace Analysis Engine, Error Handling demonstration (`errno`, `perror`), and Test Suite. |

---

## Key Features

1. **Direct POSIX System Call Usage**: Bypasses buffered C standard library wrappers (`fopen`, `fwrite`) to interact directly with the Linux kernel via `open()`, `read()`, `write()`, and `close()`.
2. **Process Management & Image Replacement**:
   - `fork()` to create a child process via Copy-On-Write (COW).
   - `execvp()` to discard child memory space and load a dedicated binary (`child_worker`).
   - `waitpid()` to block the parent, retrieve exit codes via `WEXITSTATUS`, and prevent zombie processes.
3. **Deliberate Fault Injection & `errno` Diagnostics**:
   - Demonstrates how the kernel returns negative error codes in the `%rax` register.
   - Tests and diagnoses `ENOENT` (file not found), `EBADF` (bad file descriptor), and failed program execution using `errno`, `perror()`, and `strerror()`.
4. **Kernel-Level Tracing with `strace`**:
   - Generates full trace logs, filtered logs, and statistical execution summaries (`strace -c`).
5. **Trace Analysis Engine (`scripts/analyze_trace.py`)**:
   - Python log parser that parses captured syscalls, categorizes them by OS domain, and outputs structured Markdown reports.
6. **12-Stage Automated Test Suite**:
   - Verifies compilation, binary execution, flags, file creation, and output validity.

---

## Directory Structure

```
.
├── include/
│   ├── common.h         # Common headers, ANSI styling, logging macros
│   ├── file_ops.h       # Function prototypes for file operations
│   ├── process_ops.h    # Function prototypes for process management
│   └── error_demo.h     # Function prototypes for error handling & errno
├── src/
│   ├── main.c           # CLI coordinator with menu and batch modes
│   ├── file_ops.c       # Implementation of open, write, read, close
│   ├── process_ops.c    # Implementation of fork, execvp, waitpid
│   ├── error_demo.c     # Deliberate error triggers & errno validation
│   └── child_worker.c   # Target binary executed via execvp()
├── scripts/
│   ├── run_trace.sh     # Shell script to orchestrate strace profiling
│   └── analyze_trace.py # Parser & automated report generator
├── tests/
│   └── test_runner.sh   # 12-test automated validation suite
├── docs/
│   └── PROJECT_REPORT.md # Comprehensive university-grade project report
├── traces/              # Generated strace output logs (.log)
├── Makefile             # Clean build and execution recipes
├── OSSP_System_Call_Demonstration_Team_18.docx # Submission form
└── README.md            # Project documentation
```

---

## Getting Started

### Prerequisites
- **Operating System**: Linux (Ubuntu 22.04 / 24.04 recommended) or Windows Subsystem for Linux (WSL2).
- **Packages**: `gcc`, `make`, `strace`, `python3`.

On Ubuntu / Debian / WSL:
```bash
sudo apt update
sudo apt install -y build-essential gcc make strace python3
```

---

## Compilation & Build

To compile the project with standard flags (`-Wall -Wextra -O2 -pedantic`):

```bash
make clean
make all
```

This generates two executable binaries:
- `sys_call_demo`: The main demonstration coordinator.
- `child_worker`: The standalone program executed by the child process via `execvp()`.

---

## Usage Guide

### 1. Interactive Menu
Launch the interactive CLI menu:
```bash
make run
# or
./sys_call_demo
```

```
================== Interactive Demonstration Menu ==================
  1. Run Full Demonstration (All Modules)
  2. Module 1: File Operations (open, write, read, close)
  3. Module 2: Process Management (fork, execvp, waitpid)
  4. Module 3: Error Handling & errno (ENOENT, EBADF)
  5. Clean Temporary Demonstration Files
  6. Exit Program
====================================================================
```

### 2. Automated Batch Mode
Run all modules sequentially without interactive prompts:
```bash
make run-batch
# or
./sys_call_demo --batch
```

### 3. Individual CLI Module Flags
```bash
./sys_call_demo --file      # File operations only
./sys_call_demo --process   # Process management only
./sys_call_demo --error     # Error handling demo only
./sys_call_demo --help      # Show options
```

---

## System Call Tracing with `strace`

To execute the application under `strace` and inspect the kernel boundary:

```bash
make trace
```

This runs `scripts/run_trace.sh` and generates three log files in `traces/`:
1. `traces/trace_all.log`: Comprehensive trace of all system calls across all threads/forks.
2. `traces/trace_filtered.log`: Filtered log targeting `openat,read,write,close,clone,fork,execve,wait4,exit_group`.
3. `traces/trace_summary.log`: Statistical profiling table reporting time, call count, and errors per syscall.

### Syscall Trace Analysis Engine
To parse the trace logs and generate an automated Markdown report (`trace_report.md`):

```bash
make analyze
```

---

## Running the Automated Test Suite

To run all 12 validation tests:

```bash
make test
```

Sample output:
```
======================================================================
         AUTOMATED TEST SUITE: SYSTEM CALL DEMONSTRATION
======================================================================

  [TEST] Clean build via make clean && make all ... PASSED
  [TEST] Verify binary existence (sys_call_demo & child_worker) ... PASSED
  [TEST] Test command line help flag (--help) ... PASSED
  [TEST] Test File Operations Module (--file) ... PASSED
  [TEST] Verify created demonstration file (sys_demo_testfile.txt) ... PASSED
  [TEST] Test Process Management Module (--process) ... PASSED
  [TEST] Test Error Handling & errno Module (--error) ... PASSED
  [TEST] Test Full Batch Execution Mode (--batch) ... PASSED
  [TEST] Test Tracing Script Execution (scripts/run_trace.sh) ... PASSED
  [TEST] Verify generated trace files (all, filtered, summary) ... PASSED
  [TEST] Test Trace Analyzer (scripts/analyze_trace.py) ... PASSED
  [TEST] Verify generated Markdown report (trace_report.md) ... PASSED

----------------------------------------------------------------------
Test Results Summary: 12 Passed, 0 Failed
======================================================================
```

---

## Linux System Calls & OS Concepts Mapping

| System Call | Subsystem | Description & Academic Significance |
| :--- | :--- | :--- |
| `open()` / `openat()` | Virtual File System (VFS) | Allocates lowest integer in process file descriptor table (fd 3). |
| `write()` | File I/O & Page Cache | Transfers user memory bytes across user/kernel boundary into kernel buffer cache. |
| `read()` | File I/O & Inode Lookup | Copies data from kernel page cache into user-space buffer. |
| `close()` | VFS Resource Mgmt | Flushes buffers, decrements open file table reference, and frees fd. |
| `fork()` / `clone()` | Process Control | Clones parent `task_struct`, creates address space using Copy-On-Write (COW). |
| `execvp()` / `execve()` | ELF Loader & Virtual Memory | Discards existing process address space and loads new program binary. |
| `waitpid()` / `wait4()` | Process Synchronization | Suspends parent until child terminates, retrieves exit code, prevents zombies. |
| `errno` / `perror()` | Error Diagnostics | Translates negative kernel return registers into human-readable error messages. |
| `strace` | Kernel Monitoring | Traces software interrupts and system call trap transitions in real time. |

---

## License & Acknowledgments

Developed as part of the academic curriculum for Course **25CS2104E: Operating Systems and Systems Programming**, Term-I, 2026–27.
Under the guidance of **Dr. K. Hema**, KL University.
