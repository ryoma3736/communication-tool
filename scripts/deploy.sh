#!/bin/bash

##############################################################################
# Deployment Helper Script for Communication Tool
#
# Usage:
#   ./scripts/deploy.sh <environment> [options]
#
# Environments:
#   staging     - Deploy to staging environment
#   production  - Deploy to production environment (requires approval)
#
# Options:
#   --skip-tests        Skip test execution
#   --skip-build        Skip build step (use existing build)
#   --dry-run           Preview changes without deploying
#   --auto-approve      Skip manual approval (staging only)
#   --verbose           Enable verbose output
#   --help              Show this help message
#
##############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=""
SKIP_TESTS=false
SKIP_BUILD=false
DRY_RUN=false
AUTO_APPROVE=false
VERBOSE=false
AWS_REGION="us-east-1"

##############################################################################
# Helper Functions
##############################################################################

print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✅ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}"
}

print_error() {
    echo -e "${RED}❌ ${1}${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  ${1}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

show_help() {
    cat << EOF
Deployment Helper Script for Communication Tool

Usage:
    $0 <environment> [options]

Environments:
    staging         Deploy to staging environment
    production      Deploy to production environment (requires approval)

Options:
    --skip-tests        Skip test execution
    --skip-build        Skip build step (use existing build)
    --dry-run           Preview changes without deploying
    --auto-approve      Skip manual approval (staging only)
    --verbose           Enable verbose output
    --help              Show this help message

Examples:
    $0 staging
    $0 staging --skip-tests
    $0 production --dry-run
    $0 staging --auto-approve --verbose

Environment Variables:
    AWS_PROFILE         AWS CLI profile to use
    AWS_REGION          AWS region (default: us-east-1)
    SAM_BUCKET          S3 bucket for SAM deployments

EOF
    exit 0
}

check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing_tools=()

    # Check required tools
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi

    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi

    if ! command -v aws &> /dev/null; then
        missing_tools+=("aws-cli")
    fi

    if ! command -v sam &> /dev/null; then
        missing_tools+=("sam-cli")
    fi

    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        echo ""
        echo "Please install the missing tools:"
        echo "  - node/npm: https://nodejs.org/"
        echo "  - aws-cli: https://aws.amazon.com/cli/"
        echo "  - sam-cli: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
        exit 1
    fi

    print_success "All prerequisites satisfied"

    # Check Node version
    NODE_VERSION=$(node --version)
    print_info "Node.js version: $NODE_VERSION"

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured"
        echo ""
        echo "Please configure AWS credentials:"
        echo "  aws configure"
        echo ""
        echo "Or set environment variables:"
        echo "  export AWS_ACCESS_KEY_ID=..."
        echo "  export AWS_SECRET_ACCESS_KEY=..."
        exit 1
    fi

    print_success "AWS credentials configured"
    aws sts get-caller-identity
}

run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        print_warning "Skipping tests (--skip-tests flag used)"
        return
    fi

    print_header "Running Tests"

    npm test -- --run --coverage

    print_success "All tests passed"
}

build_application() {
    if [ "$SKIP_BUILD" = true ]; then
        print_warning "Skipping build (--skip-build flag used)"
        return
    fi

    print_header "Building Application"

    # Clean previous build
    rm -rf dist/
    print_info "Cleaned previous build"

    # Install dependencies
    npm ci
    print_info "Installed dependencies"

    # Run linter
    npm run lint
    print_info "Linting passed"

    # Type check
    npm run typecheck
    print_info "Type checking passed"

    # Build
    npm run build
    print_success "Build completed"

    # Verify build output
    if [ ! -d "dist" ]; then
        print_error "Build failed: dist directory not found"
        exit 1
    fi

    print_success "Build verified successfully"
}

