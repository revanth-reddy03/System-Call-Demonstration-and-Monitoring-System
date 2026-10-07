/**
 * ============================================================================
 * Project: System Call Monitoring and Execution System
 * File: file_ops.c
 * Description: Implementation of file management system calls:
 *              open, write, read, close, mkdir, rmdir with precise timing
 *              and kernel boundary transitions.
 * ============================================================================
 */

#include "file_ops.h"

int execute_syscall_open(const char *filename, const char *mode, double *elapsed_ms) {
    struct timespec start, end;
    int flags = O_RDONLY;
    mode_t permissions = 0644;

    if (mode && (strcmp(mode, "w") == 0 || strcmp(mode, "write") == 0 || strcmp(mode, "O_WRONLY") == 0)) {
        flags = O_CREAT | O_WRONLY | O_TRUNC;
    } else if (mode && (strcmp(mode, "a") == 0 || strcmp(mode, "append") == 0)) {
        flags = O_CREAT | O_WRONLY | O_APPEND;
    } else if (mode && (strcmp(mode, "rw") == 0 || strcmp(mode, "O_RDWR") == 0)) {
        flags = O_CREAT | O_RDWR;
    }

    clock_gettime(CLOCK_MONOTONIC, &start);
    int fd = open(filename, flags, permissions);
    clock_gettime(CLOCK_MONOTONIC, &end);

    if (elapsed_ms) {
        *elapsed_ms = get_time_diff_ms(start, end);
    }
    return fd;
}

int execute_syscall_write(const char *filename, const char *content, double *elapsed_ms) {
    struct timespec start, end;
    int fd = open(filename, O_CREAT | O_WRONLY | O_TRUNC, 0644);
    if (fd == -1) return -1;

    size_t len = content ? strlen(content) : 0;
    clock_gettime(CLOCK_MONOTONIC, &start);
    ssize_t written = write(fd, content, len);
    clock_gettime(CLOCK_MONOTONIC, &end);

    close(fd);
    if (elapsed_ms) {
        *elapsed_ms = get_time_diff_ms(start, end);
    }
    return (int)written;
}

int execute_syscall_read(const char *filename, char *out_buf, size_t buf_size, double *elapsed_ms) {
    struct timespec start, end;
    int fd = open(filename, O_RDONLY);
    if (fd == -1) return -1;

    clock_gettime(CLOCK_MONOTONIC, &start);
    ssize_t bytes_read = read(fd, out_buf, buf_size - 1);
    clock_gettime(CLOCK_MONOTONIC, &end);

    if (bytes_read >= 0) {
        out_buf[bytes_read] = '\0';
    }
    close(fd);

    if (elapsed_ms) {
        *elapsed_ms = get_time_diff_ms(start, end);
    }
    return (int)bytes_read;
}

int execute_syscall_close(int fd, double *elapsed_ms) {
    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);
    int ret = close(fd);
    clock_gettime(CLOCK_MONOTONIC, &end);

    if (elapsed_ms) {
        *elapsed_ms = get_time_diff_ms(start, end);
    }
    return ret;
}

int execute_syscall_mkdir(const char *dirname, double *elapsed_ms) {
    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);
    int ret = mkdir(dirname, 0755);
    clock_gettime(CLOCK_MONOTONIC, &end);

    if (elapsed_ms) {
        *elapsed_ms = get_time_diff_ms(start, end);
    }
    return ret;
}

int execute_syscall_rmdir(const char *dirname, double *elapsed_ms) {
    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);
    int ret = rmdir(dirname);
    clock_gettime(CLOCK_MONOTONIC, &end);

    if (elapsed_ms) {
        *elapsed_ms = get_time_diff_ms(start, end);
    }
    return ret;
}

