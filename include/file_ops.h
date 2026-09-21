/**
 * ============================================================================
 * Project: System Call Demonstration and Monitoring System
 * File: file_ops.h
 * Description: Declarations for file management system call demonstrations
 *              (open, write, read, close, file descriptors).
 * ============================================================================
 */

#ifndef FILE_OPS_H
#define FILE_OPS_H

#include "common.h"

#define DEMO_FILE_PATH "sys_demo_testfile.txt"
#define DEMO_BUFFER_SIZE 256

/**
 * Executes a full walkthrough of file-related system calls:
 * 1. open() with O_CREAT | O_WRONLY | O_TRUNC
 * 2. write() user-space buffer into file descriptor
 * 3. close() writing descriptor
 * 4. open() with O_RDONLY
 * 5. read() kernel-buffered data back into user-space
 * 6. close() reading descriptor
 *
 * @return 0 on success, non-zero on failure.
 */
int demonstrate_file_ops(void);

#endif /* FILE_OPS_H */
