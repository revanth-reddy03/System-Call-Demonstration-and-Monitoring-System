#!/usr/bin/env bash
# ==============================================================================
# Script: test_runner.sh
# Project: System Call Demonstration and Monitoring System
# Course:  Operating Systems and Systems Programming (25CS2104E)
# Team 18: Akhil AD, Revanth Reddy, Advik
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

GREEN='\033[1;32m'
RED='\033[1;31m'
CYAN='\033[1;36m'
BOLD='\033[1m'
RESET='\033[0m'

PASSED=0
FAILED=0

run_test() {
    local test_name="$1"
    local command="$2"

    echo -ne "  [TEST] ${test_name} ... "
    if eval "${command}" > /dev/null 2>&1; then
        echo -e "${GREEN}PASSED${RESET}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}FAILED${RESET}"
        FAILED=$((FAILED + 1))
    fi
}

echo -e "\n${CYAN}======================================================================${RESET}"
echo -e "${BOLD}         AUTOMATED TEST SUITE: SYSTEM CALL DEMONSTRATION${RESET}"
echo -e "${CYAN}======================================================================${RESET}\n"

cd "${ROOT_DIR}"

run_test "Clean build via make clean && make all" "make clean && make all"
run_test "Verify binary existence (sys_call_demo & child_worker)" "[ -x sys_call_demo ] && [ -x child_worker ]"
run_test "Test command line help flag (--help)" "./sys_call_demo --help"
run_test "Test File Operations Module (--file)" "./sys_call_demo --file"
run_test "Verify created demonstration file (sys_demo_testfile.txt)" "[ -f sys_demo_testfile.txt ] && [ -s sys_demo_testfile.txt ]"
run_test "Test Process Management Module (--process)" "./sys_call_demo --process"
run_test "Test Error Handling & errno Module (--error)" "./sys_call_demo --error"
run_test "Test Full Batch Execution Mode (--batch)" "./sys_call_demo --batch"
run_test "Test Tracing Script Execution (scripts/run_trace.sh)" "./scripts/run_trace.sh"
run_test "Verify generated trace files (all, filtered, summary)" "[ -s traces/trace_all.log ] && [ -s traces/trace_filtered.log ] && [ -s traces/trace_summary.log ]"
run_test "Test Trace Analyzer (scripts/analyze_trace.py)" "python3 scripts/analyze_trace.py traces/trace_filtered.log"
run_test "Verify generated Markdown report (trace_report.md)" "[ -s trace_report.md ]"

echo -e "\n${CYAN}----------------------------------------------------------------------${RESET}"
echo -e "${BOLD}Test Results Summary:${RESET} ${GREEN}${PASSED} Passed${RESET}, ${RED}${FAILED} Failed${RESET}"
echo -e "${CYAN}======================================================================${RESET}\n"

if [ ${FAILED} -ne 0 ]; then
    exit 1
fi
exit 0
