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
    
    if (name.includes('blocked') || name.includes('needs-review')) {
        return 'other';
    }
    
    return test.status;
}

// Read all reports
const reports = reportFiles.map(file => {
    const content = fs.readFileSync(path.join('./ctrf', file), 'utf8');
    const report = JSON.parse(content);
    
    // Get collection name from the metadata if available
    // The build name often contains the real collection name
    const fileBaseName = path.basename(file, '-report.json');
    let collectionName = fileBaseName;
    
    // Try to extract collection name from build name if available
    if (report.results && report.results.environment && report.results.environment.buildName) {
        const buildName = report.results.environment.buildName;
        // If build name contains "API Tests - ", extract what comes after
        if (buildName.includes('API Tests - ')) {
            collectionName = buildName.split('API Tests - ')[1];
        } else {
            collectionName = buildName;
        }
    }
    
    // Also look for collection name in app name as a fallback
    if (report.results && report.results.environment && report.results.environment.appName) {
        // Store this for debugging
        report.results.collectionFileName = fileBaseName;
        report.results.collectionBuildName = report.results.environment.buildName || 'N/A';
        report.results.collectionAppName = report.results.environment.appName || 'N/A';
    }
    
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
                test.message = 'Test has a special status: ' + (test.name.includes('BLOCKED') ? 'BLOCKED' : 
                               test.name.includes('NEEDS-REVIEW') ? 'NEEDS REVIEW' : 'OTHER');
            }
        }
        
        // Add collection info to test name for clear identification
        test.collectionName = collectionName;
        test.originalName = test.name;
        test.name = `[${collectionName}] ${test.name}`;
    });
    
    return report;
});

// Track test results across all reports to identify flaky tests
const testResults = {};
// Track collection statistics
const collectionStats = {};

// Process all reports
reports.forEach(report => {
    report.results.tests.forEach(test => {
        if (!testResults[test.name]) {
            testResults[test.name] = [];
        }
        
        testResults[test.name].push({
            status: test.status,
            duration: test.duration,
            message: test.message,
            collectionName: test.collectionName,
            originalName: test.originalName
        });
        
        // Initialize collection stats if not exists
        if (!collectionStats[test.collectionName]) {
            collectionStats[test.collectionName] = {
                total: 0,
                passed: 0,
                failed: 0,
                pending: 0,
                skipped: 0,
                other: 0,
                flaky: 0,
                duration: 0
            };
        }
    });
});

// Create combined report
const combinedReport = {
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
    tests: [],
    collections: []  // Add collection-level summary
};

// Add all tests to combined report
Object.keys(testResults).forEach(testName => {
    const results = testResults[testName];
    const collectionName = results[0].collectionName;
    
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
    
    // Add test to combined report
    combinedReport.tests.push({
        name: testName,
        status: status,
        duration: results[0].duration,
        message: message,
        flaky: isFlaky,
        collectionName: collectionName,
        originalName: results[0].originalName
    });
    
    // Update collection statistics
    collectionStats[collectionName].total++;
    collectionStats[collectionName].duration += results[0].duration;
    
    if (status === 'passed') collectionStats[collectionName].passed++;
    else if (status === 'failed') collectionStats[collectionName].failed++;
    else if (status === 'pending') collectionStats[collectionName].pending++;
    else if (status === 'skipped') collectionStats[collectionName].skipped++;
    else if (status === 'other') collectionStats[collectionName].other++;
    
    if (isFlaky) collectionStats[collectionName].flaky++;
});

// Add collection statistics to the combined report
Object.keys(collectionStats).forEach(collectionName => {
    combinedReport.collections.push({
        name: collectionName,
        ...collectionStats[collectionName]
    });
});

// Update summary counts
combinedReport.summary.tests = combinedReport.tests.length;
combinedReport.summary.passed = combinedReport.tests.filter(t => t.status === 'passed').length;
combinedReport.summary.failed = combinedReport.tests.filter(t => t.status === 'failed').length;
combinedReport.summary.pending = combinedReport.tests.filter(t => t.status === 'pending').length;
combinedReport.summary.skipped = combinedReport.tests.filter(t => t.status === 'skipped').length;
combinedReport.summary.other = combinedReport.tests.filter(t => t.status === 'other').length;
combinedReport.summary.flaky = combinedReport.tests.filter(t => t.flaky).length;

// Write combined report - using the root 'ctrf' property that the template expects
const finalReport = {
    ctrf: combinedReport
};

fs.writeFileSync('./ctrf/combined-report.json', JSON.stringify(finalReport, null, 2));
console.log('Created combined report with all test results');