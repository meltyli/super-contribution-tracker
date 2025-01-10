// Global variables
let contributionData = {};
let paymentCycle = "";
let annualIncome = 0;
let superRate = 11.0;
let selectedYear = new Date().getFullYear();
let yearData = {};

function importData() {
    const dataInput = document.getElementById('dataInput').value;
    try {
        const data = JSON.parse(dataInput);
        // Simplified validation that better handles arrays
        if (Array.isArray(data) && data.length > 0) {
            // Validate each entry
            const isValid = data.every(item => 
                item.date && 
                !isNaN(new Date(item.date).getTime()) && // Validates date format
                typeof item.amount === 'number'
            );

            if (!isValid) {
                throw new Error('Invalid data structure');
            }

            // Clear existing data
            yearData = {};
            
            // Process the data
            data.forEach(item => {
                const date = new Date(item.date);
                const year = date.getFullYear();
                if (!yearData[year]) yearData[year] = {};
                
                const dateKey = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                yearData[year][dateKey] = item.amount;
            });
            
            // Update year selector
            updateYearSelector();
            
            // Set selected year to the most recent year in the data
            const years = Object.keys(yearData).map(Number).sort((a, b) => b - a);
            if (years.length > 0) {
                selectedYear = years[0];
                document.getElementById('yearSelector').value = selectedYear;
            }
            
            // Update contributionData for selected year
            contributionData = yearData[selectedYear] || {};
            
            // Update display
            updateCalendar();
            updateAnalysis();
        } else {
            throw new Error('Invalid data structure');
        }
    } catch (e) {
        alert(`Invalid data format. Please use the format:
[
    {
        "date": "2024-01-15",
        "amount": 550.00
    },
    {
        "date": "2024-01-30",
        "amount": 42.17
    }
]`);
    }
}

function setPaymentCycle() {
    paymentCycle = document.getElementById('paymentCycle').value;
    annualIncome = parseFloat(document.getElementById('annualIncome').value) || 0;
    superRate = parseFloat(document.getElementById('superRate').value) || 11.0;
    updateCalendar();
    updateAnalysis();
}

function getExpectedContribution(cycle) {
    const annualSuper = annualIncome * (superRate / 100);
    const cycles = {
        'weekly': 52,
        'biweekly': 26,
        'quadweekly': 13,
        'monthly': 12,
        'quarterly': 4,
        'halfyear': 2,
        'yearly': 1
    };
    return cycles[cycle] ? annualSuper / cycles[cycle] : 0;
}

function updateYearSelector() {
    const yearSelector = document.getElementById('yearSelector');
    const years = Object.keys(yearData).sort((a, b) => b - a); // Sort descending
    
    yearSelector.innerHTML = years.map(year => 
        `<option value="${year}" ${year == selectedYear ? 'selected' : ''}>${year}</option>`
    ).join('');
}

function changeYear(year) {
    selectedYear = parseInt(year);
    contributionData = yearData[selectedYear] || {};
    updateCalendar();
    updateAnalysis();
}

function saveSettings() {
    const settings = {
        annualIncome,
        superRate,
        paymentCycle,
        selectedYear
    };
    localStorage.setItem('superAnalyzerSettings', JSON.stringify(settings));
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('superAnalyzerSettings'));
    if (settings) {
        annualIncome = settings.annualIncome;
        superRate = settings.superRate;
        paymentCycle = settings.paymentCycle;
        selectedYear = settings.selectedYear || new Date().getFullYear();
        
        // Update UI
        document.getElementById('annualIncome').value = annualIncome;
        document.getElementById('superRate').value = superRate;
        document.getElementById('paymentCycle').value = paymentCycle;
        document.getElementById('yearSelector').value = selectedYear;
    }
}

