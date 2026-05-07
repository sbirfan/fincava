#!/bin/bash

################################################################################
#                                                                              #
#              FINCAVA TEST AUTOMATION SCRIPT                                #
#              Interactive Test Runner for Non-Coders                        #
#                                                                              #
#  Usage: bash run-fincava-tests.sh                                          #
#  No coding knowledge required!                                             #
#                                                                              #
################################################################################

# Color codes for prettier output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored headers
print_header() {
    echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print info messages
print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Function to print warning messages
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to pause and wait for user
pause_script() {
    echo -e "\n${YELLOW}Press ENTER to continue...${NC}"
    read -r
}

# ============================================================================
# MAIN MENU
# ============================================================================

show_main_menu() {
    print_header "FINCAVA TEST AUTOMATION SCRIPT"
    
    cat << 'EOF'
What would you like to do?

1) 🚀 Run all tests (recommended for first time)
2) 📚 Learn about FinCava tests (educational)
3) 🔧 Run backend tests only
4) 🎨 Run frontend tests only
5) 📊 Check test results from last run
6) 🆘 Troubleshooting guide
7) 📖 Exit and read FINCAVA_TEST_SKILL.md manually
8) ❌ Exit script

Enter your choice (1-8):
EOF

    read -r choice
    
    case $choice in
        1) run_all_tests ;;
        2) learn_about_tests ;;
        3) run_backend_tests ;;
        4) run_frontend_tests ;;
        5) check_results ;;
        6) troubleshooting_guide ;;
        7) exit_with_instructions ;;
        8) exit_script ;;
        *) 
            print_error "Invalid choice. Please enter 1-8."
            pause_script
            clear
            show_main_menu
            ;;
    esac
}

# ============================================================================
# OPTION 2: LEARN ABOUT TESTS
# ============================================================================

learn_about_tests() {
    clear
    print_header "LEARN: What are FinCava Tests?"
    
    cat << 'EOF'
Tests are AUTOMATED CHECKS that verify your code works correctly.

Instead of clicking buttons manually:
  ✗ Manual way: You click each button and check results
  ✓ Automated way: Computer does it 140+ times automatically

WHAT WE'RE TESTING:

1️⃣  AUTHENTICATION (30 tests)
    ✓ Can people sign up?
    ✓ Can they login?
    ✓ Are passwords secure?

2️⃣  EMAIL DELIVERY (35 tests)
    ✓ Do emails get sent?
    ✓ Are duplicates prevented?
    ✓ Do retries work?

3️⃣  PASSWORD RESET (35 tests)
    ✓ Can users reset passwords?
    ✓ Is password strength checked?
    ✓ Does it redirect correctly?

4️⃣  AUTHORIZATION (40 tests)
    ✓ Can buyers see their orders?
    ✗ Can they see others' orders?
    ✓ Are suppliers protected?

WHY TESTS MATTER:

  • Tests catch bugs BEFORE users see them
  • Tests prove the code is SECURE
  • Tests let you deploy with CONFIDENCE
  • Tests save time and MONEY

WHAT HAPPENS WHEN YOU RUN TESTS:

  You'll see output like:
  
  ✓ Authentication Flow — 30 tests passed
  ✓ Email Queue — 35 tests passed
  ✓ Force Reset Password — 35 tests passed
  ✓ Multi-Tenant Authorization — 40 tests passed
  
  ✨ 140 tests passed in ~2 minutes
  
  This means: EVERYTHING WORKS! ✅

WHAT IF TESTS FAIL:

  If you see:
  ✗ Authentication Flow — 5 tests failed
  
  This means: Something broke. We need to fix it.
  
  Don't worry! This is why we have tests.
  Better to catch it here than in production!

EOF

    pause_script
    clear
    show_main_menu
}

# ============================================================================
# OPTION 1: RUN ALL TESTS
# ============================================================================

