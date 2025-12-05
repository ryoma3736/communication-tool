#!/bin/bash

##############################################################################
# Smoke Tests for Communication Tool
#
# Usage:
#   ./scripts/smoke-tests.sh <endpoint-url>
#
# Example:
#   ./scripts/smoke-tests.sh https://api.example.com/staging
#
##############################################################################

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENDPOINT_URL="${1}"
FAILURES=0

if [ -z "$ENDPOINT_URL" ]; then
    echo -e "${RED}Error: Endpoint URL not provided${NC}"
    echo "Usage: $0 <endpoint-url>"
    exit 1
fi

print_test() {
    echo -e "${YELLOW}Testing: ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✅ PASS: ${1}${NC}"
}

print_failure() {
    echo -e "${RED}❌ FAIL: ${1}${NC}"
    FAILURES=$((FAILURES + 1))
}

##############################################################################
# Test Cases
##############################################################################

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Smoke Tests for Communication Tool"
echo "  Endpoint: $ENDPOINT_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Health Check
print_test "Health check endpoint"
if curl -f -s -o /dev/null -w "%{http_code}" "${ENDPOINT_URL}/health" | grep -q "200"; then
    print_success "Health check endpoint is responding"
else
    print_failure "Health check endpoint failed"
fi

# Test 2: API Reachability
print_test "API reachability"
if curl -f -s -o /dev/null "${ENDPOINT_URL}"; then
    print_success "API endpoint is reachable"
else
    print_failure "API endpoint is not reachable"
fi

# Test 3: Response Time
print_test "Response time check"
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "${ENDPOINT_URL}/health")
if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
    print_success "Response time is acceptable (${RESPONSE_TIME}s)"
else
    print_failure "Response time is too slow (${RESPONSE_TIME}s)"
fi

# Test 4: SSL Certificate (if HTTPS)
if [[ $ENDPOINT_URL == https://* ]]; then
    print_test "SSL certificate validation"
    if curl -f -s -o /dev/null "${ENDPOINT_URL}"; then
        print_success "SSL certificate is valid"
    else
        print_failure "SSL certificate validation failed"
    fi
fi

# Test 5: CORS Headers
print_test "CORS headers"
CORS_HEADERS=$(curl -s -I "${ENDPOINT_URL}" | grep -i "access-control-allow")
if [ -n "$CORS_HEADERS" ]; then
    print_success "CORS headers are present"
else
    print_failure "CORS headers are missing"
fi

##############################################################################
# Summary
##############################################################################

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ All smoke tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILURES test(s) failed${NC}"
    exit 1
fi
