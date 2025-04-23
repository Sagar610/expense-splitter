// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAOB-xrC-BNm0BRqrdSbiRiJ6fScAsh4S4",
    authDomain: "splitwise-eb56b.firebaseapp.com",
    databaseURL: "https://splitwise-eb56b-default-rtdb.firebaseio.com",
    projectId: "splitwise-eb56b",
    storageBucket: "splitwise-eb56b.firebasestorage.app",
    messagingSenderId: "357345598220",
    appId: "1:357345598220:web:0547753ff0929ff2f20729",
    measurementId: "G-700HZHRKMJ"
};

let app;
let database;
let analytics;
let currentGroupId = null;
let currentGroupName = null;

// Initialize Firebase
try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    analytics = getAnalytics(app);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Error initializing Firebase:", error);
    alert("Error connecting to the database. Please check your Firebase configuration.");
}

// Store people and expenses
let people = [];
let expenses = [];
let defaultGroup = [];

// Load data from Firebase
function loadFromFirebase() {
    // Get group ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentGroupId = urlParams.get('group');

    if (!currentGroupId) {
        window.location.href = 'main.html';
        return;
    }

    // Load group data
    const groupRef = ref(database, `groups/${currentGroupId}`);
    onValue(groupRef, (snapshot) => {
        const group = snapshot.val();
        if (group) {
            currentGroupName = group.name;
            people = group.people || [];
            expenses = group.expenses || [];
            defaultGroup = group.defaultGroup || [];
            
            // Update group name display
            const groupNameDisplay = document.getElementById('group-name-display');
            if (groupNameDisplay) {
                groupNameDisplay.textContent = currentGroupName;
            }
            
            updatePeopleSelects();
            updateExpenseList();
            calculateSettlements();
            updateExpenseSummary();
        }
    }, (error) => {
        console.error("Error loading group data:", error);
        alert("Error loading group data. Please check your Firebase configuration.");
    });
}

// Save data to Firebase
function saveToFirebase() {
    if (!currentGroupId) return;

    const groupRef = ref(database, `groups/${currentGroupId}`);
    set(groupRef, {
        id: currentGroupId,
        name: currentGroupName,
        people: people,
        expenses: expenses,
        defaultGroup: defaultGroup
    }).catch(error => {
        console.error('Error saving to Firebase:', error);
        alert('Error saving data. Please try again.');
    });
}

// DOM Elements
const addMultiplePeopleForm = document.getElementById('add-multiple-people-form');
const quickExpenseForm = document.getElementById('quick-expense-form');
const quickPaidBySelect = document.getElementById('quick-paid-by');
const defaultGroupDiv = document.getElementById('default-group');
const saveDefaultGroupBtn = document.getElementById('save-default-group');
const selectAllBtn = document.getElementById('select-all');
const expenseList = document.getElementById('expense-list');
const settlementList = document.getElementById('settlement-list');
const totalExpensesElement = document.getElementById('total-expenses');
const averagePerPersonElement = document.getElementById('average-per-person');
const exportExpensesBtn = document.getElementById('export-expenses');

// Load data when page loads
document.addEventListener('DOMContentLoaded', loadFromFirebase);

// Add multiple people form submission
addMultiplePeopleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const multiplePeopleInput = document.getElementById('multiple-people').value.trim();
    
    if (multiplePeopleInput) {
        const newPeople = multiplePeopleInput.split(',')
            .map(name => name.trim())
            .filter(name => name && !people.includes(name));
        
        if (newPeople.length > 0) {
            people.push(...newPeople);
            updatePeopleSelects();
            addMultiplePeopleForm.reset();
            updateExpenseSummary();
            saveToFirebase();
        }
    }
});

// Select all button click handler
selectAllBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const checkboxes = document.querySelectorAll('#default-group input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
    });
    
    // Update the button text
    selectAllBtn.textContent = allChecked ? 'Select All' : 'Deselect All';
    
    // Update defaultGroup array
    defaultGroup = Array.from(document.querySelectorAll('#default-group input:checked'))
        .map(checkbox => checkbox.value);
    
    // Save changes
    saveToFirebase();
});

// Save default group
saveDefaultGroupBtn.addEventListener('click', () => {
    const selectedCheckboxes = document.querySelectorAll('#default-group input:checked');
    defaultGroup = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
    
    if (defaultGroup.length > 0) {
        console.log('Saving default group:', defaultGroup);
        saveToFirebase();
        alert('Default group saved successfully!');
        updateExpenseSummary();
    } else {
        alert('Please select at least one person for the default group.');
    }
});

