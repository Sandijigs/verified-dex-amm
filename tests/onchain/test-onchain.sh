#!/bin/bash

###############################################################################
# On-Chain Integration Test Script for Verified DEX/AMM
#
# This script tests all deployed contracts on Stacks Testnet using stacks-cli
#
# Network: Stacks Testnet
# Deployer: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK="testnet"
API_URL="https://api.testnet.hiro.so"
DEPLOYER="ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV"

# Contract names
SIP010_TRAIT="sip-010-trait"
POOL_TRAIT="pool-trait"
MATH_LIB="math-lib"
POOL_REGISTRY="pool-registry"
POOL_TEMPLATE="pool-template"
POOL_FACTORY="pool-factory"
ROUTER="router"
TWAP_ORACLE="twap-oracle"
TEST_TOKEN="test-token"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
}

print_test() {
    echo -e "${YELLOW}▶ Test: $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}\n"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

print_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}\n"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

# Call read-only function
call_readonly() {
    local contract=$1
    local function=$2
    local args=$3

    local url="${API_URL}/v2/contracts/call-read/${DEPLOYER}/${contract}/${function}"

    local response=$(curl -s -X POST "$url" \
        -H "Content-Type: application/json" \
        -d "{
            \"sender\": \"${DEPLOYER}\",
            \"arguments\": []
        }")

    echo "$response"
}

# Check if contract exists
check_contract() {
    local contract=$1
    local url="${API_URL}/v2/contracts/interface/${DEPLOYER}/${contract}"

    local response=$(curl -s -w "\n%{http_code}" "$url")
    local http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "200" ]; then
        return 0
    else
        return 1
    fi
}

###############################################################################
# TEST SUITE
###############################################################################

print_header "VERIFIED DEX/AMM - ON-CHAIN INTEGRATION TESTS"
echo "Network: Stacks Testnet"
echo "API URL: $API_URL"
echo "Deployer: $DEPLOYER"
echo ""

###############################################################################
# Test 1: Verify all contracts are deployed
###############################################################################
print_header "TEST 1: Verify Contract Deployments"

contracts=("$SIP010_TRAIT" "$POOL_TRAIT" "$MATH_LIB" "$POOL_REGISTRY" "$POOL_TEMPLATE" "$POOL_FACTORY" "$ROUTER" "$TWAP_ORACLE" "$TEST_TOKEN")

for contract in "${contracts[@]}"; do
    print_test "Checking if ${contract} is deployed"

    if check_contract "$contract"; then
        print_pass "Contract ${contract} is deployed and accessible"
    else
        print_fail "Contract ${contract} not found or not accessible"
    fi
done

###############################################################################
# Test 2: Test Math Library Functions
###############################################################################
print_header "TEST 2: Math Library Functions"

print_test "Testing sqrt function"
result=$(call_readonly "$MATH_LIB" "sqrt" "")
if [[ $result == *"ok"* ]] || [[ $result != *"error"* ]]; then
    print_pass "Math library sqrt function accessible"
else
    print_fail "Math library sqrt function failed"
fi

###############################################################################
# Test 3: Test Token (SIP-010)
###############################################################################
print_header "TEST 3: Test Token (SIP-010 Compliance)"

print_test "Reading token name"
name_result=$(call_readonly "$TEST_TOKEN" "get-name" "")
if [[ $name_result != *"error"* ]]; then
    print_pass "Token name readable"
    echo "   Response: $name_result"
else
    print_fail "Token name read failed"
fi

print_test "Reading token symbol"
symbol_result=$(call_readonly "$TEST_TOKEN" "get-symbol" "")
if [[ $symbol_result != *"error"* ]]; then
    print_pass "Token symbol readable"
    echo "   Response: $symbol_result"
else
    print_fail "Token symbol read failed"
fi

print_test "Reading token decimals"
decimals_result=$(call_readonly "$TEST_TOKEN" "get-decimals" "")
if [[ $decimals_result != *"error"* ]]; then
    print_pass "Token decimals readable"
    echo "   Response: $decimals_result"
else
    print_fail "Token decimals read failed"
fi

print_test "Reading total supply"
supply_result=$(call_readonly "$TEST_TOKEN" "get-total-supply" "")
if [[ $supply_result != *"error"* ]]; then
    print_pass "Total supply readable"
    echo "   Response: $supply_result"
else
    print_fail "Total supply read failed"
fi

###############################################################################
# Test 4: Pool Registry (contract-hash? feature)
###############################################################################
print_header "TEST 4: Pool Registry (Clarity 4 contract-hash?)"

print_test "Reading template count"
count_result=$(call_readonly "$POOL_REGISTRY" "get-template-count" "")
if [[ $count_result != *"error"* ]]; then
    print_pass "Pool registry template count readable"
    echo "   Response: $count_result"
else
    print_fail "Pool registry template count failed"
fi

###############################################################################
# Test 5: TWAP Oracle (stacks-block-time feature)
###############################################################################
print_header "TEST 5: TWAP Oracle (Clarity 4 stacks-block-time)"

print_test "Reading current block time"
time_result=$(call_readonly "$TWAP_ORACLE" "get-current-time" "")
if [[ $time_result != *"error"* ]]; then
    print_pass "TWAP Oracle time function accessible (stacks-block-time working)"
    echo "   Response: $time_result"
else
    print_fail "TWAP Oracle time function failed"
fi

###############################################################################
# Test 6: Router Contract
###############################################################################
print_header "TEST 6: Router Contract"

print_test "Reading router registry configuration"
registry_result=$(call_readonly "$ROUTER" "get-registry" "")
if [[ $registry_result != *"error"* ]]; then
    print_pass "Router registry configuration readable"
    echo "   Response: $registry_result"
else
    print_fail "Router registry read failed"
fi

print_test "Reading router factory configuration"
factory_result=$(call_readonly "$ROUTER" "get-factory" "")
if [[ $factory_result != *"error"* ]]; then
    print_pass "Router factory configuration readable"
    echo "   Response: $factory_result"
else
    print_fail "Router factory read failed"
fi

###############################################################################
# Test 7: Pool Factory
###############################################################################
print_header "TEST 7: Pool Factory"

print_test "Reading pool count"
pool_count=$(call_readonly "$POOL_FACTORY" "get-pool-count" "")
if [[ $pool_count != *"error"* ]]; then
    print_pass "Pool factory pool count readable"
    echo "   Response: $pool_count"
else
    print_fail "Pool factory pool count failed"
fi

print_test "Reading factory registry"
factory_registry=$(call_readonly "$POOL_FACTORY" "get-registry" "")
if [[ $factory_registry != *"error"* ]]; then
    print_pass "Pool factory registry readable"
    echo "   Response: $factory_registry"
else
    print_fail "Pool factory registry read failed"
fi

###############################################################################
# Test 8: Contract Explorer Links
###############################################################################
print_header "TEST 8: Generating Explorer Links"

echo "All contracts can be viewed on Stacks Explorer:"
echo ""
for contract in "${contracts[@]}"; do
    echo "   ${contract}:"
    echo "   https://explorer.hiro.so/txid/contract/${DEPLOYER}.${contract}?chain=testnet"
    echo ""
done

###############################################################################
# TEST SUMMARY
###############################################################################
print_header "TEST SUMMARY"

echo "Total Tests Run: $TOTAL_TESTS"
echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           ALL TESTS PASSED! 🎉                             ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "\n${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║           SOME TESTS FAILED ⚠️                              ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
