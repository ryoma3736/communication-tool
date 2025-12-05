#!/bin/bash

##############################################################################
# Health Check Script for Communication Tool
#
# Usage:
#   ./scripts/health-check.sh <endpoint-url>
#
# Example:
#   ./scripts/health-check.sh https://api.example.com/production
#
##############################################################################

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENDPOINT_URL="${1}"
MAX_RETRIES=5
RETRY_INTERVAL=10
TIMEOUT=5

if [ -z "$ENDPOINT_URL" ]; then
    echo -e "${RED}Error: Endpoint URL not provided${NC}"
    echo "Usage: $0 <endpoint-url>"
    exit 1
fi

##############################################################################
# Functions
##############################################################################

check_health() {
    local url="$1"
    local response_code

    response_code=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time $TIMEOUT \
        --connect-timeout $TIMEOUT \
        "${url}/health" || echo "000")

    echo "$response_code"
}

check_api_version() {
    local url="$1"

    curl -s --max-time $TIMEOUT "${url}/version" || echo "{}"
}

check_metrics() {
    local url="$1"

    echo -e "${BLUE}Checking application metrics...${NC}"

    # Check CloudWatch metrics if AWS CLI is available
    if command -v aws &> /dev/null; then
        # Get Lambda errors (example)
        echo "Lambda Errors (last 5 minutes):"
        aws cloudwatch get-metric-statistics \
            --namespace AWS/Lambda \
            --metric-name Errors \
            --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
            --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
            --period 300 \
            --statistics Sum \
            --query 'Datapoints[*].[Timestamp,Sum]' \
            --output table || true
    fi
}

##############################################################################
# Main Health Check
##############################################################################

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Health Check for Communication Tool"
echo "  Endpoint: $ENDPOINT_URL"
echo "  Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Retry logic
for i in $(seq 1 $MAX_RETRIES); do
    echo -e "${BLUE}Attempt $i/$MAX_RETRIES...${NC}"

    response_code=$(check_health "$ENDPOINT_URL")

    if [ "$response_code" == "200" ]; then
        echo -e "${GREEN}✅ Health check passed (HTTP $response_code)${NC}"

        # Get version info
        echo ""
        echo -e "${BLUE}API Version Information:${NC}"
        version_info=$(check_api_version "$ENDPOINT_URL")
        echo "$version_info" | jq '.' 2>/dev/null || echo "$version_info"

        # Check metrics
        echo ""
        check_metrics "$ENDPOINT_URL"

        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}  Health Check: PASSED${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Health check returned HTTP $response_code${NC}"

        if [ $i -lt $MAX_RETRIES ]; then
            echo -e "${YELLOW}Retrying in ${RETRY_INTERVAL}s...${NC}"
            sleep $RETRY_INTERVAL
        fi
    fi
done

# All retries failed
echo ""
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  Health Check: FAILED${NC}"
echo -e "${RED}  Service is not responding correctly after $MAX_RETRIES attempts${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
exit 1
