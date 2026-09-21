#!/usr/bin/env bash
# ==============================================================================
# Script: run_trace.sh
# Project: System Call Demonstration and Monitoring System
# Course:  Operating Systems and Systems Programming (25CS2104E)
# Team 18: Akhil AD, Revanth Reddy, Advik
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TRACES_DIR="${ROOT_DIR}/traces"
BINARY="${ROOT_DIR}/sys_call_demo"

# Terminal formatting
BOLD='\033[1m'
GREEN='\033[1;32m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
RESET='\033[0m'

echo -e "${CYAN}======================================================================${RESET}"
echo -e "${BOLD}       SYSTEM CALL MONITORING & TRACING ENGINE (strace)${RESET}"
echo -e "${CYAN}======================================================================${RESET}"

# Verify strace is available
if ! command -v strace >/dev/null 2>&1; then
    echo -e "${YELLOW}[ERROR] 'strace' is not installed or not in PATH.${RESET}"
    echo "Install it via: sudo apt-get install strace"
    exit 1
fi

# Ensure binary is built
if [ ! -f "${BINARY}" ]; then
    echo -e "${YELLOW}[INFO] Binary not found. Building project...${RESET}"
    make -C "${ROOT_DIR}" all
fi

mkdir -p "${TRACES_DIR}"

TRACE_ALL="${TRACES_DIR}/trace_all.log"
TRACE_FILTERED="${TRACES_DIR}/trace_filtered.log"
TRACE_SUMMARY="${TRACES_DIR}/trace_summary.log"

echo -e "\n${BOLD}[1/3] Capturing Full System Call Trace (-f follow forks)...${RESET}"
strace -f -s 128 -o "${TRACE_ALL}" "${BINARY}" --batch > /dev/null 2>&1 || true
echo -e "  -> Saved to: ${GREEN}${TRACE_ALL}${RESET} ($(wc -l < "${TRACE_ALL}") syscall events)"

echo -e "\n${BOLD}[2/3] Capturing Focused Trace for Required Course System Calls...${RESET}"
# Filter: file operations (openat, read, write, close), process management (clone, fork, execve, wait4, exit_group)
strace -f -s 64 -e trace=openat,read,write,close,clone,fork,execve,wait4,exit_group -o "${TRACE_FILTERED}" "${BINARY}" --batch > /dev/null 2>&1 || true
echo -e "  -> Saved to: ${GREEN}${TRACE_FILTERED}${RESET} ($(wc -l < "${TRACE_FILTERED}") relevant syscall events)"

echo -e "\n${BOLD}[3/3] Generating Syscall Statistical Summary (-c profiling)...${RESET}"
strace -f -c -o "${TRACE_SUMMARY}" "${BINARY}" --batch > /dev/null 2>&1 || true
echo -e "  -> Saved to: ${GREEN}${TRACE_SUMMARY}${RESET}"

echo -e "\n${CYAN}----------------------------------------------------------------------${RESET}"
echo -e "${BOLD}Syscall Profile Summary:${RESET}"
echo -e "${CYAN}----------------------------------------------------------------------${RESET}"
cat "${TRACE_SUMMARY}"

echo -e "\n${GREEN}======================================================================${RESET}"
echo -e "${BOLD}${GREEN}[SUCCESS] strace monitoring complete!${RESET}"
echo -e "Run ${BOLD}'make analyze'${RESET} or ${BOLD}'python3 scripts/analyze_trace.py'${RESET} for detailed report."
echo -e "${GREEN}======================================================================${RESET}\n"
