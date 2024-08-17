async function fetchAnalytics() {
    try {
        const response = await fetch('/analytics');
        const data = await response.json();
        
        document.getElementById('transactionCount').textContent = data.transactionCount;
        document.getElementById('alertCount').textContent = data.alertCount;
        document.getElementById('pauseEventCount').textContent = data.pauseEventCount;
        document.getElementById('successfulPauses').textContent = data.successfulPauses;
        document.getElementById('pauseEffectiveness').textContent = `${data.pauseEffectiveness.toFixed(2)}%`;
        
        if (data.latestSlitherReport) {
            document.getElementById('slitherReportContent').textContent = JSON.stringify(data.latestSlitherReport, null, 2);
        } else {
            document.getElementById('slitherReportContent').textContent = 'No Slither report available.';
        }
    } catch (error) {
        console.error('Error fetching analytics:', error);
        document.getElementById('slitherReportContent').textContent = 'Error fetching Slither report.';
    }
}

async function fetchSuspiciousSequences() {
    try {
        const response = await fetch('/suspicious-sequences');
        const sequences = await response.json();
        
        const sequencesList = document.getElementById('sequencesList');
        sequencesList.innerHTML = '';
        
        if (sequences.length === 0) {
            sequencesList.innerHTML = '<li>No suspicious sequences detected.</li>';
        } else {
            sequences.forEach(sequence => {
                const li = document.createElement('li');
                li.textContent = sequence;
                sequencesList.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error fetching suspicious sequences:', error);
        document.getElementById('sequencesList').innerHTML = '<li>Error fetching suspicious sequences.</li>';
    }
}

function updateDashboard() {
    fetchAnalytics();
    fetchSuspiciousSequences();
}

// Update the dashboard every 30 seconds
setInterval(updateDashboard, 30000);

// Initial update
updateDashboard();