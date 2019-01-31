// Sidebar management
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
if (localStorage.getItem('pin-sidebar') == 'true') {
    document.getElementById('pin-sidebar').checked = true;
    document.getElementById('sidebar-content').classList.remove('hidden');
}
function showSidebar(e) {
    document.getElementById('sidebar-content').classList.remove('hidden');
    document.getElementById('sidebar').classList.add('expand');
    e.stopPropagation();
}
function hideSidebar(e) {
    if (!document.getElementById('pin-sidebar').checked) {
        document.getElementById('sidebar-content').classList.add('hidden');
        document.getElementById('sidebar').classList.remove('expand');
    }
}
document.getElementById('sidebar').addEventListener('mouseenter', showSidebar);
document.getElementById('sidebar').addEventListener('touchstart', showSidebar, {
    passive: true
});
document.getElementById('sidebar').addEventListener('mouseleave', hideSidebar);
document.addEventListener('touchstart', hideSidebar, {
    passive: true
});
document.getElementById('pin-sidebar').addEventListener('change', function (e) {
    localStorage.setItem('pin-sidebar', String(!!e.target.checked));
});
function parseLinks(g0) {
    var a = document.createElement('a');
    a.innerHTML = g0;
    var url = a.textContent;
    a.href = url;
    a.target = '_blank';
    a.rel = 'noreferrer';
    return a.outerHTML;
}
function isAtBottom(element) {
    return (window.innerHeight + window.scrollY) >= (element.scrollHeight - 1);
}
function insertAtCursor(text, input) {
    var start = input.selectionStart || 0;
    var before = input.value.substr(0, start);
    var after = input.value.substr(start);
    before += text;
    input.value = before + after;
    input.selectionStart = input.selectionEnd = before.length;
    //updateInputSize();
}
function updateInputSize(input, footer, container) {
    var atBottom = isAtBottom(input);
    input.style.height = '0';
    input.style.height = input.scrollHeight + 'px';
    container.style.marginBottom = footer.offsetHeight + 'px';
    if (atBottom) {
        window.scrollTo(0, container.scrollHeight);
    }
}
// Client
var DataType;
(function (DataType) {
    DataType[DataType["JSON"] = 0] = "JSON";
    DataType[DataType["RAW"] = 1] = "RAW";
})(DataType || (DataType = {}));
var WSClient = /** @class */ (function () {
    function WSClient(address) {
        this.address = address;
        this.socket = null;
        this.bound = {
            open: null,
            close: null,
            error: null,
            message: null
        };
        this.dataType = DataType.RAW;
        this.sendDataType = DataType.RAW;
        this.tab = new Tab();
        this.constructBinds();
    }
    WSClient.prototype.constructBinds = function () {
        this.bound.open = this.socketOpen.bind(this);
        this.bound.close = this.socketClose.bind(this);
        this.bound.error = this.socketError.bind(this);
        this.bound.message = this.socketMessage.bind(this);
    };
    WSClient.prototype.init = function () {
        this.closeSocket();
        this.socket = new WebSocket(this.address);
        this.bindSocket();
        TabManager.addTab(this.tab, this.getTabName());
        return this;
    };
    WSClient.prototype.getTabName = function () {
        return this.address;
    };
    WSClient.prototype.socketOpen = function (ev) {
    };
    WSClient.prototype.socketError = function (ev) {
    };
    WSClient.prototype.socketClose = function (ev) {
    };
    WSClient.prototype.socketMessage = function (msg) {
        var data = msg.data;
        if (this.dataType === DataType.JSON) { // JSON
            try {
                var tempData = JSON.parse(data);
                data = tempData;
            }
            catch (err) {
                throw new Error("Could not stringify data received from server!");
            }
        }
        else if (this.dataType === DataType.RAW) { // String
            // no-op, but perhaps we should make it convert to string just in case.
        }
        else {
            throw new Error("Unknown data type of: " + this.dataType);
        }
        this.handleMessageData(data, msg);
    };
    WSClient.prototype.closeSocket = function () {
        if (this.socket !== null) {
            // Unbind the socket so it won't try to rejoin or anything when we close it
            this.unbindSocket();
            this.socket.close(0);
        }
    };
    WSClient.prototype.bindSocket = function () {
        this.socket.addEventListener("open", this.bound.open);
        this.socket.addEventListener("close", this.bound.close);
        this.socket.addEventListener("error", this.bound.error);
        this.socket.addEventListener("message", this.bound.message);
    };
    WSClient.prototype.unbindSocket = function () {
        this.socket.removeEventListener("open", this.bound.open);
        this.socket.removeEventListener("close", this.bound.close);
        this.socket.removeEventListener("error", this.bound.error);
        this.socket.removeEventListener("message", this.bound.message);
    };
    WSClient.prototype.handleMessageData = function (data, msg) {
        console.log(this, 'received', data);
    };
    WSClient.prototype.send = function (data) {
        if (this.socket instanceof WebSocket && this.socket.readyState === WebSocket.OPEN) {
            if (this.sendDataType === DataType.JSON) {
                this.sendJSON(data);
            }
            else if (this.sendDataType === DataType.RAW) {
                this.socket.send(data);
            }
            else {
                throw new Error("Unknown send data type");
            }
        }
        else {
            console.warn("Attempted to send data", data, "before socket was ready.", this);
        }
    };
    WSClient.prototype.sendJSON = function (data) {
        this.socket.send(JSON.stringify(data));
    };
    return WSClient;
}());
var HCWSClient = /** @class */ (function (_super) {
    __extends(HCWSClient, _super);
    function HCWSClient(nick, pass, channel, address) {
        if (nick === void 0) { nick = null; }
        if (pass === void 0) { pass = null; }
        if (channel === void 0) { channel = null; }
        if (address === void 0) { address = "wss://hack.chat/chat-ws"; }
        var _this = _super.call(this, address) || this;
        _this.dataType = DataType.JSON;
        _this.sendDataType = DataType.JSON;
        if (nick === null) {
            nick = prompt("Nick for " + address, "ICanNotType");
        }
        if (pass === null) {
            pass = prompt("Password (leave blank for nothing):");
            if (pass === undefined || pass === '') {
                pass = null;
            }
        }
        if (channel === null) {
            channel = prompt("Channel to join:", "programming");
        }
        _this.nick = nick;
        _this.pass = pass;
        _this.channel = channel;
        _this.tab.onSend = function (text) {
            _this.sendJSON({
                cmd: 'chat',
                text: text
            });
        };
        _this.handlers = {};
        _this.setupHandlers();
        return _this;
    }
    HCWSClient.prototype.setupHandlers = function () {
        var _this = this;
        this.handlers.chat = function (args, msg) {
            _this.pushMessage(args);
        };
        this.handlers.info = function (args, msg) {
            args.nick = '*';
            _this.pushMessage(args);
        };
        this.handlers.warn = function (args, msg) {
            args.nick = '!';
            _this.pushMessage(args);
        };
        this.handlers.onlineSet = function (args, msg) {
            var nicks = args.nicks;
            // TODO: clear users
            // TODO: add users
            _this.pushMessage({
                nick: '*',
                text: "Users online: " + nicks.join(", ")
            });
        };
        this.handlers.onlineAdd = function (args, msg) {
            var nick = args.nick;
            // TODO: add user
            if (document.getElementById('joined-left').checked) {
                _this.pushMessage({
                    nick: '*',
                    text: nick + " joined"
                });
            }
        };
        this.handlers.onlineRemove = function (args, msg) {
            var nick = args.nick;
            // TODO: remove user
            if (document.getElementById('joined-left').checked) {
                _this.pushMessage({
                    nick: '*',
                    text: nick + " left"
                });
            }
        };
        this.handlers.captcha = function (args, msg) {
            _this.pushMessage({
                nick: "#",
                text: args.text
            });
        };
    };
    HCWSClient.prototype.socketOpen = function (ev) {
        this.sendJoin();
    };
    HCWSClient.prototype.handleMessageData = function (data, msg) {
        if (typeof (data) !== 'object') {
            return;
        }
        if (this.handlers.hasOwnProperty(data.cmd)) {
            this.handlers[data.cmd](data, msg);
        }
    };
    HCWSClient.prototype.pushMessage = function (args) {
        var _this = this;
        var messageElement = document.createElement('div');
        if (args.text.includes('@' + this.nick + ' ')) {
            messageElement.classList.add('refmessage');
        }
        else {
            messageElement.classList.add('message');
        }
        if (args.nick === this.nick) {
            messageElement.classList.add('me');
        }
        else if (args.nick === '!') {
            messageElement.classList.add('warn');
        }
        else if (args.nick === '*') {
            messageElement.classList.add('info');
        }
        else if (args.admin) {
            messageElement.classList.add('admin');
        }
        else if (args.mod) {
            messageElement.classList.add('mod');
        }
        else if (args.nick === '#') {
            // We decrease the size of the captcha to 4px to make it actually legible
            // because it would wrap otherwise, and be impossible to read
            messageElement.style.fontSize = '4px';
        }
        var nickSpanElement = document.createElement('span');
        nickSpanElement.classList.add('nick');
        messageElement.appendChild(nickSpanElement);
        if (args.trip) {
            var tripElement = document.createElement('span');
            tripElement.textContent = args.trip + " ";
            tripElement.classList.add('trip');
            nickSpanElement.appendChild(tripElement);
        }
        if (args.nick) {
            var nickLinkElement = document.createElement('a');
            nickLinkElement.textContent = args.nick;
            nickLinkElement.addEventListener('click', function () {
                insertAtCursor("@" + args.nick + " ");
                // We don't really need to check for null here because elements shouldn't be 
                // added to the page without a chat input in the first place
                _this.tab.getChatInput().focus();
            });
            var date = new Date(args.time || Date.now());
            nickLinkElement.title = date.toLocaleString();
            nickSpanElement.appendChild(nickLinkElement);
        }
        var textElement = document.createElement('pre');
        textElement.classList.add('text');
        textElement.textContent = args.text || '';
        // TODO: add option to not parse links
        textElement.innerHTML = textElement.innerHTML.replace(/(\?|https?:\/\/)\S+?(?=[,.!?:)]?\s|$)/g, parseLinks);
        if (document.getElementById('syntax-highlight').checked &&
            textElement.textContent.startsWith('```') &&
            textElement.textContent.endsWith('```')) {
            var lang = textElement.textContent.split(/\s+/g)[0].replace('```', '').trim();
            var langLen = lang.length;
            if (lang == '') {
                lang = 'text';
                langLen = 0;
            }
            var codeEl = document.createElement('code');
            codeEl.classList.add(lang);
            var content = textElement.textContent.substr(3 + langLen, textElement.textContent.length - (6 + langLen)).trim();
            codeEl.textContent = content;
            //hljs.highlightBlock(codeEl);
            textElement.innerHTML = '';
            textElement.appendChild(codeEl);
        }
        else if (document.getElementById('parse-latex').checked) {
            // Temporary hotfix for \rule spamming, see https://github.com/Khan/KaTeX/issues/109
            textElement.innerHTML = textElement.innerHTML.replace(/\\rule|\\\\\s*\[.*?\]/g, '');
            try {
                renderMathInElement(textElement, {
                    delimiters: [
                        { left: "$$", right: "$$", display: true },
                        { left: "$", right: "$", display: false },
                    ]
                });
            }
            catch (e) {
                console.warn(e);
            }
        }
        messageElement.appendChild(textElement);
        // Scroll to bottom
        var atBottom = isAtBottom(this.tab.tab);
        this.tab.getMessagesElement().appendChild(messageElement);
        if (atBottom) {
            this.tab.tab.scrollTo(0, this.tab.tab.scrollHeight);
            //window.scrollTo(0, document.body.scrollHeight);
        }
        // TODO: make unread counter
        //unread += 1;
        // TODO: update title function
        //updateTitle();
    };
    HCWSClient.prototype.getFullNick = function () {
        var full = this.nick;
        if (this.pass) {
            full += '#' + this.pass;
        }
        return full;
    };
    HCWSClient.prototype.sendJoin = function () {
        this.sendJSON({
            cmd: 'join',
            nick: this.getFullNick(),
            channel: this.channel
        });
    };
    return HCWSClient;
}(WSClient));
// Tabs
var Tab = /** @class */ (function () {
    function Tab() {
        this.tab = null;
        this.tabButton = null;
    }
    Tab.prototype.constructTab = function () {
        this.tab = document.createElement('div');
        this.tab.classList.add('tab');
        this.tab.classList.add('hidden');
        var article = document.createElement('article');
        article.classList.add('container');
        this.tab.appendChild(article);
        var messages = document.createElement('div');
        messages.classList.add('messages');
        article.appendChild(messages);
        var footer = document.createElement('footer');
        footer.classList.add('footer');
        this.tab.appendChild(footer);
        var chatContainer = document.createElement('div');
        chatContainer.classList.add('container');
        footer.appendChild(chatContainer);
        var chatForm = document.createElement('form');
        chatForm.classList.add('message');
        chatForm.classList.add('chatForm');
        chatContainer.appendChild(chatForm);
        var chatInput = this._constructChatInput(footer, this.tab);
        chatForm.appendChild(chatInput);
    };
    Tab.prototype.constructTabButton = function (buttonName) {
        if (buttonName === void 0) { buttonName = "UNNAMED"; }
        this.tabButton = document.createElement('p');
        this.tabButton.classList.add('tab-button');
        var text = document.createElement('span');
        text.classList.add("tab-button-text");
        text.innerText = buttonName;
        this.tabButton.appendChild(text);
        var closeButton = document.createElement('span');
        closeButton.classList.add('tab-button-close');
        closeButton.innerText = Tab.CLOSE_CHARACTER;
        this.tabButton.appendChild(closeButton);
    };
    Tab.prototype._constructChatInput = function (footer, tab) {
        var _this = this;
        var chatInput = document.createElement('textarea');
        chatInput.setAttribute("type", "text");
        chatInput.setAttribute("autocomplete", "off");
        chatInput.setAttribute("autofocus", "true");
        chatInput.classList.add("chatInput");
        chatInput.addEventListener('keydown', function (e) {
            var target = e.target;
            if (e.keyCode == 13 /* ENTER */ && !e.shiftKey) {
                e.preventDefault();
                // Submit message
                if (target.value != '') {
                    var text = target.value;
                    target.value = '';
                    _this.onSend(text);
                    //lastSent[0] = text;
                    //lastSent.unshift("");
                    //lastSentPos = 0;
                    updateInputSize(chatInput, footer, tab);
                }
            }
            else if (e.keyCode == 38 /* UP */) {
                // Restore previous sent messages
                /*
                if (target.selectionStart === 0 && lastSentPos < lastSent.length - 1) {
                    e.preventDefault();
        
                    if (lastSentPos == 0) {
                        lastSent[0] = target.value;
                    }
        
                    lastSentPos += 1;
                    target.value = lastSent[lastSentPos];
                    target.selectionStart = target.selectionEnd = target.value.length;
        
                    updateInputSize(chatInput, footer, tab);
                }
                */
            }
            else if (e.keyCode == 40 /* DOWN */) {
                /*
                if (target.selectionStart === target.value.length && lastSentPos > 0) {
                    e.preventDefault();
        
                    lastSentPos -= 1;
                    target.value = lastSent[lastSentPos];
                    target.selectionStart = target.selectionEnd = 0;
        
                    updateInputSize(chatInput, footer, tab);
                }
                */
            }
            else if (e.keyCode == 27 /* ESC */) {
                e.preventDefault();
                // Clear input field
                target.value = "";
                //lastSentPos = 0;
                //lastSent[lastSentPos] = "";
                updateInputSize(chatInput, footer, tab);
            }
            else if (e.keyCode == 9 /* TAB */) {
                // Tab complete nicknames starting with @
                e.preventDefault();
                /*
                var pos = target.selectionStart || 0;
                var text = target.value;
                var index = text.lastIndexOf('@', pos);
        
                if (index >= 0) {
                    var stub = text.substring(index + 1, pos).toLowerCase();
                    // Search for nick beginning with stub
                    var nicks = onlineUsers.filter(function (nick) {
                        return nick.toLowerCase().indexOf(stub) == 0;
                    });
        
                    if (nicks.length == 1) {
                        insertAtCursor(nicks[0].substr(stub.length) + " ", chatInput);
                    }
                }
                */
            }
        });
        chatInput.addEventListener("input", function () { return updateInputSize(chatInput, footer, tab); });
        return chatInput;
    };
    Tab.prototype.getChatInput = function () {
        if (this.tab === null) {
            return null;
        }
        return this.tab.querySelector('.chatInput');
    };
    Tab.prototype.getMessagesElement = function () {
        if (this.tab === null) {
            return null;
        }
        return this.tab.querySelector(".messages");
    };
    Tab.prototype.onSend = function (text) { };
    Tab.prototype.addToPage = function (buttonName) {
        if (this.tab === null) {
            this.constructTab();
        }
        if (this.tabButton === null) {
            this.constructTabButton(buttonName);
        }
        document.getElementById("tabs").appendChild(this.tab);
        document.getElementById('tab-list').insertBefore(this.tabButton, document.getElementById('tab-add-button'));
    };
    Tab.prototype.show = function () {
        this.tab.classList.remove("hidden");
        this.tabButton.classList.add("tab-button-selected");
    };
    Tab.prototype.hide = function () {
        this.tab.classList.add("hidden");
        this.tabButton.classList.remove("tab-button-selected");
    };
    Tab.prototype.remove = function () {
        document.getElementById("tabs").removeChild(this.tab);
        document.getElementById("tab-list").removeChild(this.tabButton);
    };
    return Tab;
}());
Tab.CLOSE_CHARACTER = 'x';
var TabManager = {
    tabs: [],
    addTab: function (tab, buttonName) {
        this.tabs.push(tab);
        tab.addToPage(buttonName);
        this.addListeners(tab);
    },
    addListeners: function (tab) {
        tab.tabButton.getElementsByClassName("tab-button-close")[0].addEventListener("click", this.onClickClose(tab));
        tab.tabButton.addEventListener("click", this.onClick(tab));
    },
    onClick: function (tab) {
        return function (ev) {
            TabManager.focusTab(tab);
        };
    },
    onClickClose: function (tab) {
        return function (ev) {
            ev.stopPropagation();
            TabManager.removeTab(tab);
        };
    },
    focusTab: function (tab) {
        TabManager.tabs.forEach(function (tab) { return tab.hide(); });
        tab.show();
    },
    removeTab: function (tab) {
        var index = TabManager.tabs.indexOf(tab);
        if (index === -1) {
            throw new Error("Attempted removal of nonexistant tab.");
        }
        TabManager.tabs.splice(index, 1);
        tab.remove();
    }
};
// Setup the add chat button
document.getElementById("tab-add-button").addEventListener("click", function () {
    var address = prompt("Address:", "wss://hack.chat/chat-ws");
    if (address === '') {
        alert("Nothing is not a valid websocket address.");
        return;
    }
    var type;
    if (address.trim().toLowerCase() === 'wss://hack.chat/chat-ws') {
        type = "HC";
    }
    else {
        type = prompt("What type is this endpoint? Valid: 'HC'", 'HC');
    }
    if (type === "HC") {
        // We want it to ask for the nick/pass/channel itself
        // but we also need to supply the address, in case they're not connecting to 'real' hc
        var client = new HCWSClient(undefined, undefined, undefined, address);
        client.init();
    }
    else {
        alert("'" + type + "' is not a valid endpoint type.");
        return;
    }
});
