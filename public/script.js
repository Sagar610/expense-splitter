// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, onValue, set, push, remove } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { get as getDatabaseValue } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBxMOMGGe0GvxeIHqFvZqDgWGHwm5lzVIg",
    authDomain: "splitwise-eb56b.firebaseapp.com",
    databaseURL: "https://splitwise-eb56b-default-rtdb.firebaseio.com",
    projectId: "splitwise-eb56b",
    storageBucket: "splitwise-eb56b.appspot.com",
    messagingSenderId: "1098977653274",
    appId: "1:1098977653274:web:e7a0d2c6a6d4d7d7f1c4c5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Get group ID from URL
const urlParams = new URLSearchParams(window.location.search);
const groupId = urlParams.get('group');

if (!groupId) {
    window.location.href = '/landing.html';
}

// Reference to the current group
const groupRef = ref(db, `groups/${groupId}`);

// Listen for group data changes
onValue(groupRef, (snapshot) => {
    const groupData = snapshot.val();
    if (!groupData) {
        console.error('Group not found');
        window.location.href = '/landing.html';
        return;
    }
            
    // Update group name display
    document.getElementById('group-name-display').textContent = groupData.name || 'Unnamed Group';
    
    // Update people list
    updatePeopleList(groupData.people || []);
    
    // Update expense list
    updateExpenseList(groupData.expenses || []);
    
    // Update expense summary
    updateExpenseSummary(groupData.expenses || [], groupData.people || []);
    
    // Update settlements
    calculateAndDisplaySettlements(groupData.expenses || [], groupData.people || []);

    // Generate QR code
    generateQRCode();
}, (error) => {
    console.error('Error loading group data:', error);
    alert('Error loading group data. Please try again.');
});

// Handle adding multiple people
document.getElementById('add-multiple-people-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('multiple-people');
    const names = input.value.split(',').map(name => name.trim()).filter(name => name);
    
    if (names.length === 0) {
        showToast('Please enter at least one name', 'error');
        return;
    }

    try {
        const snapshot = await getDatabaseValue(groupRef);
        if (!snapshot.exists()) {
            throw new Error('Group not found');
        }

        const groupData = snapshot.val();
        const currentPeople = groupData.people || [];
        
        const duplicates = names.filter(name => currentPeople.includes(name));
        if (duplicates.length > 0) {
            showToast(`These people already exist: ${duplicates.join(', ')}`, 'error');
            return;
        }
        
        const updatedPeople = [...currentPeople, ...names];
        const updatedGroupData = {
            ...groupData,
            people: updatedPeople
        };
        
        await set(groupRef, updatedGroupData);
        input.value = '';
        showToast('People added successfully');
    } catch (error) {
        console.error('Error adding people:', error);
        showToast('Error adding people', 'error');
    }
});

// Handle Select All button
document.getElementById('select-all').addEventListener('click', (e) => {
    e.preventDefault(); // Prevent any form submission
    e.stopPropagation(); // Stop event bubbling
    
    const checkboxes = document.querySelectorAll('#default-group input[type="checkbox"]');
    const selectAllBtn = document.getElementById('select-all');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
    });
    
    selectAllBtn.innerHTML = allChecked ? 
        '<i class="fas fa-users"></i> Select All' : 
        '<i class="fas fa-users-slash"></i> Deselect All';
});

// Handle adding new expense
document.getElementById('quick-expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const expenseName = document.getElementById('quick-expense-name').value;
    const amount = parseFloat(document.getElementById('quick-expense-amount').value);
    const paidBy = document.getElementById('quick-paid-by').value;
    
    if (!expenseName || !amount || !paidBy) {
        showToast('Please fill in all expense details', 'error');
        return;
    }

    const checkboxes = document.querySelectorAll('#default-group input[type="checkbox"]:checked');
    const splitBetween = Array.from(checkboxes).map(cb => cb.value);
    
    if (splitBetween.length === 0) {
        showToast('Please select at least one person to split with', 'error');
        return;
    }

    try {
        const snapshot = await getDatabaseValue(groupRef);
        if (!snapshot.exists()) {
            throw new Error('Group not found');
        }

        const groupData = snapshot.val();
        const currentExpenses = groupData.expenses || [];
        
        const newExpense = {
            name: expenseName,
            amount: amount,
            paidBy: paidBy,
            splitBetween: splitBetween,
            date: new Date().toISOString()
        };
        
        const updatedGroupData = {
            ...groupData,
            expenses: [...currentExpenses, newExpense]
        };
        
        await set(groupRef, updatedGroupData);
        e.target.reset();
        showToast('Expense added successfully');
    } catch (error) {
        console.error('Error adding expense:', error);
        showToast('Error adding expense', 'error');
    }
});

