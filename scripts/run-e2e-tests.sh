#!/bin/bash
set -e

# TubeRush v2 - E2E Test Runner
# This script helps run Maestro E2E tests locally

echo "🎮 TubeRush v2 - E2E Test Runner"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Maestro is installed
if ! command -v maestro &> /dev/null; then
    echo -e "${RED}❌ Maestro is not installed${NC}"
    echo ""
    echo "Install Maestro:"
    echo "  curl -Ls \"https://get.maestro.mobile.dev\" | bash"
    echo "  export PATH=\"\$HOME/.maestro/bin:\$PATH\""
    exit 1
fi

echo -e "${GREEN}✓ Maestro is installed${NC}"
maestro --version
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo ""
    echo "Create a .env file with:"
    echo "  EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    echo "  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Parse command line arguments
PLATFORM=${1:-ios}
TEST_FILE=${2:-.maestro/auth_flow.yaml}

echo "Platform: $PLATFORM"
echo "Test file: $TEST_FILE"
echo ""

# Check if simulator/emulator is running
if [ "$PLATFORM" = "ios" ]; then
    if ! xcrun simctl list devices | grep -q "Booted"; then
        echo -e "${YELLOW}⚠️  No iOS simulator is running${NC}"
        echo ""
        echo "Starting iPhone 16 simulator..."
        xcrun simctl boot "iPhone 16" || true
        sleep 5
        echo -e "${GREEN}✓ Simulator started${NC}"
    else
        echo -e "${GREEN}✓ iOS simulator is running${NC}"
    fi
elif [ "$PLATFORM" = "android" ]; then
    if ! adb devices | grep -q "device$"; then
        echo -e "${RED}❌ No Android emulator is running${NC}"
        echo ""
        echo "Start an emulator first:"
        echo "  emulator -avd Pixel_7_API_34"
        exit 1
    else
        echo -e "${GREEN}✓ Android emulator is running${NC}"
    fi
fi

echo ""

# Run the test
echo "🚀 Running E2E tests..."
echo ""

if [ -f "$TEST_FILE" ]; then
    maestro test "$TEST_FILE" --format junit --output test-results/maestro-report.xml
    
    echo ""
    echo -e "${GREEN}✅ Tests completed successfully!${NC}"
    echo ""
    echo "📊 Results saved to: test-results/maestro-report.xml"
    echo "📸 Screenshots available in: ~/.maestro/tests/"
else
    echo -e "${RED}❌ Test file not found: $TEST_FILE${NC}"
    echo ""
    echo "Available tests:"
    ls -1 .maestro/*.yaml
    exit 1
fi

echo ""
echo "To view test artifacts:"
echo "  open ~/.maestro/tests/\$(ls -t ~/.maestro/tests/ | head -1)"
echo ""
