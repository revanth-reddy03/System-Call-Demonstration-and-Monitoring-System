/**
 * ============================================================================
 * Project: System Call Monitoring and Execution System
 * Course:  Operating Systems and Systems Programming (25CS2104E)
 * Term:    2026-27, Term-I
 * Section: 03 | Team: 18
 * Authors: Akhil AD (2520030423)
 *          Revanth Reddy (2520030424)
 *          Advik (2520039623)
 * Faculty: Dr. K. Hema
 * ============================================================================
 * File: main.c
 * Description: Main entry point providing interactive menu, batch execution,
 *              and individual system call invocation with precise timing.
 * ============================================================================
 */

#include "common.h"
#include "file_ops.h"
#include "process_ops.h"
#include "error_ops.h"

void print_banner(void) {
    printf("\n");
    printf(COLOR_CYAN "================================================================================\n" COLOR_RESET);
    printf(COLOR_BOLD COLOR_WHITE "      SYSTEM CALL MONITORING AND EXECUTION SYSTEM\n" COLOR_RESET);
    printf(COLOR_CYAN "      Course:  Operating Systems and Systems Programming (25CS2104E)\n" COLOR_RESET);
    printf(COLOR_CYAN "      Term:    2026-27, Term-I | Section: 03 | Team: 18\n" COLOR_RESET);
    printf(COLOR_CYAN "      Authors: Akhil AD (2520030423), Revanth Reddy (2520030424), Advik (2520039623)\n" COLOR_RESET);
    printf(COLOR_CYAN "      Faculty: Dr. K. Hema\n" COLOR_RESET);
    printf(COLOR_CYAN "================================================================================\n" COLOR_RESET);
    printf("\n");
}

void print_section_header(const char *title) {
    printf("\n" COLOR_BOLD COLOR_BLUE "================================================================================" COLOR_RESET "\n");
    printf(COLOR_BOLD COLOR_WHITE "  %s\n" COLOR_RESET, title);
    printf(COLOR_BOLD COLOR_BLUE "================================================================================" COLOR_RESET "\n\n");
}

void print_subsection(const char *subtitle) {
    printf(COLOR_BOLD COLOR_CYAN "\n>>> %s\n" COLOR_RESET, subtitle);
}

void print_divider(void) {
    printf(COLOR_DIM "--------------------------------------------------------------------------------\n" COLOR_RESET);
}

static void print_usage(const char *prog_name) {
    printf("Usage: %s [OPTION] [ARGS...]\n\n", prog_name);
    printf("Execution Modes:\n");
    printf("  -b, --batch            Run all modules sequentially\n");
    printf("  -f, --file [DATA]      Run file operations (writes optional DATA)\n");
    printf("  -p, --process          Run process management (fork, exec, wait)\n");
    printf("  -e, --error            Run deliberate error handling\n");
    printf("  -h, --help             Display this help message\n\n");
    printf("Individual System Call Triggers (JSON Output):\n");
    printf("  --open <file> <mode>   Execute open() with mode (r, w, a)\n");
    printf("  --read <file>          Execute read() from file\n");
    printf("  --write <file> <text>  Execute write() to file\n");
    printf("  --close <fd>           Execute close() on file descriptor\n");
    printf("  --fork                 Execute fork() process creation\n");
    printf("  --getpid               Execute getpid()\n");
    printf("  --getppid              Execute getppid()\n");
    printf("  --mkdir <dir>          Execute mkdir()\n");
    printf("  --rmdir <dir>          Execute rmdir()\n");
}

static void run_all_modules(void) {
    execute_file_ops("Automated system call batch data");
    execute_process_ops();
    execute_error_handling();

    print_section_header("PROJECT EXECUTION COMPLETED");
    LOG_SUCCESS("All system call operations executed successfully!");
    LOG_INFO("To trace kernel-level system calls, run under strace via: make trace");
}

