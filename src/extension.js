const vscode = require('vscode');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// let timeout;
let statusBarItem;
let tasklistPanel;
let api = {};

function toAscHex(texto) {
	let txResult = '';
	let letra = '';
	if (texto.length < 0) return '';
	for (let i = 1; i < texto.length + 1; i++) {
		letra = texto.substring(i - 1, i).charCodeAt(0).toString(16);
		letra = '0' + letra;
		letra = letra.substring(letra.length - 2, letra.length).toUpperCase();
		txResult += letra;
	}
	return txResult;
}

function post(route, body) {
	const connection = api.connection()
	const url = `http://${connection.endereco}${route.startsWith('/') ? route : `/${route}`}?`
	const postData = toAscHex(JSON.stringify(body))
	const urlObject = new URL(url)
	console.log(urlObject)
	return new Promise((resolve, reject) => {
		const options = {
			hostname: urlObject.hostname,
			port: urlObject.port || 80,
			path: urlObject.pathname,
			method: 'POST',
			headers: {
				// 'Content-Type': 'application/json',
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(postData)
			}
		};

		const req = http.request(options, (res) => {
			console.log(`STATUS: ${res.statusCode}`);
			console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
			res.setEncoding('utf8');
			res.on('data', (chunk) => {
				console.log(`BODY: ${chunk}`);
			});
			res.on('end', () => {
				console.log('No more data in response.');
			});
			resolve('DONE')
		});

		req.on('error', (e) => {
			console.error(`problem with request: ${e.message}`);
			reject('FAILURE')
		});

		// Write data to request body
		req.write(postData);
		req.end();
	})
	/* return http.post(
		url,
		toAscHex(JSON.stringify(body)),
		undefined,
		{ 'Authorization': api.codigo.autenticacao }
	) */
}

function get(route, query_params) {
	const connection = api.connection()
	let query = ''
	if (Array.isArray(query_params)) {
		query = query_params.join('&')
	}
	if (typeof (query_params) == 'object') {
		query = Object.keys(query_params).map(key => `${key}=${query_params[key]}`).join('&')
	}
	if (typeof (query_params) == 'string') {
		query = query_params
	}
	const final_url = `http://${connection.endereco}${route.startsWith('/') ? route : `/${route}`}?${query == '' ? '' : '&' + query}`
	console.log(final_url)
	return GET(final_url, {})
	// return GET(final_url, { 'Authorization': api.codigo.autenticacao })
}

function configureAPI() {
	try {
		api.set = {}

		api.post = post
		api.get = get
		api.codigo = {}

		api.set.definirEndereco = (ip, porta) => {
			api.codigo.ip = ip
			api.codigo.porta = porta
			api.codigo.endereco = ip + ':' + porta
		}

		api.set.autenticacao = (autenticacao) => {
			api.codigo.autenticacao = autenticacao
		}

		api.generateURL = (route, query_params) => {
			const connection = api.connection()
			let query = ''
			if (Array.isArray(query_params)) {
				query = query_params.join('&')
			}
			if (typeof (query_params) == 'object') {
				query = Object.keys(query_params).map(key => `${key}=${query_params[key]}`).join('&')
			}
			if (typeof (query_params) == 'string') {
				query = query_params
			}
			return (`http://${connection.endereco}${route.startsWith('/') ? route : `/${route}`}?${query == '' ? '' : '&' + query}`)
		}
		api.connection = () => ({
			autenticacao: `&autenticacao=${api.codigo.autenticacao}&numencypt=${Date.now()}`,
			endereco: api.codigo.endereco
		})

		api.login = (usuario, senha, callback) => {
			const xml = `<root>
		<data>${Date.now()}</data>
		<user>${usuario}</user>
		<password>${senha}</password>
		<app>homericoDesktop</app>
	</root>`
			const body = toAscHex(xml);
			const connection = api.connection()
			const url = `http://${connection.endereco}/login.asp?`
			return http.post(url, body, callback,
				{ 'Authorization': api.codigo.autenticacao })
		}
		api.magicLogin = function () {
			return new Promise((resolve, reject) => {
				GET('http://localhost:8881', { AppType: '' }).then(data => {
					let csv = Buffer.from(data, 'base64').toString();
					let arr = csv.split(';');
					this.autenticacao = arr[0]
					this.ip = arr[2].split(':')[0]
					this.porta = arr[2].split(':')[1]
					this.isAuth = true
					this.set.definirEndereco(this.ip, this.porta)
					resolve(true)
				}).catch(err => {
					console.log('Falha Magic Login!', err.message)
					this.isAuth = false
					reject(err)
				})
			})
		}
	} catch (err) {
		console.log('[Sidecar/Error]', err.message)
		console.log(err)
	}
}