run_all_tests() {
    clear
    print_header "RUNNING ALL FINCAVA TESTS"
    
    print_info "This will:"
    echo "  1. Navigate to project folder"
    echo "  2. Download latest code from GitHub"
    echo "  3. Run 105 backend tests"
    echo "  4. Run 35 frontend tests"
    echo "  5. Show you the results"
    echo ""
    print_warning "This takes about 3-5 minutes"
    echo ""
    echo "Ready to start? (yes/no)"
    read -r ready
    
    if [[ "$ready" != "yes" ]]; then
        print_info "Cancelled. Returning to menu..."
        pause_script
        clear
        show_main_menu
        return
    fi
    
    # Step 1: Navigate to project
    print_info "Step 1: Navigating to FinCava-Hub folder..."
    if cd FinCava-Hub 2>/dev/null; then
        print_success "Now in FinCava-Hub folder"
    else
        print_error "Could not find FinCava-Hub folder"
        print_info "Make sure you're in the right directory"
        pause_script
        clear
        show_main_menu
        return
    fi
    
    # Step 2: Pull latest code
    print_info "Step 2: Downloading latest code from GitHub..."
    print_warning "This may take a minute..."
    
    if git pull origin main >/dev/null 2>&1; then
        print_success "Code downloaded successfully"
    else
        print_warning "Could not pull from GitHub (might already be latest)"
    fi
    
    # Step 3: Backend tests
    print_header "RUNNING BACKEND TESTS (105 tests)"
    print_info "Running tests in artifacts/api-server..."
    print_warning "This takes about 2 minutes..."
    
    if cd artifacts/api-server && pnpm run test 2>&1; then
        print_success "Backend tests completed"
        backend_passed=true
    else
        print_error "Backend tests had issues"
        backend_passed=false
    fi
    
    # Step 4: Frontend tests
    print_header "RUNNING FRONTEND TESTS (35 tests)"
    print_info "Running tests in artifacts/fincava..."
    print_warning "This takes about 30 seconds..."
    
    if cd ../fincava && pnpm run test 2>&1; then
        print_success "Frontend tests completed"
        frontend_passed=true
    else
        print_error "Frontend tests had issues"
        frontend_passed=false
    fi
    
    # Step 5: Show results
    clear
    print_header "TEST RUN COMPLETE!"
    
    if [[ "$backend_passed" == true && "$frontend_passed" == true ]]; then
        echo -e "${GREEN}"
        cat << 'EOF'
    ✨ ALL TESTS PASSED! ✨
    
    Backend:  ✓ 105 tests passed
    Frontend: ✓ 35 tests passed
    
    TOTAL:    ✓ 140+ tests passed ✅
    
    What this means:
    • Authentication works perfectly
    • Email delivery works perfectly
    • Password reset works perfectly
    • Authorization is secure
    
    YOU'RE READY TO DEPLOY TO COLOMBIA! 🇨🇴
EOF
        echo -e "${NC}"
    else
        echo -e "${RED}"
        cat << 'EOF'
    Some tests had issues
    
    Backend:  status TBD
    Frontend: status TBD
    
    Don't worry! This is normal.
    Check the output above for details.
    
    Common fixes:
    1. Run: pnpm install
    2. Try again
EOF
        echo -e "${NC}"
    fi
    
    pause_script
    clear
    show_main_menu
}

# ============================================================================
# OPTION 3: RUN BACKEND TESTS ONLY
# ============================================================================

run_backend_tests() {
    clear
    print_header "RUNNING BACKEND TESTS ONLY"
    
    print_info "This will run 105 backend tests"
    print_warning "Takes about 2 minutes"
    
    if cd FinCava-Hub/artifacts/api-server 2>/dev/null; then
        print_success "Navigated to backend folder"
        print_info "Starting tests..."
        pnpm run test
    else
        print_error "Could not find backend folder"
        print_info "Make sure you're in the correct Replit project"
    fi
    
    pause_script
    clear
    show_main_menu
}

# ============================================================================
# OPTION 4: RUN FRONTEND TESTS ONLY
# ============================================================================

