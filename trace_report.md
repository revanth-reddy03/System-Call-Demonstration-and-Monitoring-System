# System Call Trace Analysis & Kernel Monitoring Report

**Course**: Operating Systems and Systems Programming (25CS2104E)  
**Team 18**: Akhil AD (2520030423), Revanth Reddy (2520030424), Advik (2520039623)  
**Source Trace**: `traces/trace_filtered.log`  

## 1. Executive Summary

- **Total System Calls Intercepted**: 190
- **Unique System Call Types**: 7
- **Intentional Error Handling Verifications**: 4

## 2. System Call Categorization & OS Concepts

| System Call | Subsystem Category | Invocations | Kernel Action & Architectural Insight |
| :--- | :--- | :--- | :--- |
| `write` | File I/O | 163 | Copies data from user-space buffer into kernel page cache/disk |
| `close` | File System | 8 | Releases file descriptor index from process descriptor table |
| `openat` | File System | 7 | Opens or creates a file at relative/absolute directory path into file descriptor table |
| `read` | File I/O | 4 | Copies data from kernel page cache/disk into user-space buffer |
| `execve` | Process Control | 3 | Replaces process address space with new ELF executable image |
| `exit_group` | Process Lifecycle | 3 | Terminates all threads in process and transitions to zombie state |
| `clone` | Process Control | 2 | Creates a child process / execution thread (modern Linux fork backend) |

## 3. Deliberate Error Handling Analysis (`errno` Validation)

The following deliberate fault conditions were injected and verified via return code checking and `errno` inspection:

| PID | Syscall | Return Code | Detected `errno` | Inspected Call Arguments |
| :--- | :--- | :--- | :--- | :--- |
| `478` | `openat` | `-1` | `ENOENT` | `AT_FDCWD, "non_existent_file_99999.xyz", O_RDONLY` |
| `478` | `read` | `-1` | `EBADF` | `888, 0x7ffdf1172520, 64` |
| `478` | `close` | `-1` | `EBADF` | `888` |
| `480` | `execve` | `-1` | `ENOENT` | `"/usr/bin/this_program_does_not_exist_xyz", ["/usr/bin/this_program_does_not_exist_xyz"], 0x7ffdf1172750 /* 25 vars */` |

## 4. Kernel Boundary Interaction Highlights

1. **File Operations Lifecycle**:
   - `openat`: Allocates file descriptor `3` in the process file table.
   - `write`: Transfers bytes across user/kernel boundary into the kernel page cache.
   - `read`: Reads back data from cached inode blocks into user-allocated memory buffer.
   - `close`: Flushes buffers, decrements open file description reference, and reclaims fd `3`.
2. **Process Management & Concurrency**:
   - `clone` / `fork`: Duplicates parent `task_struct`, creates separate virtual address space via Copy-On-Write (COW).
   - `execve`: Discards child memory segments, loads new ELF binary (`child_worker`), resetting instruction pointer.
   - `wait4` (`waitpid`): Blocks parent, changes state to `TASK_INTERRUPTIBLE`, and prevents child from remaining a zombie.
