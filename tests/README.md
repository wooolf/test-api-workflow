# API Testing with Multiple Postman Collections

This workflow automatically detects and runs all Postman collections in your `tests/collections/` directory, generates comprehensive test reports, and publishes the results to GitHub Actions and Pull Requests.

## Directory Structure

Organize your testing files as follows:

```
repository/
├── .github/
│   └── workflows/
│       └── api-test-status-demo.yml
├── tests/
│   ├── collections/           # Your Postman collection files
│   │   ├── auth-api.json
│   │   ├── user-api.json
│   │   └── product-api.json
│   └── scripts/               # Processing scripts
│       ├── run-collections.sh
│       └── combine-reports.js
└── README.md
```

This structure keeps your tests and helper scripts organized and maintainable.

### Collection Requirements

- Collections must be valid Postman collection JSON files (v2.1 format)
- Place all collections in the `tests/collections/` directory
- Each collection file should have a `.json` extension
- Collection names should be descriptive of the API or feature they test

## How the Workflow Works

1. **Collection Discovery**: The workflow automatically finds all JSON files in the `tests/collections/` directory
2. **Parallel Processing**: Each collection is processed individually
3. **Report Generation**: Newman generates HTML and CTRF JSON reports for each collection
4. **Result Aggregation**: Results from all collections are combined into a single report
5. **Special Status Detection**: Tests with special status indicators in their names (like "TODO" or "SKIP") are marked accordingly
6. **Flaky Test Detection**: Tests with inconsistent results are identified as flaky

## Test Status Categories

The workflow identifies and reports on various test statuses:

1. **Passed**: Tests that meet all expectations
2. **Failed**: Tests that don't meet expectations
3. **Flaky**: Tests that pass in some runs but fail in others
4. **Pending**: Tests marked with "TODO" or "TO BE IMPLEMENTED" in their names
5. **Skipped**: Tests with "SKIP" or "SKIPPED" in their names, or conditionally skipped
6. **Other**: Tests with special statuses like "BLOCKED"

## Creating Test Examples

### Demonstration Tests

Here are examples of how to create tests with different statuses:

#### Flaky Tests
```javascript
// Random flaky test (will sometimes pass, sometimes fail)
pm.test("Flaky random test", function () {
    const random = Math.random();
    pm.expect(random).to.be.lessThan(0.7); // 70% pass rate
});

// Network timing flaky test
pm.test("Response time is under 50ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(50);
});
```

#### Pending Tests
```javascript
// Mark as pending implementation
pm.test("TODO: Verify response pagination", function () {
    // Test not implemented yet
    console.log("This test is pending implementation");
});
```

#### Skipped Tests
```javascript
// Conditionally skip test
const shouldRunDetailedTests = false;
if (shouldRunDetailedTests) {
    pm.test("Detailed validation test", function () {
        // Test logic here
    });
} else {
    console.log("Skipping detailed validation");
}

// Mark as skipped
pm.test("SKIP: Legacy validation", function() {
    console.log("This test is skipped");
});
```

#### Other Status Tests
```javascript
// Blocked test
pm.test("BLOCKED: External system dependency test", function () {
    console.log("Test depends on external system");
});
```

## Viewing Results

Test results are available in multiple places:

1. **GitHub Actions Summary**: Detailed summary of all test results with specific sections for each status type
2. **PR Comments**: Condensed report added as a comment to Pull Requests
3. **Artifacts**: Full HTML and JSON reports are available as workflow artifacts

## Customizing the Workflow

You can customize the workflow by:

1. Modifying report formats in the `ctrf-io/github-test-reporter` action configuration
2. Changing the reporter options for Newman runs
3. Adding environment files or global variables to the Newman command
4. Adjusting the status detection logic in the `combine-reports.js` script
