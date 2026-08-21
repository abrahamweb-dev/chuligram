/* =====================================================
   CHULIGRAM FRONTEND
   Talks to the Node/Express + MySQL backend over REST,
   and to Socket.IO for real-time messages.
===================================================== */

const API_BASE = "http://localhost:4000/api";

let socket = null;


/* =====================================================
   AUTH TOKEN / CURRENT USER (cached client-side)
===================================================== */

function getToken() {
    return localStorage.getItem("authToken");
}

function getCurrentUser() {
    const saved = localStorage.getItem("currentUser");
    if (!saved) return null;
    try {
        return JSON.parse(saved);
    } catch {
        return null;
    }
}

function requireLogin() {
    const user = getCurrentUser();
    const token = getToken();

    if (!user || !token) {
        const depth = window.location.pathname.includes("/Pages/") ? "../" : "";
        window.location.href = depth + "Index.html";
        return null;
    }
    return user;
}


/* =====================================================
   API HELPER
===================================================== */

async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
            ...(options.headers || {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}


/* =====================================================
   LOGIN / LOGOUT
===================================================== */

async function login(event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    message.textContent = "";

    try {
        const data = await api("/auth/login", {
            method: "POST",
            body: { username, password }
        });

        localStorage.setItem("authToken", data.token);
        localStorage.setItem("currentUser", JSON.stringify(data.user));

        window.location.href = "Pages/Home.html";

    } catch (err) {
        message.textContent = "❌ " + err.message;
    }
}

async function register(event) {
    event.preventDefault();

    const name = document.getElementById("regName").value.trim();
    const username = document.getElementById("regUsername").value.trim().toLowerCase();
    const password = document.getElementById("regPassword").value;
    const message = document.getElementById("regMessage");

    message.textContent = "";

    try {
        const data = await api("/auth/register", {
            method: "POST",
            body: { name, username, password }
        });

        localStorage.setItem("authToken", data.token);
        localStorage.setItem("currentUser", JSON.stringify(data.user));

        window.location.href = "Home.html";

    } catch (err) {
        message.textContent = "❌ " + err.message;
    }
}

function logout() {
    const confirmed = confirm("Are you sure you want to logout?");
    if (!confirmed) return;

    if (socket) {
        socket.disconnect();
        socket = null;
    }

    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");

    window.location.href = "../Index.html";
}


/* =====================================================
   NAVIGATION
===================================================== */

function goTo(page) {
    window.location.href = page;
}

function goBack() {
    window.history.back();
}


/* =====================================================
   SOCKET.IO
===================================================== */

function connectSocket() {
    if (socket) return socket;

    socket = io("http://localhost:4000", {
        auth: { token: getToken() }
    });

    socket.on("connect", () => {
        const status = document.getElementById("connectionStatus");
        if (status) status.textContent = "Connected";
    });

    socket.on("disconnect", () => {
        const status = document.getElementById("connectionStatus");
        if (status) status.textContent = "Reconnecting…";
    });

    // A message arrived for a chat that's currently open -> render it live
    socket.on("receive_message", (message) => {
        const currentUser = getCurrentUser();
        const activeOtherId = Number(localStorage.getItem("activeChatUser"));

        const involvesActiveChat =
            (message.sender_id === activeOtherId || message.receiver_id === activeOtherId);

        if (document.getElementById("messages") && involvesActiveChat) {
            appendMessageToDOM(message, currentUser.id);
        }

        // Keep the chat list fresh if it's on screen
        if (document.getElementById("chatList")) {
            loadChatList();
        }
    });

    socket.on("presence", ({ userId, online }) => {
        document
            .querySelectorAll(`[data-user-id="${userId}"] .online-dot, [data-user-id="${userId}"] .offline-dot`)
            .forEach(el => {
                el.className = online ? "online-dot" : "offline-dot";
            });
    });

    return socket;
}


/* =====================================================
   CHAT IDs
===================================================== */

function getChatId(userA, userB) {
    const ids = [Number(userA), Number(userB)].sort((a, b) => a - b);
    return `private_${ids[0]}_${ids[1]}`;
}

function openPrivateChat(userId) {
    localStorage.setItem("activeChatUser", userId);
    window.location.href = "Chat.html";
}


/* =====================================================
   CHAT PAGE
===================================================== */

async function loadChat() {
    const currentUser = requireLogin();
    if (!currentUser) return;

    const otherUserId = Number(localStorage.getItem("activeChatUser"));

    if (!otherUserId) {
        window.location.href = "Contacts.html";
        return;
    }

    connectSocket();

    try {
        const otherUser = await api(`/users/${otherUserId}`);

        document.getElementById("chatName").textContent = otherUser.name;
        document.getElementById("chatStatus").textContent = otherUser.online ? "online" : "offline";
        document.getElementById("chatAvatar").textContent = otherUser.name.charAt(0).toUpperCase();

        await loadMessages();

    } catch (err) {
        alert("Could not load chat: " + err.message);
    }
}

async function loadMessages() {
    const container = document.getElementById("messages");
    if (!container) return;

    const currentUser = getCurrentUser();
    const otherUserId = Number(localStorage.getItem("activeChatUser"));
    if (!currentUser || !otherUserId) return;

    try {
        const messages = await api(`/messages/${otherUserId}`);

        container.innerHTML = "";

        if (messages.length === 0) {
            container.innerHTML = `
                <div class="empty-chat">
                    <div>👋</div>
                    <strong>Start the conversation</strong>
                    <p>Send the first message.</p>
                </div>
            `;
            return;
        }

        messages.forEach(msg => appendMessageToDOM(msg, currentUser.id, false));

        container.scrollTop = container.scrollHeight;

    } catch (err) {
        console.error("loadMessages failed:", err);
    }
}

function appendMessageToDOM(msg, currentUserId, scroll = true) {
    const container = document.getElementById("messages");
    if (!container) return;

    // Clear the "start the conversation" placeholder if present
    const empty = container.querySelector(".empty-chat");
    if (empty) container.innerHTML = "";

    const div = document.createElement("div");
    div.className = msg.sender_id === currentUserId ? "message sent" : "message received";

    const text = document.createElement("span");
    text.textContent = msg.text;

    const time = document.createElement("small");
    time.textContent = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    div.appendChild(text);
    div.appendChild(time);
    container.appendChild(div);

    if (scroll) container.scrollTop = container.scrollHeight;
}

function sendMessage(event) {
    event.preventDefault();

    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if (!text) return;

    const otherUserId = Number(localStorage.getItem("activeChatUser"));
    if (!otherUserId) return;

    connectSocket().emit("send_message", { toUserId: otherUserId, text });

    input.value = "";
    input.focus();
}


/* =====================================================
   CHAT LIST (Home.html)
===================================================== */

async function loadChatList() {
    const container = document.getElementById("chatList");
    if (!container) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
        const [chats, users] = await Promise.all([
            api("/messages"),
            api("/users")
        ]);

        const usersById = Object.fromEntries(users.map(u => [u.id, u]));

        container.innerHTML = "";

        if (!chats.length) {
            container.innerHTML = `
                <div class="empty-chat">
                    <div>💬</div>
                    <strong>No chats yet</strong>
                    <p>Open Contacts and start chatting.</p>
                </div>
            `;
            return;
        }

        chats.forEach(message => {
            const otherId = message.sender_id === currentUser.id ? message.receiver_id : message.sender_id;
            const user = usersById[otherId];
            if (!user) return;

            const item = document.createElement("div");
            item.className = "chat-item";
            item.dataset.userId = user.id;
            item.onclick = () => openPrivateChat(user.id);

            const time = new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            item.innerHTML = `
                <div class="avatar">${escapeHTML(user.name.charAt(0).toUpperCase())}</div>
                <div class="chat-info">
                    <strong>
                        ${escapeHTML(user.name)}
                        <span class="${user.online ? "online-dot" : "offline-dot"}"></span>
                    </strong>
                    <p>${escapeHTML(message.text)}</p>
                </div>
                <small class="chat-time">${escapeHTML(time)}</small>
            `;

            container.appendChild(item);
        });

    } catch (err) {
        console.error("loadChatList failed:", err);
    }
}


