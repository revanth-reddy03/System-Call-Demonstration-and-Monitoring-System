/**
 * ============================================================================
 * Project: System Call Monitoring and Execution System
 * File: file_ops.h
 * Description: Declarations for file management system call execution:
 *              open, write, read, close, file descriptors, mkdir, rmdir.
 * ============================================================================
 */

#ifndef FILE_OPS_H
#define FILE_OPS_H

#include "common.h"

#define DEFAULT_TEST_FILE "syscall_testfile.txt"
#define FILE_BUFFER_SIZE 1024

/**
 * Executes a full walkthrough of file-related system calls.
 *
 * @param custom_data Optional custom string to write to the file.
 * @return 0 on success, non-zero on failure.
 */
int execute_file_ops(const char *custom_data);

/* Individual system call execution functions with execution time reporting */
int execute_syscall_open(const char *filename, const char *mode, double *elapsed_ms);
int execute_syscall_read(const char *filename, char *out_buf, size_t buf_size, double *elapsed_ms);
int execute_syscall_write(const char *filename, const char *content, double *elapsed_ms);
int execute_syscall_close(int fd, double *elapsed_ms);
int execute_syscall_mkdir(const char *dirname, double *elapsed_ms);
int execute_syscall_rmdir(const char *dirname, double *elapsed_ms);

#endif /* FILE_OPS_H */
