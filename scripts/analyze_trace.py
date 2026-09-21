#!/usr/bin/env python3
"""
==============================================================================
Script: analyze_trace.py
Project: System Call Demonstration and Monitoring System
Course:  Operating Systems and Systems Programming (25CS2104E)
Team 18: Akhil AD, Revanth Reddy, Advik
==============================================================================
Description:
Intelligent parser and educational analyzer for strace logs.
Extracts system calls, maps them to operating system concepts, highlights
user-to-kernel mode transitions, analyzes error codes, and exports a
structured Markdown report.
==============================================================================
"""

import os
import re
import sys
from collections import Counter, defaultdict

# ANSI colors for terminal
GREEN = "\033[1;32m"
BLUE = "\033[1;34m"
CYAN = "\033[1;36m"
YELLOW = "\033[1;33m"
RED = "\033[1;31m"
MAGENTA = "\033[1;35m"
BOLD = "\033[1m"
RESET = "\033[0m"

SYSCALL_DESCRIPTIONS = {
    "openat": ("File System", "Opens or creates a file at relative/absolute directory path into file descriptor table"),
    "open": ("File System", "Opens or creates a file descriptor"),
    "read": ("File I/O", "Copies data from kernel page cache/disk into user-space buffer"),
    "write": ("File I/O", "Copies data from user-space buffer into kernel page cache/disk"),
    "close": ("File System", "Releases file descriptor index from process descriptor table"),
    "clone": ("Process Control", "Creates a child process / execution thread (modern Linux fork backend)"),
    "fork": ("Process Control", "Creates a duplicate child process (PCB duplicate)"),
    "execve": ("Process Control", "Replaces process address space with new ELF executable image"),
    "wait4": ("Process Sync", "Blocks parent until specified child state changes and reaps child PCB"),
    "exit_group": ("Process Lifecycle", "Terminates all threads in process and transitions to zombie state"),
    "getpid": ("Process Info", "Fetches current process ID from kernel task_struct"),
    "getppid": ("Process Info", "Fetches parent process ID from kernel task_struct"),
    "mmap": ("Memory Mgmt", "Maps virtual memory pages into process address space"),
    "mprotect": ("Memory Mgmt", "Sets access protection (READ/WRITE/EXEC) on virtual memory pages"),
    "brk": ("Memory Mgmt", "Expands or contracts process heap segment boundary"),
}

def parse_strace_line(line):
    """
    Parses a single line of strace output.
    Format example:
    [pid 455] openat(AT_FDCWD, "sys_demo_testfile.txt", O_WRONLY|O_CREAT|O_TRUNC, 0644) = 3
    [pid 455] openat(AT_FDCWD, "non_existent_file.xyz", O_RDONLY) = -1 ENOENT (No such file or directory)
    """
    line = line.strip()
    if not line or line.startswith("+++") or line.startswith("---"):
        return None

    # Handle PID prefix if present
    pid = "main"
    pid_match = re.match(r"^(\d+)\s+(.*)$", line)
    if not pid_match:
        pid_match = re.match(r"^\[pid\s+(\d+)\]\s+(.*)$", line)

    if pid_match:
        pid = pid_match.group(1)
        line = pid_match.group(2)

    # Match syscall(args) = result [error]
    syscall_pattern = r"^([a-zA-Z0-9_]+)\((.*)\)\s+=\s+(-?[0-9a-fx?]+|\?)(.*)$"
    match = re.match(syscall_pattern, line)
    if not match:
        return None

    name = match.group(1)
    args = match.group(2)
    ret = match.group(3)
    extra = match.group(4).strip()

    is_error = ret.startswith("-") or "E" in extra
    error_name = ""
    if is_error and extra:
        err_m = re.search(r"(E[A-Z0-9]+)", extra)
        if err_m:
            error_name = err_m.group(1)

    return {
        "pid": pid,
        "name": name,
        "args": args,
        "ret": ret,
        "extra": extra,
        "is_error": is_error,
        "error_name": error_name,
        "raw": line
    }

