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

try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    analytics = getAnalytics(app);
    console.log("Firebase initialized successfully");
    
    // Test write operation
    const testRef = ref(database, 'test');
    set(testRef, { timestamp: new Date().toISOString() })
        .then(() => {
            console.log("Test write successful - Firebase connection is working");
        })
        .catch(error => {
            console.error("Test write failed:", error);
            console.error("Error details:", {
                code: error.code,
                message: error.message,
                name: error.name
            });
        });
} catch (error) {
    console.error("Error initializing Firebase:", error);
    alert("Error connecting to the database. Please check your Firebase configuration.");
}

// Create new group
function createGroup(groupName) {
    if (!database) {
        console.error("Database not initialized");
        alert("Database not initialized. Please check your Firebase configuration.");
        return;
    }

    console.log("Creating group in Firebase...");
    const groupId = Date.now().toString();
    const group = {
        id: groupId,
        name: groupName,
        createdAt: new Date().toISOString(),
        expenses: [],
        people: [],
        defaultGroup: []
    };

    console.log("Group data:", group);
    console.log("Database path:", `groups/${groupId}`);

    try {
        // Save to Firebase
        const groupRef = ref(database, `groups/${groupId}`);
        console.log("Attempting to set data in Firebase...");
        
        set(groupRef, group)
            .then(() => {
                console.log("Group created successfully in Firebase");
                
                // Generate share link
                const shareLink = `${window.location.origin}/index.html?group=${groupId}`;
                console.log("Share link:", shareLink);
                
                // Show success message with copy button
                const message = `Group created successfully!\n\nShare this link with your group members:\n${shareLink}\n\nClick OK to go to the group page.`;
                if (confirm(message)) {
                    // Redirect to the group page
                    window.location.href = shareLink;
                }
            })
            .catch(error => {
                console.error('Error creating group:', error);
                console.error('Error details:', {
                    code: error.code,
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                });
                
                let errorMessage = 'Error creating group. ';
                if (error.code === 'PERMISSION_DENIED') {
                    errorMessage += 'Please check your Firebase database rules.';
                } else {
                    errorMessage += 'Please check your Firebase configuration.';
                }
                alert(errorMessage);
            });
    } catch (error) {
        console.error('Unexpected error in createGroup:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        alert('An unexpected error occurred while creating the group.');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing...");
});

document.getElementById('create-group-form').addEventListener('submit', (e) => {
    e.preventDefault();
    console.log("Create group form submitted");
    
    const groupName = document.getElementById('group-name').value.trim();
    console.log("Group name:", groupName);
    
    if (groupName) {
        console.log("Creating group with name:", groupName);
        createGroup(groupName);
    } else {
        console.log("Group name is empty");
        alert("Please enter a group name");
    }
}); 