// Handle copying group link
document.getElementById('copy-group-link').addEventListener('click', () => {
    const groupLink = `${window.location.origin}/index.html?group=${groupId}`;
    navigator.clipboard.writeText(groupLink).then(() => {
        alert('Group link copied to clipboard!');
    });
});

// Helper function to update people list
function updatePeopleList(people) {
    const paidBySelect = document.getElementById('quick-paid-by');
    const defaultGroup = document.getElementById('default-group');
    
    // Clear existing options/checkboxes
    paidBySelect.innerHTML = '<option value="">Select person</option>';
    defaultGroup.innerHTML = '';
    
    // Add new options/checkboxes
    people.forEach(person => {
        // Add to paid by select
        const option = document.createElement('option');
        option.value = person;
        option.textContent = person;
        paidBySelect.appendChild(option);
        
        // Add to split between checkboxes
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.innerHTML = `
            <input type="checkbox" id="split-${person}" value="${person}" checked>
            <label for="split-${person}">${person}</label>
        `;
        defaultGroup.appendChild(div);
    });

    // Update Select All button text
    const selectAllBtn = document.getElementById('select-all');
    if (selectAllBtn) {
        selectAllBtn.innerHTML = '<i class="fas fa-users-slash"></i> Deselect All';
    }
}

// Helper function to show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }, 100);
}

// Helper function to update expense list
function updateExpenseList(expenses) {
    const expenseList = document.getElementById('expense-list');
    
    if (!expenses || expenses.length === 0) {
        expenseList.innerHTML = '<div class="no-expenses">No expenses yet</div>';
        return;
    }

    // Sort expenses by date (newest first)
    const sortedExpenses = [...expenses].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    const expenseHTML = `
        <div class="expense-header">
            <h3>Expense History</h3>
            <button class="btn-whatsapp" onclick="exportToWhatsApp()">
                <i class="fab fa-whatsapp"></i>
                Share
            </button>
        </div>
        ${sortedExpenses.map((expense, index) => `
            <div class="expense-item">
                <div class="expense-main">
                    <div class="expense-details">
                        <span class="expense-name">${expense.name}</span>
                        <span class="expense-amount">£${expense.amount.toFixed(2)}</span>
                    </div>
                    <div class="expense-meta">
                        <span class="expense-paid-by">
                            <i class="fas fa-user"></i> ${expense.paidBy}
                        </span>
                        <button class="btn-delete" onclick="deleteExpense(${index})" aria-label="Delete expense">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="expense-splits">
                    <i class="fas fa-users"></i> Split with: ${expense.splitBetween.join(', ')}
                </div>
                <div class="expense-date">
                    <i class="far fa-calendar"></i> ${new Date(expense.date).toLocaleDateString()}
                </div>
            </div>
        `).join('')}
    `;
    
    expenseList.innerHTML = expenseHTML;
}