function GET(url, headers) {
	return new Promise((resolve, reject) => {
		let provider = null;
		const _url = new URL(url);
		if (url.search('http:') > -1) provider = http
		if (url.search('https:') > -1) provider = https
		const req_configs = {
			method: 'GET',
			hostname: _url.hostname,
			potocol: _url.protocol,
			port: _url.port,
			path: _url.pathname,
			headers: {
				...headers
			}
		}
		console.log('REQ:', req_configs)
		console.log('RAW:', _url)
		console.log(`mounted: ${_url.protocol}//${_url.host}:${_url.port}${_url.pathname}`)
		provider.get(req_configs, (res) => {
			let data = '';
			res.on('data', (chunk) => {
				data += chunk;
			});
			res.on('end', () => {
				// console.log(data);
				resolve(data)
			});
		}).on('error', (err) => {
			console.log("Error: " + err.message);
			reject(err)
		});
	})
}

function POST(url, headers, body) {
	return new Promise((resolve, reject) => {
		const options = {
			method: 'POST',
			headers: headers
		};

		const req = https.request(url, options, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				resolve(data);
			});
		});

		req.on('error', (err) => {
			reject(err);
		});

		req.write(JSON.stringify(body));
		req.end();
	});
}

function loadPanelHTML() {
	const html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8')
	tasklistPanel.webview.html = html
	// tasklistPanel.window.
}

function createTasklistPanel(context) {
	let panel = vscode.window.createWebviewPanel('TasklistPanel', 'Tasklist', vscode.ViewColumn.One, {
		enableScripts: true,
		retainContextWhenHidden: true
	});
	tasklistPanel = panel;
	panel.webview.html = /* html */`Loading...`
	panel.webview.onDidReceiveMessage(message => {
		const eventName = String(message.event).toLowerCase()
		switch (eventName) {
			case 'sign-in':
				console.log(message.username, message.password)
				break;
			case 'debug':
				console.log(message);
				try {
					api.get('/tasklist', {}).then(data => {
						console.log('RESPONSE:', data)
					}).catch(err => {
						console.log(err)
					})
				} catch (err) {
					console.log(err)
				}
				break;
			case 'auth-check':
				panel.webview.postMessage({ event: api.isAuth ? 'auth-success' : 'auth-fail' })
				break;
			case 'add-task':

				break;
			case 'magic-auth':
				console.log('[Sidecar/Auth] Connecting with Magic Auth...')
				api.magicLogin().then(data => {
					if (data == true) {
						vscode.window.showInformationMessage(`Magic Authentication success!`);
						console.log(api)
						panel.webview.postMessage({ event: 'auth-success' })
					} else {
						vscode.window.showInformationMessage(`Magic Authentication failed!`);
					}
				}).catch(err => {
					console.log(err)
					vscode.window.showInformationMessage(`Magic Authentication failed!`);
				})
				break;
			default:
				console.log(`Unknown event "${eventName}" received.`)
		}
	})
	// panel.webview.postMessage({command: 'something', value: 'other value', prop: 'property'})
	panel.onDidDispose(() => {
		// Do any necessary cleanup
	}, undefined, context.subscriptions);
	// context.subscriptions.push(panel);
	loadPanelHTML()

	// panel.webview.postMessage({ test: 'VVVV' });
}

function getSelectedText() {
	let editor = vscode.window.activeTextEditor;
	let selection = editor.selection;
	let text = editor.document.getText(selection);
	return text;
}

