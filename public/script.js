async function fetchContractInfo() {
    try {
        const response = await fetch('/contract-info');
        const data = await response.json();

        document.getElementById('contractBalance').textContent = `${data.balance} ETH`;
        document.getElementById('contractState').textContent = data.isPaused ? 'Paused' : 'Active';
        document.getElementById('contractState').className = data.isPaused ? 'text-danger' : 'text-success';
    } catch (error) {
        console.error('Error fetching contract info:', error);
        document.getElementById('contractBalance').textContent = 'Error';
        document.getElementById('contractState').textContent = 'Error';
    }
}

async function fetchAnalytics() {
    try {
        const response = await fetch('/analytics');
        const data = await response.json();

        document.getElementById('transactionCount').textContent = data.transactionCount;
        document.getElementById('alertCount').textContent = data.alertCount;
        document.getElementById('pauseEventCount').textContent = data.pauseEventCount;
        document.getElementById('successfulPauses').textContent = data.successfulPauses;
        document.getElementById('pauseEffectiveness').textContent = `${data.pauseEffectiveness.toFixed(2)}%`;

        if (Array.isArray(data.slitherReports)) {
            updateSlitherReports(data.slitherReports);
        } else {
            console.error('Slither reports data is not an array:', data.slitherReports);
            document.getElementById('slitherReportsList').innerHTML = '<li class="list-group-item">Error: Invalid Slither reports data</li>';
        }
    } catch (error) {
        console.error('Error fetching analytics:', error);
        document.querySelectorAll('.analytics-item p').forEach(el => el.textContent = 'Error');
        document.getElementById('slitherReportsList').innerHTML = '<li class="list-group-item">Error fetching Slither reports.</li>';
    }
}

function updateSlitherReports(reports) {
    const reportsList = document.getElementById('slitherReportsList');
    reportsList.innerHTML = '';

    if (!reports || reports.length === 0) {
        reportsList.innerHTML = '<li class="list-group-item">No Slither reports available.</li>';
        return;
    }

    reports.forEach((report, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = `Report ${index + 1} - ${new Date(report.timestamp).toLocaleString()}`;
        li.onclick = () => showSlitherReportDetails(report.report); // Pass report.report instead of report
        reportsList.appendChild(li);
    });
}


function showSlitherReportDetails(report) {
    const detailsDiv = document.getElementById('slitherReportDetails');
    detailsDiv.innerHTML = '';

    if (!report || typeof report !== 'object') {
        detailsDiv.innerHTML = '<p class="alert alert-warning">Invalid report data</p>';
        return;
    }

    if (typeof report === 'string') {
        try {
            report = JSON.parse(report);
        } catch (e) {
            detailsDiv.innerHTML = '<p class="alert alert-danger">Error parsing report data</p>';
            return;
        }
    }

    if (!report.results || !Array.isArray(report.results.detectors)) {
        detailsDiv.innerHTML = '<p class="alert alert-info">No detectors found in this report</p>';
        return;
    }

    const accordion = document.createElement('div');
    accordion.className = 'accordion';
    accordion.id = 'slitherAccordion';

    report.results.detectors.forEach((detector, index) => {
        const item = document.createElement('div');
        item.className = 'accordion-item';
        item.innerHTML = `
            <h2 class="accordion-header" id="heading${index}">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}">
                    ${detector.check} - ${detector.impact} (${detector.confidence})
                </button>
            </h2>
            <div id="collapse${index}" class="accordion-collapse collapse" aria-labelledby="heading${index}" data-bs-parent="#slitherAccordion">
                <div class="accordion-body">
                    <p><strong>Description:</strong> ${detector.description}</p>
                    <p><strong>First Markdown Element:</strong> ${detector.first_markdown_element}</p>
                </div>
            </div>
        `;
        accordion.appendChild(item);
    });

    detailsDiv.appendChild(accordion);
}

async function fetchSuspiciousSequences() {
    try {
        const response = await fetch('/suspicious-sequences');
        const sequences = await response.json();

        const sequencesList = document.getElementById('sequencesList');
        sequencesList.innerHTML = '';

        if (sequences.length === 0) {
            sequencesList.innerHTML = '<li class="list-group-item">No suspicious sequences detected.</li>';
        } else {
            sequences.forEach(sequence => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = sequence;
                sequencesList.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error fetching suspicious sequences:', error);
        document.getElementById('sequencesList').innerHTML = '<li class="list-group-item">Error fetching suspicious sequences.</li>';
    }
}

async function fetchAlerts() {
    try {
        const response = await fetch('/alerts');
        const alerts = await response.json();

        const alertsTableBody = document.getElementById('alertsTableBody');
        alertsTableBody.innerHTML = '';

        if (alerts.length === 0) {
            alertsTableBody.innerHTML = '<tr><td colspan="3">No alerts found.</td></tr>';
        } else {
            alerts.forEach(alert => {
                const row = alertsTableBody.insertRow();
                row.innerHTML = `
                    <td>${alert.type}</td>
                    <td>${alert.message}</td>
                    <td>${new Date(alert.timestamp).toLocaleString()}</td>
                `;
            });
        }
    } catch (error) {
        console.error('Error fetching alerts:', error);
        document.getElementById('alertsTableBody').innerHTML = '<tr><td colspan="3">Error fetching alerts.</td></tr>';
    }
}

function updateDashboard() {
    fetchContractInfo();
    fetchAnalytics();
    fetchSuspiciousSequences();
    fetchAlerts();
}

// Update the dashboard every 30 seconds
setInterval(updateDashboard, 30000);

// Initial update
updateDashboard();