// Helper function to calculate settlements
function calculateSettlements(expenses) {
    const balances = {};
    const settlements = [];

    // Initialize balances for all participants
    expenses.forEach(expense => {
        expense.splitBetween.forEach(participant => {
            if (!balances[participant]) {
                balances[participant] = 0;
            }
        });
        // Also initialize balance for the payer if not already done
        if (!balances[expense.paidBy]) {
            balances[expense.paidBy] = 0;
        }
    });

    // Calculate net balance for each person
    expenses.forEach(expense => {
        const amount = parseFloat(expense.amount);
        const paidBy = expense.paidBy;
        const splitBetween = expense.splitBetween;
        
        // Add the full amount to payer's balance
        balances[paidBy] += amount;
        
        // Calculate share per person (excluding payer if they're not in splitBetween)
        const sharePerPerson = amount / splitBetween.length;
        
        // Subtract share from each participant
        splitBetween.forEach(participant => {
            balances[participant] -= sharePerPerson;
        });
    });

    // Separate people into debtors and creditors
    const debtors = [];
    const creditors = [];
    
    Object.entries(balances).forEach(([person, balance]) => {
        if (balance < -0.01) { // Using small epsilon to handle floating point precision
            debtors.push({ person, amount: Math.abs(balance) });
        } else if (balance > 0.01) {
            creditors.push({ person, amount: balance });
        }
    });

    // Sort debtors and creditors by amount
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    // Create settlements
    while (debtors.length > 0 && creditors.length > 0) {
        const debtor = debtors[0];
        const creditor = creditors[0];
        
        const amount = Math.min(debtor.amount, creditor.amount);
        
        settlements.push({
            from: debtor.person,
            to: creditor.person,
            amount: parseFloat(amount.toFixed(2))
        });
        
        debtor.amount -= amount;
        creditor.amount -= amount;
        
        if (debtor.amount < 0.01) debtors.shift();
        if (creditor.amount < 0.01) creditors.shift();
    }

    return settlements;
}

