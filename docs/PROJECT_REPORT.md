# System Call Demonstration and Monitoring System
## Comprehensive Project Report & Systems Programming Analysis

**Course Code**: 25CS2104E — Operating Systems and Systems Programming  
**Academic Year**: 2026–27, Term-I  
**Section**: 03 | **Team No.**: 18  
**Faculty Guide**: Dr. K. Hema  
**GitHub Repository**: [https://github.com/revanth-reddy03/System-Call-Demonstration-and-Monitoring-System](https://github.com/revanth-reddy03/System-Call-Demonstration-and-Monitoring-System)

---

### Team Members & Contributions

| Roll Number | Student Name | Assigned Responsibilities |
| :--- | :--- | :--- |
| **2520030423** | **Akhil AD** | Implementation of file operations (`open`, `read`, `write`, `close`), File Descriptor tracking, and return value error checking. |
| **2520030424** | **Revanth Reddy** | Implementation of process management (`fork`, `execvp`, `waitpid`), process lifecycle synchronization, and CLI architecture. |
| **2520039623** | **Advik** | Implementation of `strace` monitoring scripts, trace analysis engine, deliberate error handling (`errno`, `perror`), and automated test suite. |

---

## 1. Abstract

This project presents an end-to-end, modular Linux-based **System Call Demonstration and Monitoring System** designed to bridge the gap between theoretical operating system concepts and runtime kernel execution. User-space programs interact with hardware resources exclusively via the kernel through system calls. This application implements core POSIX system calls across two foundational domains: **File Operations** (`open()`, `read()`, `write()`, `close()`) and **Process Management** (`fork()`, `execvp()`, `waitpid()`). Furthermore, the system incorporates rigorous error detection and diagnostic mechanisms leveraging `errno`, `perror()`, and `strerror()`.

To provide deep visibility into kernel-level execution, the program is coupled with an automated profiling engine based on Linux `strace`. The tracing subsystem captures all transitions across the user-to-kernel boundary, recording arguments, return values, and execution overhead. An accompanying analysis engine parses the generated traces, generating empirical reports that demystify CPU privilege level switching, file descriptor table allocation, and Process Control Block (PCB) lifecycle management.

---

## 2. Problem Statement & Motivation

In academic computer science education, operating systems concepts—such as the separation of user mode and kernel mode, process address spaces, file descriptors, and context switching—are frequently studied in the abstract. Students often view high-level library functions (such as `printf()` or `fopen()`) as self-contained routines rather than thin wrappers over low-level kernel traps. Consequently, software developers frequently encounter debugging difficulties when encountering system-level errors or performance bottlenecks.

This project addresses this limitation by developing:
1. A transparent, educational C application that directly invokes low-level POSIX system calls rather than standard I/O streams.
2. A deliberate fault-injection module demonstrating how the Linux kernel flags errors using registers and how the C runtime maps these to `errno` constants.
3. An automated monitoring and parsing pipeline utilizing `strace` to observe and quantify kernel activity during execution.

---

## 3. System Architecture & Kernel Internals

### 3.1 The User-Kernel Privilege Boundary

Modern x86-64 processors enforce hardware-level privilege rings:
- **Ring 3 (User Space)**: Applications execute with restricted instruction sets and cannot directly access hardware, page tables, or physical I/O ports.
- **Ring 0 (Kernel Space)**: The operating system kernel executes with complete architectural control.

When a user program issues a system call (e.g. `write()`):
1. Parameters are placed into CPU registers (`%rdi`, `%rsi`, `%rdx`, `%r10`, `%r8`, `%r9`).
2. The syscall number is loaded into `%rax` (e.g., `1` for `sys_write`, `0` for `sys_read`).
3. The CPU executes the `syscall` assembly instruction, triggering a mode transition from Ring 3 to Ring 0.
4. The CPU jumps to the kernel's system call entry point (`entry_SYSCALL_64`), saving user registers on the kernel stack.
5. The kernel indexes into `sys_call_table[]` using `%rax` and executes the handler.
6. The handler writes the return value (or negative error number) into `%rax` and invokes `sysretq` to return to Ring 3.

```
+-------------------------------------------------------------------+
|                           USER SPACE (Ring 3)                     |
|                                                                   |
|   +---------------------+               +---------------------+   |
|   |   Application Code  |               |  C Library (glibc)  |   |
|   |   (main / file_ops) | ------------> |  write(fd, buf, len)|   |
|   +---------------------+               +----------+----------+   |
+----------------------------------------------------|--------------+
|             HARDWARE / KERNEL BOUNDARY             | SYSCALL      |
+----------------------------------------------------v--------------+
|                          KERNEL SPACE (Ring 0)                    |
|                                                                   |
|   +-----------------------------------------------------------+   |
|   | Entry Dispatcher: entry_SYSCALL_64 (loads %rax from table)|   |
|   +-----------------------------+-----------------------------+   |
|                                 |                                 |
|         +-----------------------+-----------------------+         |
|         v                                               v         |
|   [sys_write()]                                   [sys_clone()]   |
|   - VFS write operation                           - task_struct   |
|   - Page Cache buffering                          - Memory map    |
|   - Driver dispatch                               - Scheduler     |
+-------------------------------------------------------------------+
```

---

### 3.2 File Descriptor Architecture

A file descriptor is not a pointer, but a non-negative integer representing an index in the process's file descriptor table (`files_struct` in Linux):

1. **Process File Descriptor Table**: Contains array of pointers to system-wide Open File Descriptions.
   - `0`: Standard Input (`stdin`)
   - `1`: Standard Output (`stdout`)
   - `2`: Standard Error (`stderr`)
   - `3+`: Allocated dynamically to newly opened files using the **lowest available integer policy**.
2. **Open File Description Table (Kernel Global)**: Stores file offset, access modes (`O_RDONLY`, `O_WRONLY`), status flags, and reference count.
3. **VFS Inode Table (Kernel Global)**: Points to the concrete filesystem inode on disk containing metadata (permissions, ownership, size, disk blocks).

---

### 3.3 Process Lifecycle & Memory Space Management

1. **`fork()` via `clone`**:
   - The Linux kernel creates a duplicate of the calling process by allocating a new `task_struct` (Process Control Block).
   - Rather than naively copying entire memory segments, Linux utilizes **Copy-On-Write (COW)**. Virtual memory pages are marked read-only and shared between parent and child. A physical duplicate is only allocated if either process writes to a page.
2. **`execvp()` via `execve`**:
   - The child's existing memory image (text, data, bss, heap, user stack) is unmapped and deallocated.
   - The kernel ELF loader reads the executable binary headers, loads program code into memory, initializes a new stack with `argc` and `argv`, and resets the instruction pointer to `_start`.
   - The process retains its original PID and file descriptors (unless `FD_CLOEXEC` is set).
3. **`waitpid()` & Zombie Reclamation**:
   - When a child process calls `exit()`, its memory and resources are released, but its entry in the kernel's process table remains in state `EXIT_ZOMBIE` so the parent can query its exit code.
   - Calling `waitpid()` reaps the child status and allows the kernel to free the remaining `task_struct`.

---

## 4. Implementation Details

The codebase is organized modularly under `src/` and `include/`:

```
OSSP/
├── include/
│   ├── common.h         # ANSI styling, logging macros, system headers
│   ├── file_ops.h       # Prototypes for file operations module
│   ├── process_ops.h    # Prototypes for process lifecycle module
│   └── error_demo.h     # Prototypes for errno & diagnostic module
├── src/
│   ├── main.c           # CLI interface (menu & automated batch modes)
│   ├── file_ops.c       # open, write, read, close demonstration
│   ├── process_ops.c    # fork, execvp, waitpid demonstration
│   ├── error_demo.c     # Deliberate fault injection & errno checks
│   └── child_worker.c   # Executed worker program for exec demo
├── scripts/
│   ├── run_trace.sh     # Strace orchestration script
│   └── analyze_trace.py # Automated log parser & report generator
├── tests/
│   └── test_runner.sh   # 12-stage automated test suite
├── traces/              # Generated strace outputs (.log)
├── docs/                # Comprehensive documentation
├── Makefile             # Clean build and execution automation
└── README.md            # GitHub repository documentation
```

### 4.1 File Operations (`src/file_ops.c`)
- **Creation & Write**: Invokes `open(DEMO_FILE_PATH, O_CREAT | O_WRONLY | O_TRUNC, 0644)`. Verifies that the kernel assigned `fd = 3`. Writes structured payload into `fd`, checks that returned byte count matches source string length, and closes descriptor via `close(fd)`.
- **Read Back**: Re-opens file with `O_RDONLY`. Allocates a zeroed user-space buffer and reads data via `read(fd, buffer, sizeof(buffer) - 1)`. Verifies contents and closes descriptor.

### 4.2 Process Management (`src/process_ops.c`)
- Flushes I/O streams using `fflush()` before invoking `fork()` to prevent duplicate buffer flushes.
- **Child Context (`pid == 0`)**: Displays child PID and PPID. Prepares argument vector `char *child_args[]` and invokes `execvp("./child_worker", child_args)`.
- **Child Worker (`src/child_worker.c`)**: Confirms retention of PID, prints arguments, simulates workload, and terminates cleanly with exit code `42`.
- **Parent Context (`pid > 0`)**: Synchronizes with child via `waitpid(pid, &status, 0)`. Validates completion with `WIFEXITED(status)` and confirms exit code `42` using `WEXITSTATUS(status)`.

### 4.3 Error Handling & `errno` (`src/error_demo.c`)
- **Fault 1**: Attempting to open `non_existent_file_99999.xyz` in `O_RDONLY` mode. Return value: `-1`. Resulting `errno`: `2` (`ENOENT` — No such file or directory).
- **Fault 2**: Reading from unassigned file descriptor `888`. Return value: `-1`. Resulting `errno`: `9` (`EBADF` — Bad file descriptor).
- **Fault 3**: Closing unassigned file descriptor `888`. Return value: `-1`. Resulting `errno`: `9` (`EBADF`).
- **Fault 4**: Child process attempting to exec a non-existent binary path. Resulting `errno`: `2` (`ENOENT`).

---

## 5. System Call Tracing with `strace`

Execution under `strace -f -c` yields the following profile of kernel service requests:

| Syscall | % Time | Seconds | Calls | Errors | Primary OS Concept Demonstrated |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `write` | 62.91% | 0.006129 | 174 | 0 | File I/O & Terminal Display |
| `mprotect`| 16.12% | 0.001570 | 6 | 0 | Memory Page Protection (ELF loading) |
| `openat` | 5.05% | 0.000492 | 7 | 1 | File Creation / Open (`1` intentional `ENOENT`) |
| `clone` | 4.96% | 0.000483 | 2 | 0 | Process Creation (`fork` backend) |
| `close` | 2.89% | 0.000282 | 8 | 1 | File Descriptor Deallocation (`1` intentional `EBADF`) |
| `read` | 2.41% | 0.000235 | 4 | 1 | File Data Retrieval (`1` intentional `EBADF`) |
| `wait4` | 1.75% | 0.000170 | 2 | 0 | Process Synchronization (`waitpid`) |
| `execve` | 0.00% | 0.000000 | 3 | 1 | Address Space Replacement (`1` intentional error) |
| **Total** | **100%** | **0.009742** | **267** | **6** | **6 Verified Intentional Error Injections** |

---

## 6. Automated Testing & Verification

The automated test runner (`tests/test_runner.sh`) executes 12 rigorous test cases:

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

## 7. Conclusion

The **System Call Demonstration and Monitoring System** satisfies all project objectives specified in the course curriculum (25CS2104E). By combining modular C systems programming with real-time `strace` profiling and automated log analysis, the system provides an educational, empirical demonstration of:
- How file descriptors serve as kernel handles.
- How memory spaces are cloned and replaced during process creation.
- How parent processes prevent zombie accumulation via synchronization.
- How error conditions translate from CPU registers to user-space diagnostics.

---

## 8. References
1. Robert Love, *Linux System Programming: Talking Directly to the Kernel and C Library*, 2nd Edition, O'Reilly Media.
2. Michael Kerrisk, *The Linux Programming Interface: A Linux and UNIX System Programming Handbook*, No Starch Press.
3. Silberschatz, Galvin, and Gagne, *Operating System Concepts*, 10th Edition, Wiley.
4. Linux Kernel Documentation, *System Calls and POSIX Compliance*: https://docs.kernel.org/
5. `man 2 intro`, `man 2 open`, `man 2 fork`, `man 2 execve`, `man 2 waitpid`, `man 1 strace`.
