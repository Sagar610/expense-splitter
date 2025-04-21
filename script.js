// Store people and expenses
let people = [];
let expenses = [];
let defaultGroup = [];

// Load data from Firebase
function loadFromFirebase() {
    console.log('Loading data from Firebase...');
    
    try {
        // Load people
        const peopleRef = ref(database, 'people');
        onValue(peopleRef, (snapshot) => {
            const data = snapshot.val();
            console.log('People data:', data);
            people = data || [];
            updatePeopleSelects();
        }, (error) => {
            console.error('Error loading people:', error);
        });

        // Load expenses
        const expensesRef = ref(database, 'expenses');
        onValue(expensesRef, (snapshot) => {
            const data = snapshot.val();
            console.log('Expenses data:', data);
            expenses = data || [];
            updateExpenseList();
            calculateSettlements();
            updateExpenseSummary();
        }, (error) => {
            console.error('Error loading expenses:', error);
        });

        // Load default group
        const defaultGroupRef = ref(database, 'defaultGroup');
        onValue(defaultGroupRef, (snapshot) => {
            const data = snapshot.val();
            console.log('Default group data:', data);
            defaultGroup = data || [];
            // Update checkbox states
            if (defaultGroup.length > 0) {
                defaultGroup.forEach(person => {
                    const checkbox = document.getElementById(`default-${person}`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }
            updateExpenseSummary(); // Update summary when default group changes
        }, (error) => {
            console.error('Error loading default group:', error);
        });
    } catch (error) {
        console.error('Error in loadFromFirebase:', error);
    }
}

// Save data to Firebase
function saveToFirebase() {
    console.log('Saving data to Firebase...');
    
    try {
        set(ref(database, 'people'), people)
            .then(() => console.log('People saved successfully'))
            .catch(error => console.error('Error saving people:', error));
            
        set(ref(database, 'expenses'), expenses)
            .then(() => console.log('Expenses saved successfully'))
            .catch(error => console.error('Error saving expenses:', error));
            
        set(ref(database, 'defaultGroup'), defaultGroup)
            .then(() => console.log('Default group saved successfully'))
            .catch(error => console.error('Error saving default group:', error));
    } catch (error) {
        console.error('Error in saveToFirebase:', error);
    }
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
});

// Save default group
saveDefaultGroupBtn.addEventListener('click', () => {
    defaultGroup = Array.from(document.querySelectorAll('#default-group input:checked'))
        .map(checkbox => checkbox.value);
    console.log('Saving default group:', defaultGroup);
    if (defaultGroup.length > 0) {
        alert('Default group saved successfully!');
        saveToFirebase();
        updateExpenseSummary(); // Update summary when default group changes
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
        defaultCheckboxDiv.innerHTML = `
            <input type="checkbox" id="default-${person}" value="${person}">
            <label for="default-${person}">${person}</label>
        `;
        defaultGroupDiv.appendChild(defaultCheckboxDiv);
    });
    
    // Reset select all button text
    selectAllBtn.textContent = 'Select All';
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