// Quick expense form submission
quickExpenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const expenseName = document.getElementById('quick-expense-name').value.trim();
    const amount = parseFloat(document.getElementById('quick-expense-amount').value);
    const paidBy = document.getElementById('quick-paid-by').value;
    
    if (expenseName && amount > 0 && paidBy && defaultGroup.length > 0) {
        const expense = {
            name: expenseName,
            amount: amount,
            paidBy: paidBy,
            splitBetween: defaultGroup,
            date: new Date().toISOString()
        };
        
        expenses.push(expense);
        updateExpenseList();
        calculateSettlements();
        updateExpenseSummary();
        quickExpenseForm.reset();
        saveToFirebase();
    } else if (defaultGroup.length === 0) {
        alert('Please set up a default group first!');
    }
});

// Update people selects and checkboxes
function updatePeopleSelects() {
    // Update paid by select
    const selectOptions = '<option value="">Select Person</option>' + 
        people.map(person => `<option value="${person}">${person}</option>`).join('');
    
    quickPaidBySelect.innerHTML = selectOptions;
    
    // Update default group checkboxes
    defaultGroupDiv.innerHTML = '';
    
    people.forEach(person => {
        const defaultCheckboxDiv = document.createElement('div');
        defaultCheckboxDiv.className = 'checkbox-item';
        const isChecked = defaultGroup.includes(person);
        defaultCheckboxDiv.innerHTML = `
            <input type="checkbox" id="default-${person}" value="${person}" ${isChecked ? 'checked' : ''}>
            <label for="default-${person}">${person}</label>
        `;
        defaultGroupDiv.appendChild(defaultCheckboxDiv);
    });
    
    // Reset select all button text
    selectAllBtn.textContent = defaultGroup.length === people.length ? 'Deselect All' : 'Select All';
}

// Update expense summary
function updateExpenseSummary() {
    console.log('Calculating expense summary...');
    console.log('Expenses:', expenses);
    console.log('Default group:', defaultGroup);
    
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    console.log('Total expenses:', totalExpenses);
    
    // Calculate average based on default group size, not total people
    const averagePerPerson = defaultGroup.length > 0 ? totalExpenses / defaultGroup.length : 0;
    console.log('Average per person:', averagePerPerson);
    console.log('Default group size:', defaultGroup.length);
    
    totalExpensesElement.textContent = `£${totalExpenses.toFixed(2)}`;
    averagePerPersonElement.textContent = `£${averagePerPerson.toFixed(2)}`;
}

// Update expense list
function updateExpenseList() {
    expenseList.innerHTML = '';
    
    // Add export button
    const exportButton = document.createElement('button');
    exportButton.className = 'btn-export';
    exportButton.textContent = 'Share';
    exportButton.title = 'Share expenses';
    exportButton.onclick = exportToWhatsApp;
    expenseList.appendChild(exportButton);
    
    // Add expenses
    expenses.forEach((expense, index) => {
        const expenseItem = document.createElement('div');
        expenseItem.className = 'expense-item';
        
        const expenseContent = document.createElement('div');
        expenseContent.className = 'expense-content';
        
        const expenseDetails = document.createElement('div');
        expenseDetails.className = 'expense-details';
        
        const number = document.createElement('span');
        number.className = 'expense-number';
        number.textContent = `${index + 1}.`;
        
        const name = document.createElement('span');
        name.className = 'expense-name';
        name.textContent = expense.name;
        
        const amount = document.createElement('span');
        amount.className = 'expense-amount';
        amount.textContent = `£${expense.amount.toFixed(2)}`;
        
        const paidBy = document.createElement('div');
        paidBy.className = 'expense-paid-by';
        
        const paidByText = document.createElement('span');
        paidByText.textContent = `by ${expense.paidBy}`;
        
        // Add undo button as X mark
        const undoButton = document.createElement('button');
        undoButton.className = 'btn-undo';
        undoButton.innerHTML = '×';
        undoButton.title = 'Remove expense';
        undoButton.onclick = () => undoExpense(index);
        
        paidBy.appendChild(paidByText);
        paidBy.appendChild(undoButton);
        
        expenseDetails.appendChild(number);
        expenseDetails.appendChild(name);
        expenseContent.appendChild(expenseDetails);
        expenseContent.appendChild(amount);
        
        expenseItem.appendChild(expenseContent);
        expenseItem.appendChild(paidBy);
        
        expenseList.appendChild(expenseItem);
    });
}