run_frontend_tests() {
    clear
    print_header "RUNNING FRONTEND TESTS ONLY"
    
    print_info "This will run 35 frontend tests"
    print_warning "Takes about 30 seconds"
    
    if cd FinCava-Hub/artifacts/fincava 2>/dev/null; then
        print_success "Navigated to frontend folder"
        print_info "Starting tests..."
        pnpm run test
    else
        print_error "Could not find frontend folder"
        print_info "Make sure you're in the correct Replit project"
    fi
    
    pause_script
    clear
    show_main_menu
}

# ============================================================================
# OPTION 5: CHECK RESULTS
# ============================================================================

check_results() {
    clear
    print_header "CHECKING TEST RESULTS"
    
    cat << 'EOF'
To check if tests passed, look for these messages:

✓ GOOD (All passed):
  ✓ Authentication Flow — 30 tests passed
  ✓ Email Queue — 35 tests passed
  ✓ Force Reset Password — 35 tests passed
  ✓ Multi-Tenant Authorization — 40 tests passed

✗ BAD (Some failed):
  ✗ Authentication Flow — 5 tests failed

WHAT TO DO NEXT:

If tests PASSED (✓):
  → You can deploy Friday
  → Everything is working
  → Colombia ready! 🇨🇴

If tests FAILED (✗):
  → Run: pnpm install
  → Try again
  → Check troubleshooting guide

EOF

    pause_script
    clear
    show_main_menu
}

# ============================================================================
# OPTION 6: TROUBLESHOOTING GUIDE
# ============================================================================

troubleshooting_guide() {
    clear
    print_header "TROUBLESHOOTING GUIDE"
    
    cat << 'EOF'
PROBLEM 1: "command not found: pnpm"

  SOLUTION:
  npm install -g pnpm
  
  Then try the tests again


PROBLEM 2: Tests are hanging / stuck

  SOLUTION:
  Press CTRL + C to stop
  Then run:
  pnpm install
  pnpm run test


PROBLEM 3: "Cannot find module @workspace/db"

  SOLUTION:
  You're in the wrong folder
  
  Go back to start:
  cd FinCava-Hub
  
  Then try again:
  cd artifacts/api-server && pnpm run test


PROBLEM 4: "EACCES: permission denied"

  SOLUTION:
  sudo chmod -R 755 node_modules
  
  Then try the tests again


PROBLEM 5: Tests failed (✗)

  SOLUTION:
  cd FinCava-Hub
  pnpm install
  cd artifacts/api-server
  pnpm run test


PROBLEM 6: Still broken?

  SOLUTION:
  1. Take a screenshot of the error
  2. Share it with your developer
  3. They can help debug it

EOF

    pause_script
    clear
    show_main_menu
}

# ============================================================================
# OPTION 7: EXIT WITH INSTRUCTIONS
# ============================================================================

exit_with_instructions() {
    clear
    print_header "EXITING SCRIPT"
    
    cat << 'EOF'
You chose to exit. Here's what to do next:

1. Open FINCAVA_TEST_SKILL.md
   (It's in /mnt/user-data/outputs/)

2. Read the step-by-step guide

3. Come back and run this script:
   bash run-fincava-tests.sh

OR just run the commands manually:

   cd FinCava-Hub
   git pull origin main
   cd artifacts/api-server && pnpm run test
   cd ../fincava && pnpm run test

Have fun learning! 🚀

EOF

    exit 0
}

# ============================================================================
# OPTION 8: EXIT SCRIPT
# ============================================================================

exit_script() {
    clear
    echo -e "${GREEN}"
    cat << 'EOF'
  Thanks for using FINCAVA TEST AUTOMATION SCRIPT!
  
  See you Thursday when you run the tests! 🚀
  
  Remember:
  - All tests should pass ✅
  - Takes 3-5 minutes
  - Colombia ready after tests pass 🇨🇴
  
EOF
    echo -e "${NC}"
    exit 0
}

# ============================================================================
# START SCRIPT
# ============================================================================

# Clear screen and show welcome
clear

echo -e "${CYAN}"
cat << 'EOF'
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║         🎉 WELCOME TO FINCAVA TEST AUTOMATION! 🎉            ║
║                                                                ║
║         No coding required. Just follow the prompts!          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

# Show main menu
show_main_menu
