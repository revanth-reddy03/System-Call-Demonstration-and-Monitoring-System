

#ifndef COMMON_H
#define COMMON_H

#define _GNU_SOURCE
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <fcntl.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <stdbool.h>
#include <time.h>

static inline double get_time_diff_ms(struct timespec start, struct timespec end) {
    return (end.tv_sec - start.tv_sec) * 1000.0 + (end.tv_nsec - start.tv_nsec) / 1000000.0;
}

/* ANSI Terminal Color Codes for clear, educational output */
#define COLOR_RESET   "\033[0m"
#define COLOR_BOLD    "\033[1m"
#define COLOR_DIM     "\033[2m"

#define COLOR_RED     "\033[1;31m"
#define COLOR_GREEN   "\033[1;32m"
#define COLOR_YELLOW  "\033[1;33m"
#define COLOR_BLUE    "\033[1;34m"
#define COLOR_MAGENTA "\033[1;35m"
#define COLOR_CYAN    "\033[1;36m"
#define COLOR_WHITE   "\033[1;37m"

/* Logging Macros with visual indicators */
#define LOG_INFO(fmt, ...) \
    printf(COLOR_CYAN "[INFO]" COLOR_RESET " " fmt "\n", ##__VA_ARGS__)

#define LOG_SUCCESS(fmt, ...) \
    printf(COLOR_GREEN "[SUCCESS]" COLOR_RESET " " fmt "\n", ##__VA_ARGS__)

#define LOG_WARN(fmt, ...) \
    printf(COLOR_YELLOW "[WARNING]" COLOR_RESET " " fmt "\n", ##__VA_ARGS__)

#define LOG_ERROR(fmt, ...) \
    printf(COLOR_RED "[ERROR]" COLOR_RESET " " fmt "\n", ##__VA_ARGS__)

#define LOG_KERNEL(fmt, ...) \
    printf(COLOR_MAGENTA "[KERNEL-BOUNDARY]" COLOR_RESET " " fmt "\n", ##__VA_ARGS__)

#define LOG_SYSCALL(name, args, ret) \
    printf(COLOR_YELLOW "  >> SYSCALL: " COLOR_BOLD "%s(%s)" COLOR_RESET \
           " => Return: " COLOR_GREEN "%s" COLOR_RESET "\n", name, args, ret)

/* Function prototypes for presentation formatting */
void print_banner(void);
void print_section_header(const char *title);
void print_subsection(const char *subtitle);
void print_divider(void);

#endif /* COMMON_H */