deploy_infrastructure() {
    print_header "Deploying Infrastructure to $ENVIRONMENT"

    local stack_name="communication-tool-$ENVIRONMENT"
    local s3_bucket_var="SAM_DEPLOYMENT_BUCKET_${ENVIRONMENT^^}"
    local s3_bucket="${!s3_bucket_var}"

    if [ -z "$s3_bucket" ]; then
        print_error "S3 bucket not configured for $ENVIRONMENT"
        echo "Set environment variable: $s3_bucket_var"
        exit 1
    fi

    print_info "Stack name: $stack_name"
    print_info "S3 bucket: $s3_bucket"
    print_info "Region: $AWS_REGION"

    # SAM Build
    print_info "Building SAM application..."
    if [ "$VERBOSE" = true ]; then
        sam build --use-container
    else
        sam build --use-container > /dev/null
    fi
    print_success "SAM build completed"

    # Prepare deployment command
    local deploy_cmd=(
        sam deploy
        --stack-name "$stack_name"
        --s3-bucket "$s3_bucket"
        --s3-prefix "communication-tool-$ENVIRONMENT"
        --region "$AWS_REGION"
        --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
        --parameter-overrides
            "Environment=$ENVIRONMENT"
            "NodeVersion=20.x"
        --tags
            "Environment=$ENVIRONMENT"
            "Project=communication-tool"
            "ManagedBy=script"
    )

    if [ "$DRY_RUN" = true ]; then
        deploy_cmd+=(--no-execute-changeset)
        print_warning "DRY RUN MODE - Changes will not be applied"
    else
        deploy_cmd+=(--no-fail-on-empty-changeset)
    fi

    if [ "$AUTO_APPROVE" = true ] && [ "$ENVIRONMENT" != "production" ]; then
        deploy_cmd+=(--no-confirm-changeset)
    fi

    # Execute deployment
    if [ "$VERBOSE" = true ]; then
        "${deploy_cmd[@]}"
    else
        "${deploy_cmd[@]}" 2>&1 | grep -v "^Uploading to" || true
    fi

    if [ "$DRY_RUN" = true ]; then
        print_info "Changeset created. Review and execute manually:"
        print_info "aws cloudformation execute-change-set --change-set-name <changeset-name>"
        return
    fi

    print_success "Deployment completed successfully"

    # Get stack outputs
    print_header "Stack Outputs"
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].Outputs' \
        --output table
}

run_smoke_tests() {
    print_header "Running Smoke Tests"

    local endpoint_url=$(aws cloudformation describe-stacks \
        --stack-name "communication-tool-$ENVIRONMENT" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
        --output text)

    if [ -z "$endpoint_url" ]; then
        print_warning "Could not retrieve API endpoint"
        return
    fi

    print_info "API Endpoint: $endpoint_url"

    if [ -f "scripts/smoke-tests.sh" ]; then
        chmod +x scripts/smoke-tests.sh
        ./scripts/smoke-tests.sh "$endpoint_url"
    else
        print_warning "Smoke test script not found: scripts/smoke-tests.sh"
        print_info "Skipping smoke tests"
    fi
}

request_approval() {
    if [ "$ENVIRONMENT" != "production" ]; then
        return
    fi

    if [ "$AUTO_APPROVE" = true ]; then
        print_warning "Auto-approval enabled for production (use with caution!)"
        return
    fi

    print_header "Production Deployment Approval Required"

    echo ""
    echo "You are about to deploy to PRODUCTION environment."
    echo ""
    echo "Please verify the following:"
    echo "  ✓ All tests are passing"
    echo "  ✓ Code review is complete"
    echo "  ✓ Staging deployment is successful"
    echo "  ✓ Change log is updated"
    echo ""
    read -p "Do you want to proceed? (yes/no): " -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_error "Deployment cancelled by user"
        exit 1
    fi

    print_success "Approval granted"
}

##############################################################################
# Main Script
##############################################################################

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        staging|production)
            ENVIRONMENT="$1"
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            set -x  # Enable debug mode
            shift
            ;;
        --help)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate environment
if [ -z "$ENVIRONMENT" ]; then
    print_error "Environment not specified"
    echo "Usage: $0 <staging|production> [options]"
    echo "Use --help for more information"
    exit 1
fi

# Start deployment
print_header "Deployment Script - Communication Tool"
echo "Environment: $ENVIRONMENT"
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# Execute deployment steps
check_prerequisites
run_tests
build_application
request_approval
deploy_infrastructure

if [ "$DRY_RUN" = false ]; then
    run_smoke_tests
fi

# Success
print_header "Deployment Complete"
print_success "Successfully deployed to $ENVIRONMENT"
echo ""
echo "Next steps:"
echo "  - Monitor CloudWatch logs"
echo "  - Check application metrics"
echo "  - Verify functionality"
echo ""