// Undo expense function
function undoExpense(index) {
    if (confirm('Are you sure you want to undo this expense?')) {
        expenses.splice(index, 1);
        saveToFirebase();
        updateExpenseList();
        calculateSettlements();
        updateExpenseSummary();
    }
}

// Calculate settlements
function calculateSettlements() {
    const balances = {};
    
    // Initialize balances for all people
    people.forEach(person => {
        balances[person] = 0;
    });
    
    // Calculate net balance for each person
    expenses.forEach(expense => {
        const splitAmount = expense.amount / expense.splitBetween.length;
        
        // Add to paid person's balance
        balances[expense.paidBy] += expense.amount;
        
        // Subtract from each person who owes
        expense.splitBetween.forEach(person => {
            balances[person] -= splitAmount;
        });
    });
    
    // Calculate who owes whom
    const settlements = [];
    const debtors = Object.entries(balances)
        .filter(([_, balance]) => balance < 0)
        .map(([person, balance]) => ({ person, amount: -balance }));
    
    const creditors = Object.entries(balances)
        .filter(([_, balance]) => balance > 0)
        .map(([person, balance]) => ({ person, amount: balance }));
    
    // Match debtors with creditors
    debtors.forEach(debtor => {
        let remainingDebt = debtor.amount;
        
        creditors.forEach(creditor => {
            if (remainingDebt > 0 && creditor.amount > 0) {
                const amount = Math.min(remainingDebt, creditor.amount);
                settlements.push({
                    from: debtor.person,
                    to: creditor.person,
                    amount: amount
                });
                remainingDebt -= amount;
                creditor.amount -= amount;
            }
        });
    });
    
    // Update settlement list
    settlementList.innerHTML = '';
    settlements.forEach(settlement => {
        const settlementItem = document.createElement('div');
        settlementItem.className = 'settlement-item';
        settlementItem.textContent = `${settlement.from} owes ${settlement.to} £${settlement.amount.toFixed(2)}`;
        settlementList.appendChild(settlementItem);
    });
}

// Export functions
function formatExpenseForWhatsApp(expense) {
    const splitAmount = expense.amount / expense.splitBetween.length;
    const allPeopleSelected = expense.splitBetween.length === people.length;
    const splitBetweenText = allPeopleSelected ? 
        `All (${expense.splitBetween.length})` : 
        expense.splitBetween.join(', ');
    
    return `💰 *${expense.name}*
Amount: £${expense.amount.toFixed(2)}
Paid by: ${expense.paidBy}
Split between: ${splitBetweenText}
Each person owes: £${splitAmount.toFixed(2)}
Date: ${new Date(expense.date).toLocaleDateString()}
-------------------`;
}

function formatSettlementForWhatsApp(settlement) {
    return `💸 ${settlement.from} owes ${settlement.to} £${settlement.amount.toFixed(2)}`;
}

function exportToWhatsApp() {
    let message = `*Expense Splitter Summary*\n\n`;
    
    // Add expense history
    message += `*Expense History*\n`;
    message += expenses.map(formatExpenseForWhatsApp).join('\n');
    message += `\n*Total Expenses: £${totalExpensesElement.textContent.replace('£', '')}*`;
    message += `\n*Average per Person: £${averagePerPersonElement.textContent.replace('£', '')}*`;
    message += `\n-------------------`;
    
    // Add settlements
    message += `\n\n*Settlement Summary*\n`;
    const settlements = Array.from(settlementList.children).map(item => {
        const text = item.textContent.trim();
        return {
            from: text.split(' owes ')[0],
            to: text.split(' owes ')[1].split(' £')[0],
            amount: parseFloat(text.split('£')[1])
        };
    });
    message += settlements.map(formatSettlementForWhatsApp).join('\n');
    
    // Create a temporary textarea to copy the text
    const textarea = document.createElement('textarea');
    textarea.value = message;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    // Open WhatsApp with the message
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Copy group link to clipboard
document.getElementById('copy-group-link').addEventListener('click', () => {
    const shareLink = `${window.location.origin}/index.html?group=${currentGroupId}`;
    navigator.clipboard.writeText(shareLink)
        .then(() => {
            const button = document.getElementById('copy-group-link');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Link Copied!';
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Error copying link:', err);
            alert('Failed to copy link. Please try again.');
        });
}); 