def analyze_trace(log_path):
    if not os.path.exists(log_path):
        print(f"{RED}[ERROR] Trace file '{log_path}' not found!{RESET}")
        return

    parsed_events = []
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            evt = parse_strace_line(line)
            if evt:
                parsed_events.append(evt)

    syscall_counts = Counter(e["name"] for e in parsed_events)
    error_events = [e for e in parsed_events if e["is_error"]]

    # Print Terminal Report
    print(f"\n{CYAN}======================================================================{RESET}")
    print(f"{BOLD}           AUTOMATED SYSTEM CALL TRACE ANALYSIS REPORT{RESET}")
    print(f"{CYAN}======================================================================{RESET}")
    print(f"{BOLD}Trace File Analyzed :{RESET} {log_path}")
    print(f"{BOLD}Total Syscalls Logged:{RESET} {len(parsed_events)}")
    print(f"{BOLD}Distinct Syscalls   :{RESET} {len(syscall_counts)}")
    print(f"{BOLD}Syscall Errors Caught:{RESET} {len(error_events)}")
    print(f"{CYAN}----------------------------------------------------------------------{RESET}")

    print(f"\n{BOLD}{MAGENTA}[1] Target Course System Calls Breakdown:{RESET}")
    print(f"{'Syscall':<15} | {'Category':<16} | {'Calls':<8} | {'Explanation'}")
    print("-" * 75)

    for sc, count in sorted(syscall_counts.items(), key=lambda x: x[1], reverse=True):
        cat, desc = SYSCALL_DESCRIPTIONS.get(sc, ("Other", "General Linux kernel service"))
        print(f"{BOLD}{sc:<15}{RESET} | {cat:<16} | {count:<8} | {desc}")

    print(f"\n{BOLD}{YELLOW}[2] Deliberate Error Handling & Errno Inspection:{RESET}")
    if error_events:
        print(f"{'PID':<6} | {'Syscall':<12} | {'Return Value / Errno':<24} | {'Target Call Details'}")
        print("-" * 75)
        for err in error_events:
            ret_display = f"{err['ret']} {err['error_name']}"
            print(f"{err['pid']:<6} | {err['name']:<12} | {RED}{ret_display:<24}{RESET} | {err['args'][:35]}")
    else:
        print("  None detected.")

    # Generate Markdown Report
    export_markdown_report(log_path, parsed_events, syscall_counts, error_events)

def export_markdown_report(log_path, parsed_events, syscall_counts, error_events):
    report_file = "trace_report.md"
    with open(report_file, "w", encoding="utf-8") as f:
        f.write("# System Call Trace Analysis & Kernel Monitoring Report\n\n")
        f.write("**Course**: Operating Systems and Systems Programming (25CS2104E)  \n")
        f.write("**Team 18**: Akhil AD (2520030423), Revanth Reddy (2520030424), Advik (2520039623)  \n")
        f.write(f"**Source Trace**: `{log_path}`  \n\n")

        f.write("## 1. Executive Summary\n\n")
        f.write(f"- **Total System Calls Intercepted**: {len(parsed_events)}\n")
        f.write(f"- **Unique System Call Types**: {len(syscall_counts)}\n")
        f.write(f"- **Intentional Error Handling Verifications**: {len(error_events)}\n\n")

        f.write("## 2. System Call Categorization & OS Concepts\n\n")
        f.write("| System Call | Subsystem Category | Invocations | Kernel Action & Architectural Insight |\n")
        f.write("| :--- | :--- | :--- | :--- |\n")
        for sc, count in sorted(syscall_counts.items(), key=lambda x: x[1], reverse=True):
            cat, desc = SYSCALL_DESCRIPTIONS.get(sc, ("General OS", "Kernel service invocation"))
            f.write(f"| `{sc}` | {cat} | {count} | {desc} |\n")

        f.write("\n## 3. Deliberate Error Handling Analysis (`errno` Validation)\n\n")
        f.write("The following deliberate fault conditions were injected and verified via return code checking and `errno` inspection:\n\n")
        f.write("| PID | Syscall | Return Code | Detected `errno` | Inspected Call Arguments |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- |\n")
        for err in error_events:
            f.write(f"| `{err['pid']}` | `{err['name']}` | `{err['ret']}` | `{err['error_name']}` | `{err['args']}` |\n")

        f.write("\n## 4. Kernel Boundary Interaction Highlights\n\n")
        f.write("1. **File Operations Lifecycle**:\n")
        f.write("   - `openat`: Allocates file descriptor `3` in the process file table.\n")
        f.write("   - `write`: Transfers bytes across user/kernel boundary into the kernel page cache.\n")
        f.write("   - `read`: Reads back data from cached inode blocks into user-allocated memory buffer.\n")
        f.write("   - `close`: Flushes buffers, decrements open file description reference, and reclaims fd `3`.\n")
        f.write("2. **Process Management & Concurrency**:\n")
        f.write("   - `clone` / `fork`: Duplicates parent `task_struct`, creates separate virtual address space via Copy-On-Write (COW).\n")
        f.write("   - `execve`: Discards child memory segments, loads new ELF binary (`child_worker`), resetting instruction pointer.\n")
        f.write("   - `wait4` (`waitpid`): Blocks parent, changes state to `TASK_INTERRUPTIBLE`, and prevents child from remaining a zombie.\n")

    print(f"\n{GREEN}[SUCCESS] Detailed Markdown report generated at: '{report_file}'{RESET}\n")

if __name__ == "__main__":
    target_log = "traces/trace_filtered.log"
    if len(sys.argv) > 1:
        target_log = sys.argv[1]
    analyze_trace(target_log)
