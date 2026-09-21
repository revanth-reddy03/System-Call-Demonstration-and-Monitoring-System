/**
 * ============================================================================
 * Project: System Call Demonstration and Monitoring System
 * File: error_demo.h
 * Description: Declarations for system call error handling and errno inspection.
 * ============================================================================
 */

#ifndef ERROR_DEMO_H
#define ERROR_DEMO_H

#include "common.h"

/**
 * Demonstrates deliberate system call failures and error diagnosis:
 * 1. open() on a non-existent file without O_CREAT (triggers ENOENT - code 2)
 * 2. read() on an invalid/closed file descriptor (triggers EBADF - code 9)
 * 3. execvp() with an invalid non-existent executable name (triggers ENOENT)
 * Inspects errno, strerror(), and perror().
 *
 * @return 0 on successful demonstration of error handling.
 */
int demonstrate_error_handling(void);

#endif /* ERROR_DEMO_H */
