/**
 * ============================================================================
 * Project: System Call Demonstration and Monitoring System
 * File: child_worker.c
 * Description: Standalone worker program invoked via execvp() by the child
 *              process to demonstrate address space replacement, PID retention,
 *              and passing of exit status back to the waiting parent.
 * ============================================================================
 */

#include "common.h"

int main(int argc, char *argv[]) {
    setvbuf(stdout, NULL, _IONBF, 0);
    printf("\n");
    printf(COLOR_MAGENTA "  +-------------------------------------------------------------+\n");
    printf("  | [CHILD WORKER PROGRAM EXECUTING UNDER execvp()]             |\n");
    printf("  +-------------------------------------------------------------+\n" COLOR_RESET);

    pid_t current_pid = getpid();
    pid_t parent_pid = getppid();

    printf(COLOR_CYAN "  [Child Worker Image]" COLOR_RESET "\n");
    printf("    -> Process ID (PID)         : " COLOR_BOLD "%d" COLOR_RESET " (Retained from fork)\n", current_pid);
    printf("    -> Parent Process ID (PPID) : " COLOR_BOLD "%d" COLOR_RESET "\n", parent_pid);
    printf("    -> Argument count (argc)    : %d\n", argc);

    for (int i = 0; i < argc; i++) {
        printf("       argv[%d] = %s\n", i, argv[i]);
    }

    printf("\n  " COLOR_YELLOW "[Child Worker Workload]" COLOR_RESET " Simulating lightweight computation...\n");
    /* Short pause to make parent-child concurrency visible in process table */
    usleep(250000); /* 250 ms */

    int exit_code = 42;
    printf("  " COLOR_GREEN "[Child Worker Terminating]" COLOR_RESET " Exiting cleanly with exit code %d...\n\n", exit_code);
    return exit_code;
}