function updateAnalysis() {
    const analysis = document.getElementById('analysis');
    const expected = getExpectedContribution(paymentCycle);
    const total = Object.values(contributionData).reduce((sum, val) => sum + val, 0);

    let html = `<h3>Analysis</h3>
               <p>Annual Income: $${annualIncome.toLocaleString()}</p>
               <p>Super Rate: ${superRate}%</p>
               <p>Expected Annual Super: $${(annualIncome * superRate / 100).toLocaleString()}</p>
               <p>Expected ${paymentCycle || 'periodic'} contribution: $${expected.toFixed(2)}</p>
               <p>Total contributions to date: $${total.toFixed(2)}</p>`;

    // Monthly breakdown
    html += '<h4>Monthly Analysis</h4><table>';
    html += '<tr><th>Month</th><th>Total</th><th>Expected</th><th>Variance</th></tr>';

    let monthlyTotals = {};

    Object.entries(contributionData).forEach(([date, amount]) => {
        const [day, month] = date.split('.');
        monthlyTotals[month] = (monthlyTotals[month] || 0) + amount;
    });

    Object.entries(monthlyTotals).sort().forEach(([month, total]) => {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const expectedMonthly = annualIncome * superRate / 100 / 12;
        const variance = total - expectedMonthly;

        html += `<tr>
            <td>${monthNames[parseInt(month) - 1]}</td>
            <td>$${total.toFixed(2)}</td>
            <td>$${expectedMonthly.toFixed(2)}</td>
            <td class="${variance >= 0 ? 'positive' : 'negative'}">
                ${variance > 0 ? '+' : ''}$${variance.toFixed(2)}
            </td>
        </tr>`;
    });

    const years = Object.keys(yearData).sort();
    if (years.length > 1) {
        html += '<h4>Year-over-Year Comparison</h4><table>';
        html += '<tr><th>Year</th><th>Total Contributions</th><th>Expected</th><th>Variance</th></tr>';
        
        years.forEach(year => {
            const yearContributions = Object.values(yearData[year] || {}).reduce((sum, val) => sum + val, 0);
            const expectedAnnual = annualIncome * superRate / 100;
            const variance = yearContributions - expectedAnnual;
            
            html += `<tr>
                <td>${year}</td>
                <td>$${yearContributions.toFixed(2)}</td>
                <td>$${expectedAnnual.toFixed(2)}</td>
                <td class="${variance >= 0 ? 'positive' : 'negative'}">
                    ${variance > 0 ? '+' : ''}$${variance.toFixed(2)}
                </td>
            </tr>`;
        });
        
        html += '</table>';
    }
    else {
        html += '</table>';
    }
    
    analysis.innerHTML = html;
}

function updateCalendar() {
    const container = document.getElementById('calendar');
    container.innerHTML = '';

    const months = [
        "January", "February", "March", "April",
        "May", "June", "July", "August",
        "September", "October", "November", "December"
    ];

    const year = new Date().getFullYear();

    // Calculate payment cycle dates
    let cycleDates = [];
    if (paymentCycle) {
        let currentDate = new Date(year, 0, 1);
        while (currentDate.getFullYear() === year) {
            cycleDates.push(new Date(currentDate));
            switch (paymentCycle) {
                case 'weekly': currentDate.setDate(currentDate.getDate() + 7); break;
                case 'biweekly': currentDate.setDate(currentDate.getDate() + 14); break;
                case 'quadweekly': currentDate.setDate(currentDate.getDate() + 28); break;
                case 'monthly': currentDate.setMonth(currentDate.getMonth() + 1); break;
                case 'quarterly': currentDate.setMonth(currentDate.getMonth() + 3); break;
                case 'halfyear': currentDate.setMonth(currentDate.getMonth() + 6); break;
                case 'yearly': currentDate.setFullYear(currentDate.getFullYear() + 1); break;
            }
        }
    }

    months.forEach((monthName, month) => {
        const monthDiv = document.createElement('div');
        monthDiv.className = 'month';

        const monthTitle = document.createElement('div');
        monthTitle.className = 'month-title';
        monthTitle.textContent = `${monthName} ${year}`;
        monthDiv.appendChild(monthTitle);

        const weekdays = document.createElement('div');
        weekdays.className = 'weekdays';
        'Sun,Mon,Tue,Wed,Thu,Fri,Sat'.split(',').forEach(day => {
            const dayDiv = document.createElement('div');
            dayDiv.textContent = day;
            weekdays.appendChild(dayDiv);
        });
        monthDiv.appendChild(weekdays);

        const daysDiv = document.createElement('div');
        daysDiv.className = 'days';

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Add empty cells for days before the first day of month
        for (let i = 0; i < firstDay.getDay(); i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'day';
            daysDiv.appendChild(emptyDay);
        }

        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day';
            dayDiv.textContent = day;

            const dateStr = `${day.toString().padStart(2, '0')}.${(month + 1).toString().padStart(2, '0')}`;

            if (contributionData[dateStr]) {
                const amount = contributionData[dateStr];
                dayDiv.classList.add(amount > 500 ? 'employer-contribution' : 'low-income-benefit');

                const amountDiv = document.createElement('div');
                amountDiv.className = 'amount';
                amountDiv.textContent = `$${amount.toFixed(2)}`;
                dayDiv.appendChild(amountDiv);
            }

            const currentDate = new Date(year, month, day);
            if (cycleDates.some(cycleDate =>
                cycleDate.getDate() === currentDate.getDate() &&
                cycleDate.getMonth() === currentDate.getMonth()
            )) {
                dayDiv.classList.add('payment-cycle');
            }

            daysDiv.appendChild(dayDiv);
        }

        monthDiv.appendChild(daysDiv);
        container.appendChild(monthDiv);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updateCalendar();
});