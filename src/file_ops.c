/**
 * ============================================================================
 * Project: System Call Demonstration and Monitoring System
 * File: file_ops.c
 * Description: Implementation of file management system calls:
 *              open(), write(), read(), close() with comprehensive error checks
 *              and educational commentary on user-kernel boundary transitions.
 * ============================================================================
 */

#include "file_ops.h"

int demonstrate_file_ops(void) {
    print_section_header("MODULE 1: FILE OPERATIONS DEMONSTRATION");

    int fd;
    ssize_t bytes_written;
    ssize_t bytes_read;
    char write_buffer[] = 
        "=== System Call Demonstration and Monitoring System ===\n"
        "Operating Systems and Systems Programming (25CS2104E)\n"
        "Team 18: Akhil AD, Revanth Reddy, Advik\n"
        "Status: Data successfully transferred from User Space to Kernel Space.\n";
    
    char read_buffer[DEMO_BUFFER_SIZE];
    memset(read_buffer, 0, sizeof(read_buffer));

    /* -------------------------------------------------------------
     * Step 1: open() with O_CREAT | O_WRONLY | O_TRUNC
     * ------------------------------------------------------------- */
    print_subsection("Step 1.1: Creating and Opening File using open()");
    LOG_INFO("Requesting kernel to create/open '%s' for writing...", DEMO_FILE_PATH);
    LOG_KERNEL("User space issues syscall: openat(AT_FDCWD, \"%s\", O_WRONLY|O_CREAT|O_TRUNC, 0644)", DEMO_FILE_PATH);

    fd = open(DEMO_FILE_PATH, O_CREAT | O_WRONLY | O_TRUNC, 0644);
    if (fd == -1) {
        LOG_ERROR("open() failed to create file '%s'", DEMO_FILE_PATH);
        perror("  [perror] open");
        return -1;
    }

    LOG_SUCCESS("File opened successfully with File Descriptor (fd): %d", fd);
    LOG_INFO("Operating System Insight:");
    printf("     - Standard fds: 0 (stdin), 1 (stdout), 2 (stderr).\n");
    printf("     - Kernel allocated lowest free index in Process File Descriptor Table: fd = %d\n", fd);
    printf("     - File permissions set to 0644 (rw-r--r--).\n");

    /* -------------------------------------------------------------
     * Step 2: write() data from user space to kernel
     * ------------------------------------------------------------- */
    print_subsection("Step 1.2: Writing Data to File using write()");
    size_t data_len = strlen(write_buffer);
    LOG_INFO("Writing %zu bytes from user memory buffer to fd %d...", data_len, fd);
    LOG_KERNEL("Kernel copies %zu bytes across user-kernel boundary into page cache", data_len);

    bytes_written = write(fd, write_buffer, data_len);
    if (bytes_written == -1) {
        LOG_ERROR("write() failed on fd %d", fd);
        perror("  [perror] write");
        close(fd);
        return -1;
    }

    LOG_SUCCESS("Successfully wrote %zd bytes to disk via fd %d", bytes_written, fd);

    /* -------------------------------------------------------------
     * Step 3: close() the write file descriptor
     * ------------------------------------------------------------- */
    print_subsection("Step 1.3: Closing File Descriptor using close()");
    LOG_INFO("Releasing file descriptor %d back to the kernel...", fd);
    LOG_KERNEL("Kernel decrements file table entry reference count and releases fd %d", fd);

    if (close(fd) == -1) {
        LOG_ERROR("close() failed on fd %d", fd);
        perror("  [perror] close");
        return -1;
    }
    LOG_SUCCESS("File descriptor %d closed successfully.", fd);

    /* -------------------------------------------------------------
     * Step 4: open() with O_RDONLY to read back data
     * ------------------------------------------------------------- */
    print_subsection("Step 1.4: Reopening File for Reading using open(O_RDONLY)");
    LOG_INFO("Requesting kernel to open '%s' in read-only mode...", DEMO_FILE_PATH);

    fd = open(DEMO_FILE_PATH, O_RDONLY);
    if (fd == -1) {
        LOG_ERROR("open() failed for reading '%s'", DEMO_FILE_PATH);
        perror("  [perror] open(O_RDONLY)");
        return -1;
    }
    LOG_SUCCESS("File reopened for reading with File Descriptor: %d", fd);

    /* -------------------------------------------------------------
     * Step 5: read() data into user space buffer
     * ------------------------------------------------------------- */
    print_subsection("Step 1.5: Reading Data from File using read()");
    LOG_INFO("Reading up to %zu bytes from fd %d into user-space buffer...", sizeof(read_buffer) - 1, fd);
    LOG_KERNEL("Kernel reads from page cache / inode blocks into user-provided pointer");

    bytes_read = read(fd, read_buffer, sizeof(read_buffer) - 1);
    if (bytes_read == -1) {
        LOG_ERROR("read() failed on fd %d", fd);
        perror("  [perror] read");
        close(fd);
        return -1;
    }

    read_buffer[bytes_read] = '\0'; /* Ensure null-terminated string */
    LOG_SUCCESS("Successfully read %zd bytes from fd %d.", bytes_read, fd);
    printf(COLOR_CYAN "--- [Contents Read From File Descriptor %d] ---" COLOR_RESET "\n", fd);
    printf("%s", read_buffer);
    printf(COLOR_CYAN "--------------------------------------------------" COLOR_RESET "\n");

    /* -------------------------------------------------------------
     * Step 6: close() read file descriptor
     * ------------------------------------------------------------- */
    print_subsection("Step 1.6: Final Close of Read File Descriptor");
    if (close(fd) == -1) {
        LOG_ERROR("close() failed on read fd %d", fd);
        perror("  [perror] close");
        return -1;
    }
    LOG_SUCCESS("Read file descriptor %d closed successfully.", fd);
    LOG_SUCCESS("File operations demonstration completed flawlessly.\n");

    return 0;
}