/* Individual System Call Dispatcher with JSON formatted telemetry */
static int handle_individual_call(int argc, char *argv[]) {
    double elapsed_ms = 0.0;

    if (strcmp(argv[1], "--open") == 0) {
        const char *filename = (argc > 2) ? argv[2] : "test.txt";
        const char *mode = (argc > 3) ? argv[3] : "r";
        int fd = execute_syscall_open(filename, mode, &elapsed_ms);
        printf("{\"syscall\":\"open\",\"parameter\":\"%s (mode: %s)\",\"return_value\":%d,\"status\":\"%s\",\"duration_ms\":%.3f,\"errno\":%d}\n",
               filename, mode, fd, (fd >= 0 ? "SUCCESS" : "ERROR"), elapsed_ms, (fd < 0 ? errno : 0));
        return (fd >= 0 ? 0 : 1);
    }
    else if (strcmp(argv[1], "--write") == 0) {
        const char *filename = (argc > 2) ? argv[2] : "test.txt";
        const char *content = (argc > 3) ? argv[3] : "System Call Monitoring Data";
        int written = execute_syscall_write(filename, content, &elapsed_ms);
        printf("{\"syscall\":\"write\",\"parameter\":\"%s (bytes: %zu)\",\"return_value\":%d,\"status\":\"%s\",\"duration_ms\":%.3f,\"errno\":%d}\n",
               filename, strlen(content), written, (written >= 0 ? "SUCCESS" : "ERROR"), elapsed_ms, (written < 0 ? errno : 0));
        return (written >= 0 ? 0 : 1);
    }
    else if (strcmp(argv[1], "--read") == 0) {
        const char *filename = (argc > 2) ? argv[2] : "test.txt";
        char buf[FILE_BUFFER_SIZE];
        int bytes_read = execute_syscall_read(filename, buf, sizeof(buf), &elapsed_ms);
        printf("{\"syscall\":\"read\",\"parameter\":\"%s\",\"return_value\":%d,\"status\":\"%s\",\"duration_ms\":%.3f,\"data\":\"%s\",\"errno\":%d}\n",
               filename, bytes_read, (bytes_read >= 0 ? "SUCCESS" : "ERROR"), elapsed_ms, (bytes_read > 0 ? buf : ""), (bytes_read < 0 ? errno : 0));
        return (bytes_read >= 0 ? 0 : 1);
    }
    else if (strcmp(argv[1], "--close") == 0) {
        int fd = (argc > 2) ? atoi(argv[2]) : 3;
        int ret = execute_syscall_close(fd, &elapsed_ms);
        printf("{\"syscall\":\"close\",\"parameter\":\"fd=%d\",\"return_value\":%d,\"status\":\"%s\",\"duration_ms\":%.3f,\"errno\":%d}\n",
               fd, ret, (ret == 0 ? "SUCCESS" : "ERROR"), elapsed_ms, (ret < 0 ? errno : 0));
        return (ret == 0 ? 0 : 1);
    }
    else if (strcmp(argv[1], "--fork") == 0) {
        struct timespec start, end;
        clock_gettime(CLOCK_MONOTONIC, &start);
        pid_t pid = fork();
        clock_gettime(CLOCK_MONOTONIC, &end);
        elapsed_ms = get_time_diff_ms(start, end);

        if (pid == 0) {
            /* In child: exit cleanly */
            _exit(0);
        } else if (pid > 0) {
            int status;
            waitpid(pid, &status, 0);
            printf("{\"syscall\":\"fork\",\"parameter\":\"Parent PID: %d\",\"return_value\":%d,\"status\":\"SUCCESS\",\"duration_ms\":%.3f,\"child_pid\":%d}\n",
                   getpid(), pid, elapsed_ms, pid);
            return 0;
        } else {
            printf("{\"syscall\":\"fork\",\"parameter\":\"none\",\"return_value\":-1,\"status\":\"ERROR\",\"duration_ms\":%.3f,\"errno\":%d}\n",
                   elapsed_ms, errno);
            return 1;
        }
    }
    else if (strcmp(argv[1], "--getpid") == 0) {
        pid_t pid = execute_syscall_getpid(&elapsed_ms);
        printf("{\"syscall\":\"getpid\",\"parameter\":\"none\",\"return_value\":%d,\"status\":\"SUCCESS\",\"duration_ms\":%.3f}\n",
               pid, elapsed_ms);
        return 0;
    }
    else if (strcmp(argv[1], "--getppid") == 0) {
        pid_t ppid = execute_syscall_getppid(&elapsed_ms);
        printf("{\"syscall\":\"getppid\",\"parameter\":\"none\",\"return_value\":%d,\"status\":\"SUCCESS\",\"duration_ms\":%.3f}\n",
               ppid, elapsed_ms);
        return 0;
    }
    else if (strcmp(argv[1], "--mkdir") == 0) {
        const char *dirname = (argc > 2) ? argv[2] : "new_directory";
        int ret = execute_syscall_mkdir(dirname, &elapsed_ms);
        printf("{\"syscall\":\"mkdir\",\"parameter\":\"%s\",\"return_value\":%d,\"status\":\"%s\",\"duration_ms\":%.3f,\"errno\":%d}\n",
               dirname, ret, (ret == 0 ? "SUCCESS" : "ERROR"), elapsed_ms, (ret < 0 ? errno : 0));
        return (ret == 0 ? 0 : 1);
    }
    else if (strcmp(argv[1], "--rmdir") == 0) {
        const char *dirname = (argc > 2) ? argv[2] : "new_directory";
        int ret = execute_syscall_rmdir(dirname, &elapsed_ms);
        printf("{\"syscall\":\"rmdir\",\"parameter\":\"%s\",\"return_value\":%d,\"status\":\"%s\",\"duration_ms\":%.3f,\"errno\":%d}\n",
               dirname, ret, (ret == 0 ? "SUCCESS" : "ERROR"), elapsed_ms, (ret < 0 ? errno : 0));
        return (ret == 0 ? 0 : 1);
    }
    return -1;
}

