/**
 * ============================================================================
 * Project: System Call Demonstration and Monitoring System
 * File: error_demo.c
 * Description: Implementation of system call error handling and errno diagnostics.
 *              Demonstrates deliberate error triggers, return-value checking,
 *              errno values, strerror(), and perror().
 * ============================================================================
 */

#include "error_demo.h"

int demonstrate_error_handling(void) {
    print_section_header("MODULE 3: SYSTEM CALL ERROR HANDLING & ERRNO");

    int fd;
    ssize_t bytes_read;
    char buffer[64];

    /* -------------------------------------------------------------
     * Test Case 1: Opening a Non-Existent File (ENOENT - Error 2)
     * ------------------------------------------------------------- */
    print_subsection("Case 3.1: open() with Non-Existent File Path (ENOENT)");
    const char *non_existent_path = "non_existent_file_99999.xyz";
    
    LOG_INFO("Attempting to open non-existent file '%s' in O_RDONLY mode...", non_existent_path);
    LOG_KERNEL("Kernel inspects VFS dentry cache; path lookup fails to resolve file");

    errno = 0; /* Clear errno before call */
    fd = open(non_existent_path, O_RDONLY);

    if (fd == -1) {
        LOG_SUCCESS("Expected failure detected! open() returned -1");
        printf("     - errno numerical code : " COLOR_RED "%d" COLOR_RESET "\n", errno);
        printf("     - strerror(errno)      : " COLOR_YELLOW "%s" COLOR_RESET "\n", strerror(errno));
        if (errno == ENOENT) {
            printf("     - Error matched constant: ENOENT (No such file or directory)\n");
        }
        fflush(stdout);
        perror("     - Standard perror() output");
        fflush(stderr);
    } else {
        LOG_ERROR("Unexpected success! File should not exist.");
        close(fd);
    }

    /* -------------------------------------------------------------
     * Test Case 2: Reading from an Invalid File Descriptor (EBADF - Error 9)
     * ------------------------------------------------------------- */
    print_subsection("Case 3.2: read() on an Invalid File Descriptor (EBADF)");
    int invalid_fd = 888;
    LOG_INFO("Attempting to read from invalid file descriptor %d...", invalid_fd);
    LOG_KERNEL("Kernel checks process files_struct table; index %d is unassigned or out of bounds", invalid_fd);

    errno = 0;
    bytes_read = read(invalid_fd, buffer, sizeof(buffer));

    if (bytes_read == -1) {
        LOG_SUCCESS("Expected failure detected! read() returned -1");
        printf("     - errno numerical code : " COLOR_RED "%d" COLOR_RESET "\n", errno);
        printf("     - strerror(errno)      : " COLOR_YELLOW "%s" COLOR_RESET "\n", strerror(errno));
        if (errno == EBADF) {
            printf("     - Error matched constant: EBADF (Bad file descriptor)\n");
        }
        fflush(stdout);
        perror("     - Standard perror() output");
        fflush(stderr);
    } else {
        LOG_ERROR("Unexpected success! Read should fail on invalid fd.");
    }

    /* -------------------------------------------------------------
     * Test Case 3: Closing an Invalid File Descriptor (EBADF - Error 9)
     * ------------------------------------------------------------- */
    print_subsection("Case 3.3: close() on an Invalid File Descriptor (EBADF)");
    LOG_INFO("Attempting to close invalid file descriptor %d...", invalid_fd);

    errno = 0;
    int close_ret = close(invalid_fd);
    if (close_ret == -1) {
        LOG_SUCCESS("Expected failure detected! close() returned -1");
        printf("     - errno numerical code : " COLOR_RED "%d" COLOR_RESET "\n", errno);
        printf("     - strerror(errno)      : " COLOR_YELLOW "%s" COLOR_RESET "\n", strerror(errno));
        fflush(stdout);
        perror("     - Standard perror() output");
        fflush(stderr);
    }

    /* -------------------------------------------------------------
     * Test Case 4: Child Process Failed execvp() Call
     * ------------------------------------------------------------- */
    print_subsection("Case 3.4: fork() Child Attempting to exec Non-Existent Program");
    fflush(stdout);
    fflush(stderr);
    pid_t pid = fork();
    if (pid < 0) {
        perror("fork");
        return -1;
    } else if (pid == 0) {
        /* In child */
        char *invalid_cmd[] = {"/usr/bin/this_program_does_not_exist_xyz", NULL};
        errno = 0;
        fflush(stdout);
        fflush(stderr);
        execvp(invalid_cmd[0], invalid_cmd);

        /* execvp failed */
        printf("  [Child Error Check] execvp failed as expected:\n");
        printf("     - errno numerical code : %d (%s)\n", errno, strerror(errno));
        perror("     - Child perror");
        exit(99); /* Exit with custom code */
    } else {
        int status;
        waitpid(pid, &status, 0);
        if (WIFEXITED(status)) {
            LOG_SUCCESS("Parent caught child exit code %d from failed exec attempt.", WEXITSTATUS(status));
        }
    }

    LOG_INFO("Operating System Insight:");
    printf("     - Linux system calls return negative error codes (e.g. -ENOENT, -EBADF) in the %%rax register.\n");
    printf("     - The C standard library (glibc) wrapper inspects %%rax, sets the thread-local variable 'errno',\n");
    printf("       and returns -1 to the user application.\n");
    printf("     - This decoupling keeps user code clean while providing detailed diagnostic information.\n");

    LOG_SUCCESS("System call error handling demonstration completed successfully.\n");
    return 0;
}
