"use strict";

// Toastr configuration
toastr.options = {
    "closeButton": true,
    "debug": false,
    "newestOnTop": false,
    "progressBar": true,
    "positionClass": "toast-top-right",
    "preventDuplicates": false,
    "onclick": null,
    "showDuration": "300",
    "hideDuration": "1000",
    "timeOut": "5000",
    "extendedTimeOut": "1000",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut"
};

// Debounce function to limit the rate of function calls
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Initialize SignalR connection
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chathub")
    .build();

// Disable the send button until connection is established
document.getElementById("sendButton").disabled = true;

// Receive messages from the server
connection.on("ReceiveMessage", function (user, message) {
    const li = document.createElement("li");
    li.textContent = `${user}: ${message}`;
    li.className = "list-group-item";
    document.getElementById("messagesList").appendChild(li);

    // Show a toast notification for the new message
    toastr.info(`New message from ${user}: ${message}`);
});

// Initialize a set to track users currently typing
const usersTyping = new Set();

// Receive typing notifications
connection.on("UserTyping", function (user) {
    console.log(`Received UserTyping from ${user}`);
    usersTyping.add(user);
    updateTypingIndicator();
});

// Receive stopped typing notifications
connection.on("UserStoppedTyping", function (user) {
    console.log(`Received UserStoppedTyping from ${user}`);
    usersTyping.delete(user);
    updateTypingIndicator();
});

// Function to update the typing indicator display
function updateTypingIndicator() {
    const typingIndicator = document.getElementById("typingIndicator");
    if (usersTyping.size === 0) {
        typingIndicator.textContent = '';
    } else {
        const users = [...usersTyping];
        if (users.length === 1) {
            typingIndicator.textContent = `${users[0]} is typing...`;
        } else if (users.length === 2) {
            typingIndicator.textContent = `${users[0]} and ${users[1]} are typing...`;
        } else {
            typingIndicator.textContent = `${users.length} users are typing...`;
        }
    }
}


// Start the SignalR connection
connection.start().then(function () {
    document.getElementById("sendButton").disabled = false;
    toastr.success("Connected to the chat server.");
}).catch(function (err) {
    console.error(err.toString());
    toastr.error("Failed to connect to the chat server.");
});

// Handle disconnection
connection.onclose(function () {
    toastr.warning("Disconnected from the chat server.");
});

// Send message function
function sendMessage() {
    const user = document.getElementById("userInput").value.trim();
    const message = document.getElementById("messageInput").value.trim();
    if (user && message) {
        connection.invoke("SendMessage", user, message).then(function () {
            toastr.success("Message sent successfully.");
        }).catch(function (err) {
            console.error(err.toString());
            toastr.error("Failed to send message. Please try again.");
        });
        document.getElementById("messageInput").value = '';

        // After sending a message, ensure 'UserStoppedTyping' is sent
        connection.invoke("UserStoppedTyping", user).catch(function (err) {
            console.error(err.toString());
        });
    } else {
        toastr.warning("Please enter both your name and a message.");
    }
}

// Client-side timeout management
let typingTimeout;

// Debounced typing function
const debouncedUserTyping = debounce(function() {
    const user = document.getElementById("userInput").value.trim();
    const messageInput = document.getElementById("messageInput");
    const message = messageInput.value.trim();

    if (user && message) {
        console.log(`Sending UserTyping event for ${user}`);
        connection.invoke("UserTyping", user).catch(function (err) {
            console.error(err.toString());
        });

        // Clear existing timeout
        clearTimeout(typingTimeout);

        // Set a new timeout to send UserStoppedTyping after 3 seconds of inactivity
        typingTimeout = setTimeout(() => {
            console.log(`Sending UserStoppedTyping event for ${user}`);
            connection.invoke("UserStoppedTyping", user).catch(function (err) {
                console.error(err.toString());
            });
        }, 3000); // 3 seconds
    } else if (user && !message) {
        // If input is cleared, send UserStoppedTyping immediately
        console.log(`Input cleared. Sending UserStoppedTyping event for ${user}`);
        connection.invoke("UserStoppedTyping", user).catch(function (err) {
            console.error(err.toString());
        });

        // Clear existing timeout
        clearTimeout(typingTimeout);
    }
}, 500); // 500ms debounce

// Update the event listener to use the debounced function
document.getElementById("messageInput").addEventListener("input", debouncedUserTyping);
