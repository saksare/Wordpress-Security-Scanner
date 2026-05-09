// WordPress Security Scanner - Dashboard Script
// Author: Sherjeel Khan

const GITHUB_REPO = 'YOUR_USERNAME/wp-security-scanner'; // CHANGE THIS
const GITHUB_ACTIONS_URL = `https://github.com/${GITHUB_REPO}/actions/workflows/scan.yml`;

// DOM Elements
const scanBtn = document.getElementById('scanBtn');
const targetUrlInput = document.getElementById('targetUrl');
const loadingDiv = document.getElementById('loading');
const resultsDiv = document.getElementById('results');
const findingsList = document.getElementById('findingsList');
const scoreBox = document.getElementById('scoreBox');
const downloadBtn = document.getElementById('downloadReport');
const actionLink = document.getElementById('actionLink');

// Severity order for sorting
const severityOrder = { 'critical': 0, 'high': 1, 'warning': 2, 'low': 3, 'info': 4 };

// Scan results storage
let currentResults = null;

// Helper: Normalize URL
function normalizeUrl(input) {
    let url = input.trim().toLowerCase();
    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }
    return url;
}

// Helper: Get severity class
function getSeverityClass(severity) {
    const map = {
        'critical': 'critical',
        'high': 'critical',
        'warning': 'warning',
        'medium': 'warning',
        'low': 'low',
        'info': 'info'
    };
    return map[severity] || 'info';
}

// Display findings
function displayFindings(findings) {
    if (!findings || findings.length === 0) {
        findingsList.innerHTML = '<div class="finding-item info"><div class="finding-title">✅ No issues found</div><div class="finding-description">This site looks secure!</div></div>';
        return;
    }
    
    // Sort by severity
    const sorted = [...findings].sort((a, b) => {
        return severityOrder[getSeverityClass(a.severity)] - severityOrder[getSeverityClass(b.severity)];
    });
    
    findingsList.innerHTML = sorted.map(finding => {
        const severityClass = getSeverityClass(finding.severity);
        const severityLabel = finding.severity.toUpperCase();
        
        return `
            <div class="finding-item ${severityClass}">
                <div class="finding-title">
                    <span>${finding.title || 'Issue Detected'}</span>
                    <span class="finding-severity ${severityClass}">${severityLabel}</span>
                </div>
                <div class="finding-description">${finding.description || 'No description provided'}</div>
                ${finding.recommendation ? `<div class="finding-recommendation">💡 ${finding.recommendation}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Display score with color
function displayScore(score) {
    let colorClass = 'good';
    let status = 'Good';
    
    if (score < 40) {
        colorClass = 'critical';
        status = 'Critical Risk';
    } else if (score < 70) {
        colorClass = 'warning';
        status = 'Needs Attention';
    } else {
        colorClass = 'good';
        status = 'Secure';
    }
    
    scoreBox.className = `score-box ${colorClass}`;
    scoreBox.innerHTML = `🛡️ Security Score: ${score}/100<br><span style="font-size:12px">${status}</span>`;
}

// Load results from localStorage or URL param
function loadResults() {
    // Check URL for report parameter
    const params = new URLSearchParams(window.location.search);
    const reportFile = params.get('report');
    
    if (reportFile) {
        // Load from raw GitHub JSON
        const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${reportFile}`;
        fetch(rawUrl)
            .then(response => response.json())
            .then(data => {
                currentResults = data;
                displayResults(data);
            })
            .catch(err => console.error('Failed to load report:', err));
    } else {
        // Check localStorage for last scan
        const lastScan = localStorage.getItem('lastScan');
        if (lastScan) {
            try {
                currentResults = JSON.parse(lastScan);
                displayResults(currentResults);
            } catch(e) {}
        }
    }
}

// Display results in UI
function displayResults(results) {
    if (!results) return;
    
    // Show results section
    resultsDiv.classList.remove('hidden');
    loadingDiv.classList.add('hidden');
    
    // Display score
    const score = results.security_score || 100;
    displayScore(score);
    
    // Display findings
    displayFindings(results.findings || []);
    
    // Store in localStorage
    localStorage.setItem('lastScan', JSON.stringify(results));
    currentResults = results;
}

// Trigger scan
function triggerScan() {
    const rawUrl = targetUrlInput.value.trim();
    if (!rawUrl) {
        alert('Please enter a website URL');
        return;
    }
    
    const fullUrl = normalizeUrl(rawUrl);
    
    // Store URL for later
    localStorage.setItem('lastScannedUrl', fullUrl);
    
    // Show loading
    loadingDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
    
    // Update action link
    actionLink.href = GITHUB_ACTIONS_URL;
    
    // Open GitHub Actions in new tab
    window.open(GITHUB_ACTIONS_URL, '_blank');
    
    // Instructions alert
    setTimeout(() => {
        alert(`✅ Scan trigger ready!\n\n1. Click "Run workflow"\n2. Enter this URL: ${fullUrl}\n3. Click "Run workflow"\n4. Wait 30-60 seconds\n5. Results will appear here automatically after scan completes.\n\nCheck the "Actions" tab for progress.`);
    }, 500);
}

// Download report as JSON
function downloadReport() {
    if (!currentResults) {
        alert('No scan results to download');
        return;
    }
    
    const dataStr = JSON.stringify(currentResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wp-scan-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Event listeners
scanBtn.addEventListener('click', triggerScan);
downloadBtn.addEventListener('click', downloadReport);

// Enter key support
targetUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        triggerScan();
    }
});

// Load any existing results on page load
loadResults();

// Auto-refresh: check for new report every 5 seconds if we're waiting
let checkInterval = null;

function startWaitingForReport() {
    if (checkInterval) clearInterval(checkInterval);
    
    const lastUrl = localStorage.getItem('lastScannedUrl');
    if (!lastUrl) return;
    
    // This is a placeholder - in real usage, user would need to manually refresh or we'd watch a specific file
    console.log('Waiting for scan to complete... Check back soon!');
}

// Update the action link with correct username
actionLink.href = GITHUB_ACTIONS_URL;