int execute_file_ops(const char *custom_data) {
    print_section_header("MODULE 1: FILE OPERATIONS");

    int fd;
    ssize_t bytes_written;
    ssize_t bytes_read;
    char write_buffer[FILE_BUFFER_SIZE];
    memset(write_buffer, 0, sizeof(write_buffer));

    if (custom_data != NULL && strlen(custom_data) > 0) {
        snprintf(write_buffer, sizeof(write_buffer), "%s\n", custom_data);
        LOG_INFO("Using custom input data for file write operation.");
    } else if (isatty(fileno(stdin))) {
        printf(COLOR_BOLD COLOR_YELLOW "\n[PROMPT] Enter custom text to write into '%s':\n> " COLOR_RESET, DEFAULT_TEST_FILE);
        fflush(stdout);
        char input_line[FILE_BUFFER_SIZE - 64];
        if (fgets(input_line, sizeof(input_line), stdin)) {
            size_t len = strlen(input_line);
            if (len > 0 && input_line[len - 1] == '\n') {
                input_line[len - 1] = '\0';
            }
            if (strlen(input_line) > 0) {
                snprintf(write_buffer, sizeof(write_buffer), "%s\n", input_line);
                LOG_SUCCESS("User data captured: \"%s\"", input_line);
            }
        }
    }

    if (strlen(write_buffer) == 0) {
        snprintf(write_buffer, sizeof(write_buffer),
            "=== System Call Monitoring and Execution System ===\n"
            "Operating Systems and Systems Programming (25CS2104E)\n"
            "Team 18: Akhil AD, Revanth Reddy, Advik\n"
            "Status: Data successfully transferred from User Space to Kernel Space.\n");
        LOG_INFO("Using standard system text.");
    }

    char read_buffer[FILE_BUFFER_SIZE];
    memset(read_buffer, 0, sizeof(read_buffer));

    print_subsection("Step 1.1: Creating and Opening File using open()");
    LOG_INFO("Requesting kernel to create/open '%s' for writing...", DEFAULT_TEST_FILE);
    LOG_KERNEL("User space issues syscall: openat(AT_FDCWD, \"%s\", O_WRONLY|O_CREAT|O_TRUNC, 0644)", DEFAULT_TEST_FILE);

    double open_ms = 0.0;
    fd = execute_syscall_open(DEFAULT_TEST_FILE, "w", &open_ms);
    if (fd == -1) {
        LOG_ERROR("open() failed on file '%s'", DEFAULT_TEST_FILE);
        perror("  [perror] open");
        return -1;
    }

    LOG_SUCCESS("File opened successfully with File Descriptor (fd): %d (Time: %.3f ms)", fd, open_ms);
    LOG_INFO("Operating System Insight:");
    printf("     - Standard fds: 0 (stdin), 1 (stdout), 2 (stderr).\n");
    printf("     - Kernel allocated lowest free index in Process File Descriptor Table: fd = %d\n", fd);
    printf("     - File permissions set to 0644 (rw-r--r--).\n");

    print_subsection("Step 1.2: Writing Data to File using write()");
    size_t data_len = strlen(write_buffer);
    LOG_INFO("Writing %zu bytes from user memory buffer to fd %d...", data_len, fd);
    LOG_KERNEL("Kernel copies %zu bytes across user-kernel boundary into page cache", data_len);

    struct timespec w_start, w_end;
    clock_gettime(CLOCK_MONOTONIC, &w_start);
    bytes_written = write(fd, write_buffer, data_len);
    clock_gettime(CLOCK_MONOTONIC, &w_end);
    double write_ms = get_time_diff_ms(w_start, w_end);

    if (bytes_written == -1) {
        LOG_ERROR("write() failed on fd %d", fd);
        perror("  [perror] write");
        close(fd);
        return -1;
    }
    LOG_SUCCESS("Successfully wrote %zd bytes to disk via fd %d (Time: %.3f ms)", bytes_written, fd, write_ms);

    print_subsection("Step 1.3: Closing File Descriptor using close()");
    double close_ms = 0.0;
    if (execute_syscall_close(fd, &close_ms) == -1) {
        LOG_ERROR("close() failed on fd %d", fd);
        perror("  [perror] close");
        return -1;
    }
    LOG_SUCCESS("File descriptor %d closed successfully (Time: %.3f ms).", fd, close_ms);

    print_subsection("Step 1.4: Reopening File for Reading using open(O_RDONLY)");
    fd = execute_syscall_open(DEFAULT_TEST_FILE, "r", &open_ms);
    if (fd == -1) {
        LOG_ERROR("open() failed for reading '%s'", DEFAULT_TEST_FILE);
        perror("  [perror] open(O_RDONLY)");
        return -1;
    }
    LOG_SUCCESS("File reopened for reading with File Descriptor: %d (Time: %.3f ms)", fd, open_ms);

    print_subsection("Step 1.5: Reading Data from File using read()");
    struct timespec r_start, r_end;
    clock_gettime(CLOCK_MONOTONIC, &r_start);
    bytes_read = read(fd, read_buffer, sizeof(read_buffer) - 1);
    clock_gettime(CLOCK_MONOTONIC, &r_end);
    double read_ms = get_time_diff_ms(r_start, r_end);

    if (bytes_read == -1) {
        LOG_ERROR("read() failed on fd %d", fd);
        perror("  [perror] read");
        close(fd);
        return -1;
    }

    read_buffer[bytes_read] = '\0';
    LOG_SUCCESS("Successfully read %zd bytes from fd %d (Time: %.3f ms).", bytes_read, fd, read_ms);
    printf(COLOR_CYAN "--- [Contents Read From File Descriptor %d] ---" COLOR_RESET "\n", fd);
    printf("%s", read_buffer);
    printf(COLOR_CYAN "--------------------------------------------------" COLOR_RESET "\n");

    print_subsection("Step 1.6: Final Close of Read File Descriptor");
    execute_syscall_close(fd, &close_ms);
    LOG_SUCCESS("Read file descriptor %d closed successfully.", fd);
    LOG_SUCCESS("File operations completed flawlessly.\n");

    return 0;
}
