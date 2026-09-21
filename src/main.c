/**
 * ============================================================================
 * Project: System Call Demonstration and Monitoring System
 * Course:  Operating Systems and Systems Programming (25CS2104E)
 * Term:    2026-27, Term-I
 * Section: 03 | Team: 18
 * Authors: Akhil AD (2520030423)
 *          Revanth Reddy (2520030424)
 *          Advik (2520039623)
 * Faculty: Dr. K. Hema
 * ============================================================================
 * File: main.c
 * Description: Main entry point providing an interactive menu and CLI batch
 *              modes for demonstrating Linux system calls and kernel transitions.
 * ============================================================================
 */

#include "common.h"
#include "file_ops.h"
#include "process_ops.h"
#include "error_demo.h"

void print_banner(void) {
    printf("\n");
    printf(COLOR_CYAN "================================================================================\n" COLOR_RESET);
    printf(COLOR_BOLD COLOR_WHITE "      SYSTEM CALL DEMONSTRATION AND MONITORING SYSTEM\n" COLOR_RESET);
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
    printf("Usage: %s [OPTION]\n\n", prog_name);
    printf("Options:\n");
    printf("  -b, --batch       Run all demonstration modules sequentially (non-interactive)\n");
    printf("  -f, --file        Run file operations module only (open, write, read, close)\n");
    printf("  -p, --process     Run process management module only (fork, execvp, waitpid)\n");
    printf("  -e, --error       Run error handling module only (errno, perror, strerror)\n");
    printf("  -h, --help        Display this help message\n");
    printf("\nIf no option is provided, an interactive menu will be displayed.\n");
}

static void run_all_modules(void) {
    demonstrate_file_ops();
    demonstrate_process_ops();
    demonstrate_error_handling();

    print_section_header("PROJECT EXECUTION COMPLETED");
    LOG_SUCCESS("All system call demonstrations completed successfully!");
    LOG_INFO("To trace kernel-level system calls, run under strace via: make trace");
}

static void display_interactive_menu(void) {
    int choice = 0;
    char input[64];

    while (1) {
        printf("\n" COLOR_BOLD COLOR_MAGENTA "================== Interactive Demonstration Menu ==================" COLOR_RESET "\n");
        printf("  " COLOR_BOLD "1." COLOR_RESET " Run Full Demonstration (All Modules)\n");
        printf("  " COLOR_BOLD "2." COLOR_RESET " Module 1: File Operations (open, write, read, close)\n");
        printf("  " COLOR_BOLD "3." COLOR_RESET " Module 2: Process Management (fork, execvp, waitpid)\n");
        printf("  " COLOR_BOLD "4." COLOR_RESET " Module 3: Error Handling & errno (ENOENT, EBADF)\n");
        printf("  " COLOR_BOLD "5." COLOR_RESET " Clean Temporary Demonstration Files\n");
        printf("  " COLOR_BOLD "6." COLOR_RESET " Exit Program\n");
        printf(COLOR_BOLD COLOR_MAGENTA "====================================================================" COLOR_RESET "\n");
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
                demonstrate_file_ops();
                break;
            case 3:
                demonstrate_process_ops();
                break;
            case 4:
                demonstrate_error_handling();
                break;
            case 5:
                LOG_INFO("Removing temporary demonstration files...");
                unlink(DEMO_FILE_PATH);
                unlink("non_existent_file_99999.xyz");
                LOG_SUCCESS("Cleanup finished.");
                break;
            case 6:
                printf(COLOR_GREEN "Exiting System Call Demonstration System. Goodbye!\n" COLOR_RESET);
                return;
            default:
                LOG_WARN("Invalid choice! Please choose an option from 1 to 6.");
                break;
        }
    }
}

int main(int argc, char *argv[]) {
    /* Disable buffering on stdout to ensure strict sequential synchronization with stderr */
    setvbuf(stdout, NULL, _IONBF, 0);

    print_banner();

    if (argc > 1) {
        if (strcmp(argv[1], "--batch") == 0 || strcmp(argv[1], "-b") == 0) {
            LOG_INFO("Running in non-interactive BATCH mode...");
            run_all_modules();
            return 0;
        } else if (strcmp(argv[1], "--file") == 0 || strcmp(argv[1], "-f") == 0) {
            return demonstrate_file_ops();
        } else if (strcmp(argv[1], "--process") == 0 || strcmp(argv[1], "-p") == 0) {
            return demonstrate_process_ops();
        } else if (strcmp(argv[1], "--error") == 0 || strcmp(argv[1], "-e") == 0) {
            return demonstrate_error_handling();
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
