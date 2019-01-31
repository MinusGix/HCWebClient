// Sidebar management

if (localStorage.getItem('pin-sidebar') == 'true') {
	(document.getElementById('pin-sidebar') as HTMLInputElement).checked = true;
	document.getElementById('sidebar-content').classList.remove('hidden');
}

function showSidebar (e) {
	document.getElementById('sidebar-content').classList.remove('hidden');
    document.getElementById('sidebar').classList.add('expand');
	e.stopPropagation();
}

function hideSidebar (e) {
	if (!(document.getElementById('pin-sidebar') as HTMLInputElement).checked) {
		document.getElementById('sidebar-content').classList.add('hidden');
        document.getElementById('sidebar').classList.remove('expand');
	}
}

document.getElementById('sidebar').addEventListener('mouseenter', showSidebar);
document.getElementById('sidebar').addEventListener('touchstart', showSidebar, {
	passive: true,
});

document.getElementById('sidebar').addEventListener('mouseleave', hideSidebar);
document.addEventListener('touchstart', hideSidebar, {
	passive: true,
});

document.getElementById('pin-sidebar').addEventListener('change', function (e) {
	localStorage.setItem('pin-sidebar', String(!!(e.target as HTMLInputElement).checked));
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

function isAtBottom(element : HTMLElement) {
	return (window.innerHeight + window.scrollY) >= (element.scrollHeight - 1);
}

function insertAtCursor(text : string, input : HTMLTextAreaElement) {
	var start = input.selectionStart || 0;
	var before = input.value.substr(0, start);
	var after = input.value.substr(start);

	before += text;
	input.value = before + after;
	input.selectionStart = input.selectionEnd = before.length;

	//updateInputSize();
}

function updateInputSize(input: HTMLTextAreaElement, footer: HTMLElement, container: HTMLElement) {
	var atBottom = isAtBottom(input);

	input.style.height = '0';
	input.style.height = input.scrollHeight + 'px';
	container.style.marginBottom = footer.offsetHeight + 'px';

	if (atBottom) {
		window.scrollTo(0, container.scrollHeight);
	}
}

// Client


enum DataType {
	JSON, // We will run JSON.parse on it
	RAW, // We'll leave it as is
}

class WSClient {
	address: string;
	socket: WebSocket;
	bound: {
		open: (ev: Event) => void,
		close: (ev: CloseEvent) => void,
		error: (ev: ErrorEvent) => void,
		message: (ev: MessageEvent) => void,
	};
	dataType: DataType;
	sendDataType: DataType;
	tab: Tab;

	constructor (address: string) {
		this.address = address;
		this.socket = null;

		this.bound = {
			open: null,
			close: null,
			error: null,
			message: null,
		};

		this.dataType = DataType.RAW;
		this.sendDataType = DataType.RAW;

		this.tab = new Tab();

		this.constructBinds();
	}

	constructBinds () {
		this.bound.open = this.socketOpen.bind(this);
		this.bound.close = this.socketClose.bind(this);
		this.bound.error = this.socketError.bind(this);
		this.bound.message = this.socketMessage.bind(this);
	}

	init () : this {
		this.closeSocket();

		this.socket = new WebSocket(this.address);

		this.bindSocket();

		TabManager.addTab(this.tab, this.getTabName());

		return this;
	}

	getTabName () : string {
		return this.address;
	}

	socketOpen (ev: Event) {

	}

	socketError (ev: ErrorEvent) {

	}

	socketClose (ev: CloseEvent) {

	}

	socketMessage (msg: MessageEvent) {
		let data = msg.data;

		if (this.dataType === DataType.JSON) { // JSON
			try {
				let tempData = JSON.parse(data);
				data = tempData;
			} catch (err) {
				throw new Error("Could not stringify data received from server!")
			}
		} else if (this.dataType === DataType.RAW) { // String
			// no-op, but perhaps we should make it convert to string just in case.
		} else {
			throw new Error("Unknown data type of: " + this.dataType);
		}

		this.handleMessageData(data, msg);
	}

	closeSocket () {
		if (this.socket !== null) {
			// Unbind the socket so it won't try to rejoin or anything when we close it
			this.unbindSocket();
			this.socket.close(0);
		}
	}

	bindSocket () {
		this.socket.addEventListener("open", this.bound.open);
		this.socket.addEventListener("close", this.bound.close);
		this.socket.addEventListener("error", this.bound.error);
		this.socket.addEventListener("message", this.bound.message);
	}

	unbindSocket () {
		this.socket.removeEventListener("open", this.bound.open);
		this.socket.removeEventListener("close", this.bound.close);
		this.socket.removeEventListener("error", this.bound.error);
		this.socket.removeEventListener("message", this.bound.message);
	}

	handleMessageData (data: any, msg: MessageEvent) {
		console.log(this, 'received', data);
	}

	send (data: any) {
		if (this.socket instanceof WebSocket && this.socket.readyState === WebSocket.OPEN) {
			if (this.sendDataType === DataType.JSON) {
				this.sendJSON(data);
			} else if (this.sendDataType === DataType.RAW) {
				this.socket.send(data);
			} else {
				throw new Error("Unknown send data type");
			}
		} else {
			console.warn("Attempted to send data", data, "before socket was ready.", this);
		}
	}

	sendJSON (data: object) {
		this.socket.send(JSON.stringify(data));
	}
}

class HCWSClient extends WSClient {
	nick: string;
	pass: string;
	channel: string;

	handlers: {
		[propName: string]: (data: object, msg: MessageEvent) => void;
	};

	constructor (nick: string = null, pass: string = null, channel: string = null, address="wss://hack.chat/chat-ws") {
		super(address);

		this.dataType = DataType.JSON;
		this.sendDataType = DataType.JSON;

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

		this.nick = nick;
		this.pass = pass;
		this.channel = channel;

		this.tab.onSend = (text: string) => {
			this.sendJSON({
				cmd: 'chat',
				text: text,
			});
		};

		this.handlers = {};

		this.setupHandlers();
	}

	setupHandlers () {
		this.handlers.chat = (args, msg) => {
			this.pushMessage(args);
		};

		this.handlers.info = (args, msg) => {
			args.nick = '*';

			this.pushMessage(args);
		};

		this.handlers.warn = (args, msg) => {
			args.nick = '!';

			this.pushMessage(args);
		};

		this.handlers.onlineSet = (args, msg) => {
			let nicks = args.nicks;

			// TODO: clear users
			// TODO: add users

			this.pushMessage({
				nick: '*',
				text: "Users online: " + nicks.join(", ")
			});
		};

		this.handlers.onlineAdd = (args, msg) => {
			let nick = args.nick;

			// TODO: add user

			if ((document.getElementById('joined-left') as HTMLInputElement).checked) {
				this.pushMessage({
					nick: '*',
					text: nick + " joined"
				});
			}
		};

		this.handlers.onlineRemove = (args, msg) => {
			let nick = args.nick;

			// TODO: remove user

			if ((document.getElementById('joined-left') as HTMLInputElement).checked) {
				this.pushMessage({
					nick: '*',
					text: nick + " left"
				});
			}
		};

		this.handlers.captcha = (args, msg) => {
			this.pushMessage({
				nick: "#",
				text: args.text
			});
		};
	}

	socketOpen (ev: Event) {
		this.sendJoin();
	}

	handleMessageData (data: any, msg: MessageEvent) {
		if (typeof(data) !== 'object') {
			return;
		}

		if (this.handlers.hasOwnProperty(data.cmd)) {
			this.handlers[data.cmd](data, msg);
		}
	}

	pushMessage (args) {
		let messageElement = document.createElement('div');

		if (args.text.includes('@' + this.nick + ' ')) {
			messageElement.classList.add('refmessage');
		} else {
			messageElement.classList.add('message');
		}

		if (args.nick === this.nick) {
			messageElement.classList.add('me');
		} else if (args.nick === '!') {
			messageElement.classList.add('warn');
		} else if (args.nick === '*') {
			messageElement.classList.add('info');
		} else if (args.admin) {
			messageElement.classList.add('admin');
		} else if (args.mod) {
			messageElement.classList.add('mod');
		} else if (args.nick === '#') {
			// We decrease the size of the captcha to 4px to make it actually legible
			// because it would wrap otherwise, and be impossible to read
			messageElement.style.fontSize = '4px';
		}

		let nickSpanElement = document.createElement('span');
		nickSpanElement.classList.add('nick');
		messageElement.appendChild(nickSpanElement);

		if (args.trip) {
			let tripElement = document.createElement('span');
			tripElement.textContent = args.trip + " ";
			tripElement.classList.add('trip');
			nickSpanElement.appendChild(tripElement);
		}

		if (args.nick) {
			let nickLinkElement = document.createElement('a');
			nickLinkElement.textContent = args.nick;

			nickLinkElement.addEventListener('click', () => {
				insertAtCursor("@" + args.nick + " ");
				// We don't really need to check for null here because elements shouldn't be 
				// added to the page without a chat input in the first place
				this.tab.getChatInput().focus();
			});

			let date = new Date(args.time || Date.now());
			nickLinkElement.title = date.toLocaleString();
			nickSpanElement.appendChild(nickLinkElement);
		}

		let textElement = document.createElement('pre');
		textElement.classList.add('text');
		textElement.textContent = args.text || '';
		// TODO: add option to not parse links
		textElement.innerHTML = textElement.innerHTML.replace(/(\?|https?:\/\/)\S+?(?=[,.!?:)]?\s|$)/g, parseLinks);

		if (
			(document.getElementById('syntax-highlight') as HTMLInputElement).checked &&
			textElement.textContent.startsWith('```') &&
			textElement.textContent.endsWith('```')
		) {
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
		} else if ((document.getElementById('parse-latex') as HTMLInputElement).checked) {
			// Temporary hotfix for \rule spamming, see https://github.com/Khan/KaTeX/issues/109
			textElement.innerHTML = textElement.innerHTML.replace(/\\rule|\\\\\s*\[.*?\]/g, '');
			try {
				renderMathInElement(textElement, {
					delimiters: [
						{ left: "$$", right: "$$", display: true },
						{ left: "$", right: "$", display: false },
					]
				})
			} catch (e) {
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
	}

	getFullNick () : string {
		let full = this.nick;

		if (this.pass) {
			full += '#' + this.pass;
		}

		return full;
	}

	sendJoin () {
		this.sendJSON({
			cmd: 'join',
			nick: this.getFullNick(),
			channel: this.channel,
		});
	}
}


// Tabs
class Tab {
	static CLOSE_CHARACTER: string;
	tab: HTMLElement;
	tabButton: HTMLElement;

	constructor () {
		this.tab = null;
		this.tabButton = null;
	}

	constructTab () {
		this.tab = document.createElement('div');
		this.tab.classList.add('tab');
		this.tab.classList.add('hidden');

		let article = document.createElement('article');
		article.classList.add('container');
		this.tab.appendChild(article);

		let messages = document.createElement('div');
		messages.classList.add('messages');
		article.appendChild(messages);
		
		
		let footer = document.createElement('footer');
		footer.classList.add('footer');
		this.tab.appendChild(footer);

		let chatContainer = document.createElement('div');
		chatContainer.classList.add('container');
		footer.appendChild(chatContainer);

		let chatForm = document.createElement('form');
		chatForm.classList.add('message');
		chatForm.classList.add('chatForm');
		chatContainer.appendChild(chatForm);

		let chatInput = this._constructChatInput(footer, this.tab);
		chatForm.appendChild(chatInput);
	}

	constructTabButton (buttonName="UNNAMED") {
		this.tabButton = document.createElement('p');
		this.tabButton.classList.add('tab-button');

		let text = document.createElement('span');
		text.classList.add("tab-button-text");
		text.innerText = buttonName;
		this.tabButton.appendChild(text);

		let closeButton = document.createElement('span');
		closeButton.classList.add('tab-button-close');
		closeButton.innerText = Tab.CLOSE_CHARACTER;
		this.tabButton.appendChild(closeButton);
	}

	_constructChatInput (footer: HTMLElement, tab: HTMLElement) : HTMLTextAreaElement {
		let chatInput = document.createElement('textarea');
		chatInput.setAttribute("type", "text");
		chatInput.setAttribute("autocomplete", "off");
		chatInput.setAttribute("autofocus", "true");
		chatInput.classList.add("chatInput");

		chatInput.addEventListener('keydown', (e) => {
			let target = e.target as HTMLTextAreaElement;
			if (e.keyCode == 13 /* ENTER */ && !e.shiftKey) {
				e.preventDefault();
				
				// Submit message
				if (target.value != '') {
					var text = target.value;
					target.value = '';
					
					this.onSend(text);
		
					//lastSent[0] = text;
					//lastSent.unshift("");
					//lastSentPos = 0;
		
					updateInputSize(chatInput, footer, tab);
				}
			} else if (e.keyCode == 38 /* UP */) {
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
			} else if (e.keyCode == 40 /* DOWN */) {
				/*
				if (target.selectionStart === target.value.length && lastSentPos > 0) {
					e.preventDefault();
		
					lastSentPos -= 1;
					target.value = lastSent[lastSentPos];
					target.selectionStart = target.selectionEnd = 0;
		
					updateInputSize(chatInput, footer, tab);
				}
				*/
			} else if (e.keyCode == 27 /* ESC */) {
				e.preventDefault();
		
				// Clear input field
				target.value = "";
				//lastSentPos = 0;
				//lastSent[lastSentPos] = "";
		
				updateInputSize(chatInput, footer, tab);
			} else if (e.keyCode == 9 /* TAB */) {
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

		chatInput.addEventListener("input", () => updateInputSize(chatInput, footer, tab));

		return chatInput;
	}

	getChatInput () : HTMLTextAreaElement {
		if (this.tab === null) {
			return null;
		}

		return this.tab.querySelector('.chatInput') as HTMLTextAreaElement;
	}

	getMessagesElement () : HTMLDivElement {
		if (this.tab === null) {
			return null;
		}

		return this.tab.querySelector(".messages") as HTMLDivElement;
	}

	onSend (text: string) {}

	addToPage (buttonName?: string) {
		if (this.tab === null) {
			this.constructTab();
		}

		if (this.tabButton === null) {
			this.constructTabButton(buttonName);
		}

		document.getElementById("tabs").appendChild(this.tab);
		document.getElementById('tab-list').insertBefore(this.tabButton, document.getElementById('tab-add-button'));
	}

	show () {
		this.tab.classList.remove("hidden");
		this.tabButton.classList.add("tab-button-selected");
	}

	hide () {
		this.tab.classList.add("hidden");
		this.tabButton.classList.remove("tab-button-selected");
	}

	remove () {
		document.getElementById("tabs").removeChild(this.tab);
		document.getElementById("tab-list").removeChild(this.tabButton);
	}
}
Tab.CLOSE_CHARACTER = 'x';

interface ITabManager {
	tabs: Tab[],
	addTab: (tab: Tab, buttonName?: string) => void;
	addListeners: (tab: Tab) => void;

	focusTab: (tab: Tab) => void;
	removeTab: (tab: Tab) => void;

	onClick: (tab: Tab) => (ev: MouseEvent) => void;
	onClickClose: (tab: Tab) => (ev: MouseEvent) => void;
}

let TabManager : ITabManager = {
	tabs: [],

	addTab (tab: Tab, buttonName?: string) {
		this.tabs.push(tab);

		tab.addToPage(buttonName);
		this.addListeners(tab);
	},

	addListeners (tab: Tab) {
		tab.tabButton.getElementsByClassName("tab-button-close")[0].addEventListener("click", this.onClickClose(tab));
		tab.tabButton.addEventListener("click", this.onClick(tab));
	},

	onClick (tab: Tab) : (ev: MouseEvent) => void {
		return function (ev: MouseEvent) {
			TabManager.focusTab(tab);
		};
	},

	onClickClose (tab: Tab) : (ev: MouseEvent) => void {
		return function (ev: MouseEvent) {
			ev.stopPropagation();

			TabManager.removeTab(tab);
		};
	},

	focusTab (tab: Tab) {
		TabManager.tabs.forEach(tab => tab.hide());

		tab.show();
	},

	removeTab (tab: Tab) {
		let index = TabManager.tabs.indexOf(tab);

		if (index === -1) {
			throw new Error("Attempted removal of nonexistant tab.");
		}

		TabManager.tabs.splice(index, 1);
		tab.remove();
	}
};

// Setup the add chat button
document.getElementById("tab-add-button").addEventListener("click", () => {
	let address = prompt("Address:", "wss://hack.chat/chat-ws");

	if (address === '') {
		alert("Nothing is not a valid websocket address.");
		return;
	}

	let type : string;
	if (address.trim().toLowerCase() === 'wss://hack.chat/chat-ws') {
		type = "HC";
	} else {
		type = prompt("What type is this endpoint? Valid: 'HC'", 'HC');
	}

	if (type === "HC") {
		// We want it to ask for the nick/pass/channel itself
		// but we also need to supply the address, in case they're not connecting to 'real' hc
		let client = new HCWSClient(undefined, undefined, undefined, address);
		client.init();
	} else {
		alert("'" + type + "' is not a valid endpoint type.");
		return;
	}
});