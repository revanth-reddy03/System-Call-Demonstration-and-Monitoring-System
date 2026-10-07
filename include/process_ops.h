/**
 * ============================================================================
 * Project: System Call Monitoring and Execution System
 * File: process_ops.h
 * Description: Declarations for process management system calls:
 *              fork, exec family, wait/waitpid, getpid, getppid.
 * ============================================================================
 */

#ifndef PROCESS_OPS_H
#define PROCESS_OPS_H

#include "common.h"

/**
 * Executes a full process management sequence:
 * fork() -> execvp() -> waitpid()
 *
 * @return 0 on success, non-zero on failure.
 */
int execute_process_ops(void);

/* Individual process system call execution functions */
pid_t execute_syscall_fork(double *elapsed_ms);
int execute_syscall_exec(const char *binary, char *const argv[], double *elapsed_ms);
pid_t execute_syscall_wait(int *exit_status, double *elapsed_ms);
pid_t execute_syscall_getpid(double *elapsed_ms);
pid_t execute_syscall_getppid(double *elapsed_ms);

#endif /* PROCESS_OPS_H */
