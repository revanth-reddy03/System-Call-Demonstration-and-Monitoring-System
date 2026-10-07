/**
 * ============================================================================
 * Project: System Call Monitoring and Execution System
 * File: error_ops.h
 * Description: Declarations for system call error handling and errno inspection.
 * ============================================================================
 */

#ifndef ERROR_OPS_H
#define ERROR_OPS_H

#include "common.h"

/**
 * Executes deliberate system call failures and reports error diagnostics:
 * 1. open() on non-existent file without O_CREAT (ENOENT - code 2)
 * 2. read() on invalid file descriptor (EBADF - code 9)
 * 3. execvp() with invalid binary name (ENOENT)
 *
 * @return 0 on success.
 */
int execute_error_handling(void);

#endif /* ERROR_OPS_H */
