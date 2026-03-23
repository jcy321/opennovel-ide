/*---------------------------------------------------------------------------------------------
 *  Copyright (c) OpenNovel IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/base/common/event';
import { Disposable } from 'vs/base/common/lifecycle';
import { IOpenNovelService, Book, Chapter, Agent, KnowledgeBase, ChatMessage, OPENNOVEL_SERVER_URL } from 'vs/workbench/contrib/opennovel/common/opennovel';
import { ILogService } from 'vs/platform/log/common/log';
import { IHttpClient } from 'vs/workbench/contrib/opennovel/browser/services/httpClient';

interface HealthResponse {
	status: string;
}

interface BooksResponse {
	books: Book[];
}

interface AgentsResponse {
	agents: Agent[];
}

interface ChaptersResponse {
	chapters: Chapter[];
}

interface KnowledgeResponse {
	knowledgeBases: KnowledgeBase[];
}

export class OpenNovelService extends Disposable implements IOpenNovelService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeConnection = this._register(new Emitter<boolean>());
	readonly onDidChangeConnection: Event<boolean> = this._onDidChangeConnection.event;

	private readonly _onDidChangeBooks = this._register(new Emitter<Book[]>());
	readonly onDidChangeBooks: Event<Book[]> = this._onDidChangeBooks.event;

	private readonly _onDidChangeAgents = this._register(new Emitter<Agent[]>());
	readonly onDidChangeAgents: Event<Agent[]> = this._onDidChangeAgents.event;

	private readonly _onDidReceiveMessage = this._register(new Emitter<ChatMessage>());
	readonly onDidReceiveMessage: Event<ChatMessage> = this._onDidReceiveMessage.event;

	private _isConnected: boolean = false;
	private _serverUrl: string = OPENNOVEL_SERVER_URL;
	private _books: Book[] = [];
	private _agents: Agent[] = [];
	private _messages: ChatMessage[] = [];
	private _eventSource: EventSource | null = null;

	get isConnected(): boolean { return this._isConnected; }
	get books(): Book[] { return this._books; }
	get agents(): Agent[] { return this._agents; }
	get messages(): ChatMessage[] { return this._messages; }

	constructor(
		@ILogService private readonly logService: ILogService,
		@IHttpClient private readonly httpClient: IHttpClient
	) {
		super();
		this.autoConnect();
	}

	private async autoConnect(): Promise<void> {
		try {
			await this.connect(this._serverUrl);
		} catch {
			this.logService.info('[OpenNovel] Auto-connect failed, user must connect manually');
		}
	}

	async connect(serverUrl: string): Promise<boolean> {
		this._serverUrl = serverUrl;
		const healthUrl = `${serverUrl}/api/health`;

		this.logService.info('[OpenNovel] ========== CONNECT START ==========');
		this.logService.info('[OpenNovel] Server URL:', serverUrl);
		this.logService.info('[OpenNovel] Health check URL:', healthUrl);

		try {
			this.logService.info('[OpenNovel] Calling httpClient.get...');
			const response = await this.httpClient.get<HealthResponse>(healthUrl);
			this.logService.info('[OpenNovel] Health response received:', JSON.stringify(response));

			if (response.status === 'ok' || response) {
				this._isConnected = true;
				this._onDidChangeConnection.fire(true);
				this.logService.info('[OpenNovel] Connected to server:', serverUrl);

				await Promise.all([
					this.getBooks(),
					this.getAgents()
				]);

				this.setupSSE();
				this.logService.info('[OpenNovel] ========== CONNECT SUCCESS ==========');
				return true;
			}
		} catch (e) {
			const error = e instanceof Error ? e : new Error(String(e));
			this.logService.error('[OpenNovel] ========== CONNECT FAILED ==========');
			this.logService.error('[OpenNovel] Error message:', error.message);
			this.logService.error('[OpenNovel] Error stack:', error.stack || 'no stack');
			this.logService.error('[OpenNovel] Server URL was:', serverUrl);
		}

		this._isConnected = false;
		this._onDidChangeConnection.fire(false);
		return false;
	}

	disconnect(): void {
		this._isConnected = false;
		if (this._eventSource) {
			this._eventSource.close();
			this._eventSource = null;
		}
		this._onDidChangeConnection.fire(false);
	}

	private setupSSE(): void {
		if (this._eventSource) {
			this._eventSource.close();
		}

		this._eventSource = new EventSource(`${this._serverUrl}/api/chat/stream`);

		this._eventSource.onmessage = (event) => {
			try {
				const message: ChatMessage = JSON.parse(event.data);
				this._messages.push(message);
				this._onDidReceiveMessage.fire(message);
			} catch (e) {
				this.logService.error('[OpenNovel] Failed to parse SSE message:', e);
			}
		};

		this._eventSource.onerror = () => {
			this.logService.error('[OpenNovel] SSE connection error');
		};
	}

	async getBooks(): Promise<Book[]> {
		try {
			const response = await this.httpClient.get<BooksResponse>(`${this._serverUrl}/api/books`);
			this._books = response.books || [];
			this._onDidChangeBooks.fire(this._books);
			return this._books;
		} catch (e) {
			this.logService.error('[OpenNovel] Failed to get books:', e);
		}
		return [];
	}

	async createBook(book: Partial<Book>): Promise<Book> {
		const newBook = await this.httpClient.post<Book>(`${this._serverUrl}/api/books`, book);
		await this.getBooks();
		return newBook;
	}

	async deleteBook(id: string): Promise<void> {
		await this.httpClient.delete(`${this._serverUrl}/api/books/${id}`);
		await this.getBooks();
	}

	async getChapters(bookId: string): Promise<Chapter[]> {
		try {
			const response = await this.httpClient.get<ChaptersResponse>(`${this._serverUrl}/api/books/${bookId}/chapters`);
			return response.chapters || [];
		} catch (e) {
			this.logService.error('[OpenNovel] Failed to get chapters:', e);
		}
		return [];
	}

	async createChapter(bookId: string, chapter: Partial<Chapter>): Promise<Chapter> {
		return this.httpClient.post<Chapter>(`${this._serverUrl}/api/books/${bookId}/chapters`, chapter);
	}

	async getAgents(): Promise<Agent[]> {
		try {
			const response = await this.httpClient.get<AgentsResponse>(`${this._serverUrl}/api/agents/status`);
			this._agents = response.agents || [];
			this._onDidChangeAgents.fire(this._agents);
			return this._agents;
		} catch (e) {
			this.logService.error('[OpenNovel] Failed to get agents:', e);
		}
		return [];
	}

	async getKnowledgeBase(bookId: string): Promise<KnowledgeBase[]> {
		try {
			const response = await this.httpClient.get<KnowledgeResponse>(`${this._serverUrl}/api/books/${bookId}/knowledge`);
			return response.knowledgeBases || [];
		} catch (e) {
			this.logService.error('[OpenNovel] Failed to get knowledge base:', e);
		}
		return [];
	}

	async sendMessage(bookId: string, content: string, agentId?: string): Promise<void> {
		await this.httpClient.post(`${this._serverUrl}/api/chat/messages`, { bookId, content, agentId });
	}
}