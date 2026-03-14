#!/bin/bash
# TubeRush v2 - Build Verification Script (TUB-194)
# Verifies clean build, TypeScript, and documents bundle size baseline.
# Run after cleanup tasks: npx expo start --clear first to flush Metro cache.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔍 TubeRush v2 - Build Verification"
echo "===================================="
echo ""

# 1. TypeScript check
echo "1. Running TypeScript check (tsc --noEmit)..."
if npm run type-check; then
    echo -e "${GREEN}✓ TypeScript: 0 errors${NC}"
else
    echo -e "${RED}✗ TypeScript check failed${NC}"
    exit 1
fi
echo ""

# 2. Expo export (clears Metro cache, generates bundle)
echo "2. Running expo export (--clear --source-maps)..."
if npx expo export --clear --source-maps --platform ios 2>&1 | tee /tmp/expo-export.log; then
    echo -e "${GREEN}✓ Expo export succeeded${NC}"
else
    echo -e "${RED}✗ Expo export failed${NC}"
    exit 1
fi
echo ""

# 3. Bundle size report
echo "3. Bundle size (post-cleanup baseline):"
if [ -d "dist" ]; then
    du -sh dist
    du -sh dist/_expo/static/js/ios/*.hbc 2>/dev/null || true
    echo ""
    echo "Record these values in docs/VERIFICATION_BASELINE.md"
else
    echo -e "${YELLOW}⚠ dist/ not found${NC}"
fi
echo ""

# 4. Optional: local iOS build
echo "4. Optional: Run 'npx expo run:ios' for full native build + simulator launch"
echo "   (Skipped in script - run manually when needed)"
echo ""

echo -e "${GREEN}✓ Verification complete${NC}"
