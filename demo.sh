#!/usr/bin/env bash
# ==============================================================================
# Script: demo.sh
# Project: System Call Demonstration and Monitoring System
# Course:  Operating Systems and Systems Programming (25CS2104E)
# Team 18: Akhil AD, Revanth Reddy, Advik
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# ANSI Colors
BOLD='\033[1m'
GREEN='\033[1;32m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
MAGENTA='\033[1;35m'
BLUE='\033[1;34m'
RESET='\033[0m'

print_header() {
    clear 2>/dev/null || true
    echo -e "${CYAN}================================================================================${RESET}"
    echo -e "${BOLD}         SYSTEM CALL DEMONSTRATION & MONITORING SYSTEM${RESET}"
    echo -e "${CYAN}         Course:  Operating Systems & Systems Programming (25CS2104E)${RESET}"
    echo -e "${CYAN}         Section: 03 | Team: 18 | Faculty Guide: Dr. K. Hema${RESET}"
    echo -e "${CYAN}         Authors: Akhil AD, Revanth Reddy, Advik${RESET}"
    echo -e "${CYAN}================================================================================${RESET}\n"
}

run_full_pipeline() {
    print_header
    echo -e "${BOLD}${MAGENTA}>>> [STEP 1/5] CLEANING & COMPILING PROJECT...${RESET}"
    make clean && make all
    echo -e "\n${GREEN}[OK] Build completed successfully.${RESET}\n"
    sleep 1

    echo -e "${BOLD}${MAGENTA}>>> [STEP 2/5] RUNNING 12-STAGE AUTOMATED TEST SUITE...${RESET}"
    make test
    echo -e "\n${GREEN}[OK] All unit tests passed.${RESET}\n"
    sleep 1

    echo -e "${BOLD}${MAGENTA}>>> [STEP 3/5] RUNNING SYSTEM CALL DEMONSTRATIONS (BATCH MODE)...${RESET}"
    ./sys_call_demo --batch
    echo -e "\n${GREEN}[OK] Demonstrations completed successfully.${RESET}\n"
    sleep 1

    echo -e "${BOLD}${MAGENTA}>>> [STEP 4/5] PROFILING KERNEL BOUNDARY WITH strace...${RESET}"
    make trace
    echo -e "\n${GREEN}[OK] strace profiling completed.${RESET}\n"
    sleep 1

    echo -e "${BOLD}${MAGENTA}>>> [STEP 5/5] RUNNING AUTOMATED TRACE ANALYZER...${RESET}"
    make analyze

    echo -e "\n${GREEN}================================================================================${RESET}"
    echo -e "${BOLD}${GREEN}  ALL-IN-ONE PIPELINE COMPLETED SUCCESSFULLY!${RESET}"
    echo -e "  - Binaries built: sys_call_demo, child_worker"
    echo -e "  - Automated tests: 12/12 Passed"
    echo -e "  - Trace logs generated: traces/trace_summary.log, traces/trace_filtered.log"
    echo -e "  - Academic analysis report: trace_report.md"
    echo -e "${GREEN}================================================================================${RESET}\n"
}

# If --auto or -a flag is passed, execute the full pipeline directly
if [ "$1" == "--auto" ] || [ "$1" == "-a" ] || [ "$1" == "auto" ]; then
    run_full_pipeline
    exit 0
fi

# Otherwise, present the unified interactive master menu
while true; do
    print_header
    echo -e "${BOLD}Select an action to execute:${RESET}"
    echo -e "  ${BOLD}${GREEN}1.${RESET} ${BOLD}Run Complete End-to-End Pipeline${RESET} (Build -> Test -> Demo -> Trace -> Report)"
    echo -e "  ${BOLD}2.${RESET} Clean & Recompile Project (make clean && make all)"
    echo -e "  ${BOLD}3.${RESET} Run 12-Stage Automated Test Suite (make test)"
    echo -e "  ${BOLD}4.${RESET} Launch Interactive Demo Menu (File I/O, Process, Error)"
    echo -e "  ${BOLD}5.${RESET} Run Kernel Monitoring with strace (make trace)"
    echo -e "  ${BOLD}6.${RESET} Run Trace Analyzer & View Report (make analyze)"
    echo -e "  ${BOLD}7.${RESET} Clean Temporary Files (make clean)"
    echo -e "  ${BOLD}8.${RESET} Exit"
    echo -e "${CYAN}--------------------------------------------------------------------------------${RESET}"
    read -rp "Enter choice (1-8): " choice

    case $choice in
        1)
            run_full_pipeline
            read -rp "Press Enter to return to menu..."
            ;;
        2)
            make clean && make all
            read -rp "Press Enter to return to menu..."
            ;;
        3)
            make test
            read -rp "Press Enter to return to menu..."
            ;;
        4)
            make run
            read -rp "Press Enter to return to menu..."
            ;;
        5)
            make trace
            read -rp "Press Enter to return to menu..."
            ;;
        6)
            make analyze
            read -rp "Press Enter to return to menu..."
            ;;
        7)
            make clean
            echo -e "${GREEN}Cleaned all build artifacts and traces.${RESET}"
            read -rp "Press Enter to return to menu..."
            ;;
        8)
            echo -e "${GREEN}Goodbye!${RESET}"
            exit 0
            ;;
        *)
            echo -e "${YELLOW}Invalid option. Please choose 1-8.${RESET}"
            sleep 1
            ;;
    esac
done
