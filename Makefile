# ==============================================================================
# Makefile: System Call Demonstration and Monitoring System
# Course:   Operating Systems and Systems Programming (25CS2104E)
# Team 18:  Akhil AD, Revanth Reddy, Advik
# ==============================================================================

CC = gcc
CFLAGS = -Wall -Wextra -O2 -pedantic -Iinclude
SRC_DIR = src
INC_DIR = include
BUILD_DIR = build
TRACES_DIR = traces

MAIN_TARGET = sys_call_demo
CHILD_TARGET = child_worker

SRCS = $(SRC_DIR)/main.c $(SRC_DIR)/file_ops.c $(SRC_DIR)/process_ops.c $(SRC_DIR)/error_demo.c
OBJS = $(BUILD_DIR)/main.o $(BUILD_DIR)/file_ops.o $(BUILD_DIR)/process_ops.o $(BUILD_DIR)/error_demo.o
CHILD_SRC = $(SRC_DIR)/child_worker.c

.PHONY: all clean run run-batch trace analyze test help

all: $(BUILD_DIR) $(MAIN_TARGET) $(CHILD_TARGET)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c
	$(CC) $(CFLAGS) -c $< -o $@

$(MAIN_TARGET): $(OBJS)
	$(CC) $(CFLAGS) $(OBJS) -o $@

$(CHILD_TARGET): $(CHILD_SRC)
	$(CC) $(CFLAGS) $< -o $@

run: all
	./$(MAIN_TARGET)

run-batch: all
	./$(MAIN_TARGET) --batch

trace: all
	@chmod +x scripts/run_trace.sh
	./scripts/run_trace.sh

analyze: trace
	@if command -v python3 >/dev/null 2>&1; then \
		python3 scripts/analyze_trace.py traces/trace_filtered.log; \
	elif command -v python >/dev/null 2>&1; then \
		python scripts/analyze_trace.py traces/trace_filtered.log; \
	else \
		echo "Python is required for trace analysis."; \
	fi

test: all
	@chmod +x tests/test_runner.sh
	./tests/test_runner.sh

clean:
	rm -rf $(BUILD_DIR) $(MAIN_TARGET) $(CHILD_TARGET) sys_demo_testfile.txt non_existent_file_99999.xyz $(TRACES_DIR)/*.log trace_report.md

help:
	@echo "Available Makefile targets:"
	@echo "  make            - Build both main demo and child worker binaries"
	@echo "  make run        - Launch interactive CLI menu"
	@echo "  make run-batch  - Run all demo modules non-interactively"
	@echo "  make trace      - Run under strace to monitor system calls"
	@echo "  make analyze    - Trace and parse logs into structured report"
	@echo "  make test       - Execute automated test suite"
	@echo "  make clean      - Remove build artifacts, traces, and temporary files"