/* =====================================================
   CONTACTS
===================================================== */

async function loadContacts() {
    const container = document.getElementById("contactsList");
    if (!container) return;

    try {
        const users = await api("/users");

        container.innerHTML = "";

        users.forEach(user => {
            const item = document.createElement("div");
            item.className = "contact-item";
            item.dataset.userId = user.id;
            item.dataset.name = (user.name + " " + user.username).toLowerCase();

            item.innerHTML = `
                <div class="avatar">${escapeHTML(user.name.charAt(0).toUpperCase())}</div>
                <div class="contact-info">
                    <strong>${escapeHTML(user.name)}</strong>
                    <small>@${escapeHTML(user.username)}</small>
                </div>
                <span class="${user.online ? "online-text" : "offline-text"}">
                    ${user.online ? "Online" : "Offline"}
                </span>
            `;

            item.onclick = () => openPrivateChat(user.id);
            container.appendChild(item);
        });

    } catch (err) {
        console.error("loadContacts failed:", err);
    }
}

function filterContacts() {
    const input = document.getElementById("contactSearch");
    const query = input.value.toLowerCase().trim();

    document.querySelectorAll(".contact-item").forEach(item => {
        item.style.display = item.dataset.name.includes(query) ? "flex" : "none";
    });
}


/* =====================================================
   GROUPS / CHANNELS / BOTS (read-only from backend)
===================================================== */

async function loadGroups() {
    const container = document.getElementById("groupList");
    if (!container) return;

    const groups = await api("/groups");
    container.innerHTML = "";

    groups.forEach(group => {
        const item = document.createElement("div");
        item.className = "chat-item";
        item.innerHTML = `
            <div class="avatar">${group.avatar}</div>
            <div class="chat-info">
                <strong>${escapeHTML(group.name)}</strong>
                <p>${escapeHTML(group.description)}</p>
            </div>
            <small>${group.members.length} members</small>
        `;
        container.appendChild(item);
    });
}

