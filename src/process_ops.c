/**
 * ============================================================================
 * Project: System Call Demonstration and Monitoring System
 * File: process_ops.c
 * Description: Implementation of process management system calls:
 *              fork(), execvp(), and waitpid() with detailed examination of
 *              parent/child concurrency, memory replacement, and status macros.
 * ============================================================================
 */

#include "process_ops.h"

int demonstrate_process_ops(void) {
    print_section_header("MODULE 2: PROCESS MANAGEMENT DEMONSTRATION");

    pid_t pid;
    int status;

    print_subsection("Step 2.1: Process Creation using fork()");
    LOG_INFO("Parent Process (PID: %d) preparing to fork a child process...", getpid());
    LOG_KERNEL("Kernel creates new Process Control Block (task_struct) and duplicates address space via Copy-On-Write (COW)");

    fflush(stdout);
    fflush(stderr);
    pid = fork();

    if (pid < 0) {
        /* Fork failed */
        LOG_ERROR("fork() system call failed!");
        perror("  [perror] fork");
        return -1;
    } else if (pid == 0) {
        /* ---------------------------------------------------------
         * CHILD PROCESS CONTEXT
         * --------------------------------------------------------- */
        printf("\n" COLOR_CYAN "[CHILD CONTEXT]" COLOR_RESET "\n");
        printf("  - Child PID             : %d\n", getpid());
        printf("  - Parent PID reported   : %d\n", getppid());
        printf("  - fork() returned to child: 0\n");

        print_subsection("Step 2.2: Program Image Replacement using execvp()");
        LOG_INFO("Child preparing to replace its memory image with './child_worker'...");
        LOG_KERNEL("Kernel clears current text/data/bss/heap/stack segments and loads ELF binary");

        char *child_args[] = {
            "./child_worker",
            "--source=sys_call_demo",
            "--term=2026-27",
            NULL
        };

        fflush(stdout);
        fflush(stderr);
        /* Attempt to execute child_worker */
        execvp(child_args[0], child_args);

        /* If execvp succeeds, execution NEVER reaches this line. */
        /* If we are here, execvp failed! */
        LOG_ERROR("execvp() failed to execute '%s'", child_args[0]);
        perror("  [perror] execvp");
        exit(EXIT_FAILURE);
    } else {
        /* ---------------------------------------------------------
         * PARENT PROCESS CONTEXT
         * --------------------------------------------------------- */
        printf("\n" COLOR_YELLOW "[PARENT CONTEXT]" COLOR_RESET "\n");
        printf("  - Parent PID              : %d\n", getpid());
        printf("  - fork() returned to parent: %d (Child PID)\n", pid);

        print_subsection("Step 2.3: Process Synchronization using waitpid()");
        LOG_INFO("Parent blocking on waitpid(PID=%d) to wait for child completion...", pid);
        LOG_KERNEL("Kernel changes parent process state from TASK_RUNNING to TASK_INTERRUPTIBLE until child exits");

        pid_t waited_pid = waitpid(pid, &status, 0);

        if (waited_pid == -1) {
            LOG_ERROR("waitpid() system call failed on PID %d", pid);
            perror("  [perror] waitpid");
            return -1;
        }

        LOG_SUCCESS("Parent detected child process (PID: %d) termination.", waited_pid);

        /* Inspect exit status using POSIX macros */
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
        } else {
            LOG_WARN("Child process ended under unknown condition.");
        }

        LOG_INFO("Operating System Insight:");
        printf("     - Calling waitpid() collected child termination status.\n");
        printf("     - This prevented child from remaining a 'Zombie' (<defunct>) process.\n");
        printf("     - Kernel has now fully deallocated the child's PCB and entry in the task list.\n");

        LOG_SUCCESS("Process management demonstration completed successfully.\n");
    }

    return 0;
}
