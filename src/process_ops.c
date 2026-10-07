/**
 * ============================================================================
 * Project: System Call Monitoring and Execution System
 * File: process_ops.c
 * Description: Implementation of process management system calls:
 *              fork, execvp, waitpid, getpid, getppid with timing.
 * ============================================================================
 */

#include "process_ops.h"

pid_t execute_syscall_fork(double *elapsed_ms) {
    struct timespec start, end;
    fflush(stdout);
    fflush(stderr);

    clock_gettime(CLOCK_MONOTONIC, &start);
    pid_t pid = fork();
    clock_gettime(CLOCK_MONOTONIC, &end);

    if (elapsed_ms) {
        *elapsed_ms = get_time_diff_ms(start, end);
    }
    return pid;
}

int execute_syscall_exec(const char *binary, char *const argv[], double *elapsed_ms) {
    struct timespec start, end;
    fflush(stdout);
    fflush(stderr);

    clock_gettime(CLOCK_MONOTONIC, &start);
    int ret = execvp(binary, argv);
    clock_gettime(CLOCK_MONOTONIC, &end);

    if (elapsed_ms) {
        *elapsed_ms = get_time_diff_ms(start, end);
    }
    return ret;
}

pid_t execute_syscall_wait(int *exit_status, double *elapsed_ms) {
    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);
    pid_t waited = waitpid(-1, exit_status, 0);
    clock_gettime(CLOCK_MONOTONIC, &end);

    if (elapsed_ms) {
        *elapsed_ms = get_time_diff_ms(start, end);
    }
    return waited;
}

pid_t execute_syscall_getpid(double *elapsed_ms) {
    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);
    pid_t pid = getpid();
    clock_gettime(CLOCK_MONOTONIC, &end);

    if (elapsed_ms) {
        *elapsed_ms = get_time_diff_ms(start, end);
    }
    return pid;
}

pid_t execute_syscall_getppid(double *elapsed_ms) {
    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);
    pid_t ppid = getppid();
    clock_gettime(CLOCK_MONOTONIC, &end);

    if (elapsed_ms) {
        *elapsed_ms = get_time_diff_ms(start, end);
    }
    return ppid;
}

int execute_process_ops(void) {
    print_section_header("MODULE 2: PROCESS MANAGEMENT");

    pid_t pid;
    int status;
    double fork_ms = 0.0, wait_ms = 0.0;

    print_subsection("Step 2.1: Process Creation using fork()");
    LOG_INFO("Parent Process (PID: %d) preparing to fork a child process...", getpid());
    LOG_KERNEL("Kernel creates new Process Control Block (task_struct) and duplicates address space via Copy-On-Write (COW)");

    pid = execute_syscall_fork(&fork_ms);

    if (pid < 0) {
        LOG_ERROR("fork() system call failed!");
        perror("  [perror] fork");
        return -1;
    } else if (pid == 0) {
        /* Child context */
        printf("\n" COLOR_CYAN "[CHILD CONTEXT]" COLOR_RESET "\n");
        printf("  - Child PID               : %d\n", getpid());
        printf("  - Parent PID reported     : %d\n", getppid());
        printf("  - fork() returned to child: 0\n");

        print_subsection("Step 2.2: Program Image Replacement using execvp()");
        LOG_INFO("Child replacing memory image with './child_worker'...");
        LOG_KERNEL("Kernel clears current text/data/bss/heap/stack segments and loads ELF binary");

        char *child_args[] = {
            "./child_worker",
            "--mode=active",
            "--term=2026-27",
            NULL
        };

        fflush(stdout);
        fflush(stderr);
        execvp(child_args[0], child_args);

        LOG_ERROR("execvp() failed to execute '%s'", child_args[0]);
        perror("  [perror] execvp");
        exit(EXIT_FAILURE);
    } else {
        /* Parent context */
        printf("\n" COLOR_YELLOW "[PARENT CONTEXT]" COLOR_RESET "\n");
        printf("  - Parent PID                : %d\n", getpid());
        printf("  - fork() returned to parent : %d (Child PID) (Time: %.3f ms)\n", pid, fork_ms);

        print_subsection("Step 2.3: Process Synchronization using waitpid()");
        LOG_INFO("Parent blocking on waitpid(PID=%d) to wait for child completion...", pid);
        LOG_KERNEL("Kernel changes parent state from TASK_RUNNING to TASK_INTERRUPTIBLE until child exits");

        struct timespec w_start, w_end;
        clock_gettime(CLOCK_MONOTONIC, &w_start);
        pid_t waited_pid = waitpid(pid, &status, 0);
        clock_gettime(CLOCK_MONOTONIC, &w_end);
        wait_ms = get_time_diff_ms(w_start, w_end);

        if (waited_pid == -1) {
            LOG_ERROR("waitpid() failed on PID %d", pid);
            perror("  [perror] waitpid");
            return -1;
        }

        LOG_SUCCESS("Parent detected child process (PID: %d) termination (Time: %.3f ms).", waited_pid, wait_ms);

        print_subsection("Step 2.4: Exit Status Inspection via POSIX Macros");
        if (WIFEXITED(status)) {
            int exit_code = WEXITSTATUS(status);
            LOG_SUCCESS("Child process terminated normally (WIFEXITED = true).");
            LOG_SUCCESS("Child Exit Code retrieved (WEXITSTATUS) : " COLOR_BOLD "%d" COLOR_RESET, exit_code);
            if (exit_code == 42) {
                LOG_INFO("Confirmed: Child worker exited with expected code 42!");
            }
        } else if (WIFSIGNALED(status)) {
            int sig = WTERMSIG(status);
            LOG_WARN("Child process terminated abnormally by signal (WTERMSIG: %d)", sig);
        }

        LOG_INFO("Operating System Insight:");
        printf("     - Calling waitpid() collected child termination status.\n");
        printf("     - This prevented child from remaining a 'Zombie' (<defunct>) process.\n");
        printf("     - Kernel has now fully deallocated the child's PCB and entry in the task list.\n");

        LOG_SUCCESS("Process management completed successfully.\n");
    }

    return 0;
}