async function loadChannels() {
    const container = document.getElementById("channelList");
    if (!container) return;

    const channels = await api("/channels");
    container.innerHTML = "";

    channels.forEach(channel => {
        const item = document.createElement("div");
        item.className = "chat-item";
        item.innerHTML = `
            <div class="avatar">${channel.avatar}</div>
            <div class="chat-info">
                <strong>${escapeHTML(channel.name)}</strong>
                <p>@${escapeHTML(channel.username)}</p>
            </div>
            <small>${channel.subscribers} subscribers</small>
        `;
        container.appendChild(item);
    });
}


/* =====================================================
   PROFILE
===================================================== */

async function loadProfile() {
    try {
        const user = await api("/users/me");

        document.getElementById("profileAvatar").textContent = user.name.charAt(0).toUpperCase();
        document.getElementById("profileName").textContent = user.name;
        document.getElementById("profileUsername").textContent = "@" + user.username;
        document.getElementById("profileBio").textContent = user.bio || "No bio yet.";

        localStorage.setItem("currentUser", JSON.stringify(user));

    } catch (err) {
        console.error("loadProfile failed:", err);
    }
}

async function editProfile() {
    const user = getCurrentUser();

    const name = prompt("Enter your name:", user.name);
    if (!name || !name.trim()) return;

    const bio = prompt("Enter your bio:", user.bio || "");

    try {
        const updated = await api("/users/me", {
            method: "PUT",
            body: { name: name.trim(), bio: bio || "" }
        });

        localStorage.setItem("currentUser", JSON.stringify(updated));
        alert("Profile updated!");
        loadProfile();

    } catch (err) {
        alert("Update failed: " + err.message);
    }
}


/* =====================================================
   SETTINGS
===================================================== */

function loadSettings() {
    const user = getCurrentUser();
    if (!user) return;

    document.getElementById("settingsAvatar").textContent = user.name.charAt(0).toUpperCase();
    document.getElementById("settingsName").textContent = user.name;
    document.getElementById("settingsUsername").textContent = "@" + user.username;

    updateThemeStatus();
    updateNotificationStatus();
}

function toggleDarkMode() {
    const isLight = document.body.classList.toggle("light-mode");
    localStorage.setItem("darkMode", !isLight);
    updateThemeStatus();
}

function updateThemeStatus() {
    const status = document.getElementById("darkStatus");
    if (!status) return;
    const dark = localStorage.getItem("darkMode") !== "false";
    status.textContent = dark ? "Dark mode enabled" : "Light mode enabled";
}

function toggleNotifications() {
    const enabled = localStorage.getItem("notifications") !== "false";
    localStorage.setItem("notifications", String(!enabled));
    updateNotificationStatus();
}

function updateNotificationStatus() {
    const status = document.getElementById("notificationStatus");
    if (!status) return;
    const enabled = localStorage.getItem("notifications") !== "false";
    status.textContent = enabled ? "On" : "Off";
}


/* =====================================================
   SEARCH
===================================================== */

let searchDebounce = null;

function globalSearch() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(runGlobalSearch, 250);
}

async function runGlobalSearch() {
    const input = document.getElementById("globalSearch");
    const container = document.getElementById("searchResults");
    if (!input || !container) return;

    const query = input.value.toLowerCase().trim();
    container.innerHTML = "";
    if (!query) return;

    try {
        const [users, groups, channels, bots] = await Promise.all([
            api("/users"),
            api("/groups"),
            api("/channels"),
            api("/bots")
        ]);

        users
            .filter(u => u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query))
            .forEach(u => addSearchResult(container, "👤", u.name, "@" + u.username, () => openPrivateChat(u.id)));

        groups
            .filter(g => g.name.toLowerCase().includes(query))
            .forEach(g => addSearchResult(container, "👥", g.name, "Group", null));

        channels
            .filter(c => c.name.toLowerCase().includes(query) || c.username.toLowerCase().includes(query))
            .forEach(c => addSearchResult(container, "📢", c.name, "@" + c.username, null));

        bots
            .filter(b => b.name.toLowerCase().includes(query) || b.username.toLowerCase().includes(query))
            .forEach(b => addSearchResult(container, "🤖", b.name, "@" + b.username, null));

        if (!container.children.length) {
            container.innerHTML = `
                <div class="empty-chat">
                    <div>🔎</div>
                    <strong>No results</strong>
                    <p>Try another search.</p>
                </div>
            `;
        }

    } catch (err) {
        console.error("globalSearch failed:", err);
    }
}

function addSearchResult(container, icon, title, subtitle, action) {
    const item = document.createElement("div");
    item.className = "search-result";
    item.innerHTML = `
        <div class="avatar">${icon}</div>
        <div>
            <strong>${escapeHTML(title)}</strong>
            <small>${escapeHTML(subtitle)}</small>
        </div>
    `;
    if (action) item.onclick = action;
    container.appendChild(item);
}


/* =====================================================
   SECURITY HELPER
===================================================== */

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =====================================================
   LOAD SAVED THEME
===================================================== */

(function loadSavedTheme() {
    if (localStorage.getItem("darkMode") === "false") {
        document.body.classList.add("light-mode");
    }
})();