function insertText(text) {
	let editor = vscode.window.activeTextEditor;
	editor.edit((editBuilder) => {
		editBuilder.insert(editor.selection.start, text);
	});
}

function insertTextAfterCursorWithBlankLine(text) {
	let editor = vscode.window.activeTextEditor;
	let cursorPosition = editor.selection.active;
	setCursorToEndOfSelection()
	editor.edit((editBuilder) => {
		editBuilder.insert(cursorPosition, '\n' + text);
	});
}

function setCursorToEndOfSelection() {
	let editor = vscode.window.activeTextEditor;
	let endOfSelection = editor.selection.end;
	editor.selection = new vscode.Selection(endOfSelection, endOfSelection);
	editor.revealRange(editor.selection);
}

function wrapString(str, max_length = 100) {
	let wrappedString = "";
	for (let i = 0; i < str.length; i += max_length) {
		let j = i + max_length;
		if (j > str.length) {
			j = str.length;
		}
		let line = str.substring(i, j);
		i = str.lastIndexOf(" ", j);
		wrappedString += line + "\n";
	}
	return wrappedString;
}

function activate(context) {
	console.log('[Sidecar/Activate]')
	configureAPI()
	console.log('Configure Statusbar Item')
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
	statusBarItem.command = 'extension.menuCommand';
	statusBarItem.text = 'Sidecar Status';
	statusBarItem.tooltip = 'Sidecar Status';
	statusBarItem.show();
	console.log('Register Command', 'menuCommand')
	// Register the command
	let disposable = vscode.commands.registerCommand('extension.menuCommand', () => {
		// your code to handle the menu
	});
	context.subscriptions.push(disposable);

	console.log('Register Command', 'tasklistPanel')
	let panelDispo = vscode.commands.registerCommand('extension.tasklistPanel', () => {
		createTasklistPanel(context);
	})
	context.subscriptions.push(panelDispo)

	/* let disposable = vscode.languages.registerCompletionItemProvider('javascript', {
		provideCompletionItems(document, position, token, context) {
			let config = vscode.workspace.getConfiguration('autocompleteWords');
			let words = config.get('words') || [];
			let completionItems = words.map(word => {
				let completionItem = new vscode.CompletionItem(word);
				completionItem.kind = vscode.CompletionItemKind.Text;
				completionItem.insertText = word;
				return completionItem;
			});
			return completionItems;
		}
	});
	context.subscriptions.push(disposable); */
	console.log('Register Command', 'searchAnswer')
	vscode.commands.registerCommand('extension.searchAnswer', function () {
		const config = vscode.workspace.getConfiguration('sidecar')
		const API_KEY = config.get('api_key') || '';
		if (!API_KEY) {
			statusBarItem.hide()
			vscode.window.showInformationMessage(`Warning: "sidecar.api_key" not found on settings.json`);
			return false
		}
		statusBarItem.show()
		statusBarItem.text = 'Searching...'
		let editor = vscode.window.activeTextEditor;
		let selection = editor.selection;
		let currentLine = editor.document.lineAt(selection.start).text;
		let text_selected = getSelectedText()
		// vscode.window.showInformationMessage(currentLine);
		// vscode.window.showInformationMessage(text_selected);
		let body = {
			"model": "text-davinci-003",
			"prompt": "",
			"temperature": 0.7,
			"max_tokens": 4000
		}
		if (text_selected.length > 0) {
			body.prompt = text_selected
		} else {
			body.prompt = currentLine
		}
		body.max_tokens = 4000 - body.prompt.length

		POST('https://api.openai.com/v1/completions', {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + API_KEY
		}, body).then(data => {
			let json = null;
			try {
				json = JSON.parse(data)
			} catch (err) {
				console.log('Error', err)
			}
			console.log(json)
			const choice_zero = json.choices[0] || {}
			insertTextAfterCursorWithBlankLine(choice_zero.text)
			statusBarItem.text = `Done with ${json.choices.length} choice${json.choices.length > 1 ? 's' : ''}`
		}).catch(err => {
			console.log('Error')
			console.log(err)
			insertTextAfterCursorWithBlankLine(err.message)
			statusBarItem.text = 'Failed'
		})
	});

}

exports.activate = activate;