// Helper function to display settlements
function calculateAndDisplaySettlements(expenses, people) {
    const settlements = calculateSettlements(expenses);
    const settlementList = document.getElementById('settlement-list');
    
    if (!settlements || settlements.length === 0) {
        settlementList.innerHTML = '<div class="no-settlements">No settlements needed</div>';
        return;
    }
    
    const settlementHTML = `
        <h2><i class="fas fa-exchange-alt"></i> Settlements</h2>
        <div class="settlements-container">
            ${settlements.map(settlement => `
                <div class="settlement-item">
                    <div class="settlement-details">
                        <span class="settlement-from">
                            <i class="fas fa-user"></i> ${settlement.from}
                        </span>
                        <i class="fas fa-arrow-right"></i>
                        <span class="settlement-to">
                            <i class="fas fa-user"></i> ${settlement.to}
                        </span>
                    </div>
                    <span class="settlement-amount">£${settlement.amount.toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    settlementList.innerHTML = settlementHTML;
}

// Function to delete expense
window.deleteExpense = async function(index) {
    try {
        const snapshot = await getDatabaseValue(groupRef);
        const groupData = snapshot.val() || {};
        const expenses = groupData.expenses || [];
        
        // Get the expense to delete from the sorted list
        const sortedExpenses = [...expenses].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        const expenseToDelete = sortedExpenses[index];
        
        // Find the actual index in the original array
        const actualIndex = expenses.findIndex(exp => 
            exp.name === expenseToDelete.name && 
            exp.amount === expenseToDelete.amount && 
            exp.paidBy === expenseToDelete.paidBy &&
            exp.date === expenseToDelete.date
        );
        
        if (actualIndex === -1) {
            throw new Error('Expense not found');
        }
        
        // Remove the expense from the original array
        expenses.splice(actualIndex, 1);
        
        // Update the database
        await set(ref(db, `groups/${groupId}/expenses`), expenses);
        showToast('Expense deleted successfully');
    } catch (error) {
        console.error('Error deleting expense:', error);
        showToast('Error deleting expense', 'error');
    }
};

// Function to export to WhatsApp
window.exportToWhatsApp = function() {
    const snapshot = getDatabaseValue(groupRef);
    snapshot.then((data) => {
        const groupData = data.val();
        if (!groupData) return;

        const expenses = groupData.expenses || [];
        const people = groupData.people || [];
        
        // Calculate total and per person
        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const perPerson = total / people.length;
        
        // Create message
        let message = `*Group Expenses Summary*\n\n`;
        message += `Group Name: ${groupData.name || 'Unnamed Group'}\n\n`;
        message += `Total: £${total.toFixed(2)}\n`;
        message += `Average per person: £${perPerson.toFixed(2)}\n\n`;
        
        // Add recent expenses
        message += '*All Expenses:*\n\n';
        expenses.reverse().forEach((exp, index) => {
            message += `${index + 1}. ${exp.name}\n`;
            message += `Amount: £${exp.amount.toFixed(2)}\n`;
            message += `Paid by: ${exp.paidBy}\n`;
            message += `Split With: ${exp.splitBetween.join(', ')}\n`;
            message += '--------------------------------\n';
        });
        
        // Add settlements
        const settlements = calculateSettlements(expenses);
        if (settlements.length > 0) {
            message += '\n*Settlements Required:*\n\n';
            settlements.forEach(s => {
                // Calculate the maximum length of names for proper alignment
                const maxNameLength = Math.max(s.from.length, s.to.length);
                const fromSpaces = ' '.repeat(maxNameLength - s.from.length);
                const toSpaces = ' '.repeat(maxNameLength - s.to.length);
                
                message += `* ${s.from}${fromSpaces} --> ${s.to}${toSpaces} £${s.amount.toFixed(2)}\n`;
            });
        }

        // Add group link
        const groupLink = `${window.location.origin}/index.html?group=${groupId}`;
        message += `\nJoin Group:\n${groupLink}`;
        
        // Check if device is mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isMobile) {
            // For mobile devices, open WhatsApp app
            window.open(`whatsapp://send?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            // For desktop, open WhatsApp Web
            window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
        }
    });
};

// Function to copy group link
window.copyGroupLink = function() {
    const groupLink = `${window.location.origin}/index.html?group=${groupId}`;
    navigator.clipboard.writeText(groupLink).then(() => {
        showToast('Group link copied to clipboard!');
    }).catch(() => {
        showToast('Failed to copy link. Please try again.', 'error');
    });
};

// Helper function to update expense summary
function updateExpenseSummary(expenses = [], people = []) {
    if (!expenses || !people) return;

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const averagePerPerson = people.length ? totalExpenses / people.length : 0;

    // Calculate individual totals
    const individualTotals = {};
    people.forEach(person => {
        individualTotals[person] = {
            paid: 0,
            owes: 0
        };
    });

    expenses.forEach(expense => {
        const paidBy = expense.paidBy;
        const amount = expense.amount;
        const splitBetween = expense.splitBetween;
        const splitAmount = amount / splitBetween.length;

        // Add to paid amount
        individualTotals[paidBy].paid += amount;

        // Add to owed amounts
        splitBetween.forEach(person => {
            individualTotals[person].owes += splitAmount;
        });
    });

    // Update the summary in the UI
    const summaryHTML = `
        <div class="total-expenses">
            <span>Total Expenses</span>
            <span class="amount">£${totalExpenses.toFixed(2)}</span>
        </div>
        <div class="total-expenses">
            <span>Average per Person</span>
            <span class="amount">£${averagePerPerson.toFixed(2)}</span>
        </div>
        <div class="individual-expenses">
            <div class="individual-expenses-title">
                <i class="fas fa-user-circle"></i> Individual Summaries
            </div>
            ${Object.entries(individualTotals).map(([person, amounts]) => `
                <div class="person-expense">
                    <span>${person}</span>
                    <div class="person-amounts">
                        <span class="paid" title="Paid">
                            <i class="fas fa-arrow-up"></i> £${amounts.paid.toFixed(2)}
                        </span>
                        <span class="owes" title="Owes">
                            <i class="fas fa-arrow-down"></i> £${amounts.owes.toFixed(2)}
                        </span>
                        <span class="balance ${amounts.paid - amounts.owes >= 0 ? 'positive' : 'negative'}">
                            ${amounts.paid - amounts.owes >= 0 ? '+' : ''}£${Math.abs(amounts.paid - amounts.owes).toFixed(2)}
                        </span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    document.querySelector('.expense-summary').innerHTML = `
        <h2><i class="fas fa-chart-pie"></i> Expense Summary</h2>
        ${summaryHTML}
    `;
}

// Function to generate QR code
function generateQRCode() {
    const qrcodeContainer = document.getElementById('qrcode');
    // Clear previous QR code if any
    qrcodeContainer.innerHTML = '';
    
    const groupLink = `${window.location.origin}/index.html?group=${groupId}`;
    
    // Create QR code
    new QRCode(qrcodeContainer, {
        text: groupLink,
        width: 180,
        height: 180,
        colorDark: "#764ba2",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}