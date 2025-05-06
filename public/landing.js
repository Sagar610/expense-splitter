// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, push, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Initialize Firebase
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
const database = getDatabase(app);

// Check if we're already in a group
const urlParams = new URLSearchParams(window.location.search);
const groupId = urlParams.get('group');

console.log('Landing page loaded, checking for group ID:', groupId);

if (groupId) {
    console.log('Group ID found, redirecting to main page');
    // If we have a group ID, redirect to the main page
    window.location.href = `index.html?group=${groupId}`;
}

// Handle Create Group form submission
document.getElementById('create-group-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Group creation form submitted');
    
    const groupName = document.getElementById('group-name').value.trim();
    if (!groupName) {
        alert('Please enter a group name');
        return;
    }
    
    try {
        const groupRef = ref(database, 'groups');
        const newGroupRef = push(groupRef);
        const newGroupId = newGroupRef.key;
        
        console.log('Creating group in Firebase:', {
            id: newGroupId,
            name: groupName
        });
        
        await set(newGroupRef, {
            id: newGroupId,
            name: groupName,
            created: new Date().toISOString(),
            expenses: [],
            people: []
        });
        
        console.log('Group created successfully, redirecting to main page');
        window.location.href = `index.html?group=${newGroupId}`;
    } catch (error) {
        console.error("Error creating group:", error);
        alert("Error creating group. Please try again.");
    }
});

// Handle Join Group form submission
document.getElementById('join-group-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Join group form submitted');
    
    let groupId = document.getElementById('group-id').value.trim();
    if (!groupId) {
        alert('Please enter a valid Group ID or Group Link');
        return;
    }

    // Extract group ID if a full URL is provided
    try {
        if (groupId.includes('index.html?group=')) {
            const url = new URL(groupId);
            groupId = url.searchParams.get('group');
        } else if (groupId.includes('group=')) {
            const params = new URLSearchParams(groupId.split('?')[1]);
            groupId = params.get('group');
        }
    } catch (error) {
        console.log('Not a URL, treating as direct group ID');
    }
    
    if (!groupId) {
        alert('Invalid group link or ID. Please check and try again.');
        return;
    }
    
    try {
        // Verify if group exists
        const groupRef = ref(database, `groups/${groupId}`);
        const snapshot = await get(groupRef);
        
        if (snapshot.exists()) {
            console.log('Group found, redirecting to main page');
            window.location.href = `index.html?group=${groupId}`;
        } else {
            alert('Group not found. Please check the Group ID/Link and try again.');
        }
    } catch (error) {
        console.error("Error joining group:", error);
        alert("Error joining group. Please try again.");
    }
});

// Function to copy group link
window.copyGroupLink = function() {
    const groupId = urlParams.get('group');
    if (groupId) {
        const groupLink = `${window.location.origin}/index.html?group=${groupId}`;
        navigator.clipboard.writeText(groupLink).then(() => {
            showToast('Group link copied to clipboard!');
        }).catch(() => {
            showToast('Failed to copy link. Please try again.', 'error');
        });
    } else {
        showToast('Please create or join a group first.', 'error');
    }
};

// Function to show toast notification
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

// Function to share on WhatsApp
window.shareOnWhatsApp = function() {
    const appUrl = window.location.origin;
    const message = `Hey! Check out this awesome bill splitting app created by Sagar: ${appUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
};

// Function to copy app link
window.copyAppLink = function() {
    const appUrl = window.location.origin;
    navigator.clipboard.writeText(appUrl).then(() => {
        showToast('App link copied to clipboard!');
    }).catch(() => {
        showToast('Failed to copy link. Please try again.', 'error');
    });
}; 