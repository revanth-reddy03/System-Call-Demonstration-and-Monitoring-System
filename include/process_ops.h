/**
 * ============================================================================
 * Project: System Call Demonstration and Monitoring System
 * File: process_ops.h
 * Description: Declarations for process management system call demonstrations
 *              (fork, exec family, wait/waitpid, PCB lifecycle).
 * ============================================================================
 */

#ifndef PROCESS_OPS_H
#define PROCESS_OPS_H

#include "common.h"

/**
 * Demonstrates process management system calls:
 * 1. fork() creates a child process (PCB duplicate)
 * 2. In child: execvp() replaces address space with child_worker binary
 * 3. In parent: waitpid() synchronizes execution and retrieves termination status
 *
 * @return 0 on success, non-zero on failure.
 */
int demonstrate_process_ops(void);

#endif /* PROCESS_OPS_H */