static void display_interactive_menu(void) {
    int choice = 0;
    char input[64];

    while (1) {
        printf("\n" COLOR_BOLD COLOR_MAGENTA "================== Interactive Execution Menu ==================" COLOR_RESET "\n");
        printf("  " COLOR_BOLD "1." COLOR_RESET " Execute Full Suite (All Modules)\n");
        printf("  " COLOR_BOLD "2." COLOR_RESET " Module 1: File Operations (open, write, read, close)\n");
        printf("  " COLOR_BOLD "3." COLOR_RESET " Module 2: Process Management (fork, execvp, waitpid)\n");
        printf("  " COLOR_BOLD "4." COLOR_RESET " Module 3: Error Handling & errno (ENOENT, EBADF)\n");
        printf("  " COLOR_BOLD "5." COLOR_RESET " Clean Temporary Files\n");
        printf("  " COLOR_BOLD "6." COLOR_RESET " Exit Program\n");
        printf(COLOR_BOLD COLOR_MAGENTA "=================================================================" COLOR_RESET "\n");
        printf(COLOR_CYAN "Enter your selection (1-6): " COLOR_RESET);

        if (!fgets(input, sizeof(input), stdin)) {
            break;
        }

        choice = atoi(input);

        switch (choice) {
            case 1:
                run_all_modules();
                break;
            case 2:
                execute_file_ops(NULL);
                break;
            case 3:
                execute_process_ops();
                break;
            case 4:
                execute_error_handling();
                break;
            case 5:
                LOG_INFO("Removing temporary files...");
                unlink(DEFAULT_TEST_FILE);
                unlink("non_existent_file_99999.xyz");
                LOG_SUCCESS("Cleanup finished.");
                break;
            case 6:
                printf(COLOR_GREEN "Exiting System Call Monitoring System. Goodbye!\n" COLOR_RESET);
                return;
            default:
                LOG_WARN("Invalid choice! Please choose an option from 1 to 6.");
                break;
        }
    }
}

int main(int argc, char *argv[]) {
    setvbuf(stdout, NULL, _IONBF, 0);

    /* If it's an individual syscall invocation (starts with --), handle without banner */
    if (argc > 1 && strncmp(argv[1], "--", 2) == 0 &&
        strcmp(argv[1], "--batch") != 0 && strcmp(argv[1], "-b") != 0 &&
        strcmp(argv[1], "--file") != 0 && strcmp(argv[1], "-f") != 0 &&
        strcmp(argv[1], "--process") != 0 && strcmp(argv[1], "-p") != 0 &&
        strcmp(argv[1], "--error") != 0 && strcmp(argv[1], "-e") != 0 &&
        strcmp(argv[1], "--help") != 0 && strcmp(argv[1], "-h") != 0) {
        
        int call_res = handle_individual_call(argc, argv);
        if (call_res != -1) return call_res;
    }

    print_banner();

    if (argc > 1) {
        if (strcmp(argv[1], "--batch") == 0 || strcmp(argv[1], "-b") == 0) {
            LOG_INFO("Running in non-interactive BATCH mode...");
            run_all_modules();
            return 0;
        } else if (strcmp(argv[1], "--file") == 0 || strcmp(argv[1], "-f") == 0) {
            const char *custom_data = (argc > 2) ? argv[2] : NULL;
            return execute_file_ops(custom_data);
        } else if (strcmp(argv[1], "--process") == 0 || strcmp(argv[1], "-p") == 0) {
            return execute_process_ops();
        } else if (strcmp(argv[1], "--error") == 0 || strcmp(argv[1], "-e") == 0) {
            return execute_error_handling();
        } else if (strcmp(argv[1], "--help") == 0 || strcmp(argv[1], "-h") == 0) {
            print_usage(argv[0]);
            return 0;
        } else {
            LOG_ERROR("Unknown option: %s", argv[1]);
            print_usage(argv[0]);
            return 1;
        }
    }

    display_interactive_menu();
    return 0;
}
