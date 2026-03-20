/*---------------------------------------------------------------------------------------------
 *  Copyright (c) OpenNovel IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event } from 'vs/base/common/event';

// 服务 ID
export const IOpenNovelService = createDecorator<IOpenNovelService>('opennovelService');

// 后端配置
export const OPENNOVEL_SERVER_URL = 'http://localhost:6688';
export const OPENNOVEL_EXTENSION_ID = 'opennovel.ide';

// View Container ID
export const OPENNOVEL_VIEW_CONTAINER_ID = 'workbench.view.opennovel';
export const KNOWLEDGE_VIEW_CONTAINER_ID = 'workbench.view.opennovel.knowledge';
export const AGENT_VIEW_CONTAINER_ID = 'workbench.view.opennovel.agents';

// View IDs
export const BOOKS_VIEW_ID = 'opennovel.books';
export const KNOWLEDGE_VIEW_ID = 'opennovel.knowledge';
export const AGENT_VIEW_ID = 'opennovel.agents';
export const CHAT_VIEW_ID = 'opennovel.chat';

// Command IDs
export const SHOW_WELCOME_PAGE_COMMAND_ID = 'opennovel.showWelcomePage';
export const REFRESH_BOOKS_COMMAND_ID = 'opennovel.refreshBooks';
export const CREATE_BOOK_COMMAND_ID = 'opennovel.createBook';
export const DELETE_BOOK_COMMAND_ID = 'opennovel.deleteBook';
export const CONNECT_SERVER_COMMAND_ID = 'opennovel.connectServer';

// Context Keys
export const OPENNOVEL_CONNECTED_KEY = 'opennovel.connected';
export const OPENNOVEL_HAS_BOOKS_KEY = 'opennovel.hasBooks';

// ============== 数据类型 ==============

export interface Book {
	id: string;
	name: string;
	status: 'planning' | 'writing' | 'paused' | 'completed';
	stage: string;
	chapterCount: number;
	wordCount: number;
	targetWordCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface Chapter {
	id: string;
	bookId: string;
	title: string;
	order: number;
	status: 'planning' | 'writing' | 'completed';
	wordCount: number;
	filePath: string;
}

export interface Agent {
	id: string;
	name: string;
	role: string;
	status: 'active' | 'idle' | 'locked';
	currentTask?: string;
	color: string;
}

export interface KnowledgeBase {
	type: 'characters' | 'worldview' | 'plot' | 'foreshadowing';
	name: string;
	itemCount: number;
	size: string;
}

export interface ChatMessage {
	id: string;
	agentId: string;
	agentName: string;
	content: string;
	timestamp: string;
	thinking?: string;
}

// ============== 服务接口 ==============

export interface IOpenNovelService {
	readonly _serviceBrand: undefined;

	// 连接状态
	readonly isConnected: boolean;
	readonly onDidChangeConnection: Event<boolean>;

	// 书籍操作
	readonly books: Book[];
	readonly onDidChangeBooks: Event<Book[]>;
	getBooks(): Promise<Book[]>;
	createBook(book: Partial<Book>): Promise<Book>;
	deleteBook(id: string): Promise<void>;

	// 章节操作
	getChapters(bookId: string): Promise<Chapter[]>;
	createChapter(bookId: string, chapter: Partial<Chapter>): Promise<Chapter>;

	// Agent 状态
	readonly agents: Agent[];
	readonly onDidChangeAgents: Event<Agent[]>;
	getAgents(): Promise<Agent[]>;

	// 知识库
	getKnowledgeBase(bookId: string): Promise<KnowledgeBase[]>;

	// 群聊
	readonly messages: ChatMessage[];
	readonly onDidReceiveMessage: Event<ChatMessage>;
	sendMessage(bookId: string, content: string, agentId?: string): Promise<void>;

	// 连接
	connect(serverUrl: string): Promise<boolean>;
	disconnect(): void;
}