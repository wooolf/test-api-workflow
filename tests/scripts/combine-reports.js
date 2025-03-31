const fs = require('fs');
const path = require('path');

// Get all CTRF reports
const reportFiles = fs.readdirSync('./ctrf')
    .filter(file => file.endsWith('-report.json'));

if (reportFiles.length === 0) {
    console.error('No report files found!');
    process.exit(1);
}

console.log(`Found ${reportFiles.length} report files to process`);

// Helper function to identify test status based on name
function getSpecialStatus(test) {
    const name = test.name.toLowerCase();
    
    if (name.includes('todo') || name.includes('to be implemented')) {
        return 'pending';
    }
    
    if (name.includes('skip') || name.includes('skipped')) {
        return 'skipped';
    }
    
    if (name.includes('blocked')) {
        return 'other';
    }
    
    return test.status;
}

// Read all reports
const reports = reportFiles.map(file => {
    const content = fs.readFileSync(path.join('./ctrf', file), 'utf8');
    const report = JSON.parse(content);
    
    // Process special statuses
    report.results.tests.forEach(test => {
        // Apply special status logic
        const specialStatus = getSpecialStatus(test);
        if (specialStatus !== test.status) {
            test.status = specialStatus;
            
            // For demonstration purposes
            if (specialStatus === 'pending') {
                test.message = 'Test is marked as pending implementation';
            } else if (specialStatus === 'skipped') {
                test.message = 'Test was intentionally skipped';
            } else if (specialStatus === 'other') {
                test.message = 'Test has a special status: BLOCKED';
            }
        }
        
        // Add collection info to test name for clear identification
        const collectionName = path.basename(file, '-report.json');
        test.name = `[${collectionName}] ${test.name}`;
    });
    
    return report;
});

// Track test results across all reports to identify flaky tests
const testResults = {};

// Process all reports
reports.forEach(report => {
    report.results.tests.forEach(test => {
        if (!testResults[test.name]) {
            testResults[test.name] = [];
        }
        testResults[test.name].push({
            status: test.status,
            duration: test.duration,
            message: test.message
        });
    });
});

// Create combined report
const combinedReport = {
    results: {
        tool: reports[0].results.tool,
        summary: {
            tests: 0,
            passed: 0,
            failed: 0,
            pending: 0,
            skipped: 0,
            other: 0,
            start: reports[0].results.summary.start,
            stop: reports[reports.length - 1].results.summary.stop
        },
        tests: []
    }
};

// Add all tests to combined report
Object.keys(testResults).forEach(testName => {
    const results = testResults[testName];
    
    // Determine final status based on all runs
    let status = results[0].status;
    let message = results[0].message;
    let isFlaky = false;
    
    // Check for flaky tests (inconsistent results)
    if (results.length > 1) {
        const statuses = results.map(r => r.status);
        const uniqueStatuses = [...new Set(statuses)];
        
        // If there are multiple distinct statuses and at least one is 'passed' and one is 'failed'
        if (uniqueStatuses.length > 1 && 
            statuses.includes('passed') && 
            statuses.includes('failed')) {
            status = 'failed'; // Mark as failed for reporting
            message = 'FLAKY TEST: Inconsistent results between runs';
            isFlaky = true;
        }
    }
    
    combinedReport.results.tests.push({
        name: testName,
        status: status,
        duration: results[0].duration,
        message: message,
        flaky: isFlaky
    });
});

// Update summary counts
combinedReport.results.summary.tests = combinedReport.results.tests.length;
combinedReport.results.summary.passed = combinedReport.results.tests.filter(t => t.status === 'passed').length;
combinedReport.results.summary.failed = combinedReport.results.tests.filter(t => t.status === 'failed').length;
combinedReport.results.summary.pending = combinedReport.results.tests.filter(t => t.status === 'pending').length;
combinedReport.results.summary.skipped = combinedReport.results.tests.filter(t => t.status === 'skipped').length;
combinedReport.results.summary.other = combinedReport.results.tests.filter(t => t.status === 'other').length;
combinedReport.results.summary.flaky = combinedReport.results.tests.filter(t => t.flaky).length;

// Write combined report
fs.writeFileSync('./ctrf/combined-report.json', JSON.stringify(combinedReport, null, 2));
console.log('Created combined report with all test results');