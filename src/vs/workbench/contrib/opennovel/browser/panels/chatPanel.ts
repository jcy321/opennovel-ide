/*---------------------------------------------------------------------------------------------
 *  Copyright (c) OpenNovel IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IViewPaneOptions, ViewPane } from 'vs/workbench/browser/parts/views/viewPane';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IOpenNovelService, ChatMessage, CHAT_VIEW_ID } from 'vs/workbench/contrib/opennovel/common/opennovel';
import { $, addDisposableListener, EventType, clearNode } from 'vs/base/browser/dom';
import { DisposableStore } from 'vs/base/common/lifecycle';
import { Emitter, Event } from 'vs/base/common/event';

interface ThinkingState {
	isExpanded: boolean;
	content: string;
}

export class ChatPanel extends ViewPane {
	static readonly ID = CHAT_VIEW_ID;

	private container!: HTMLElement;
	private messagesContainer!: HTMLElement;
	private inputContainer!: HTMLElement;
	private currentBookId: string | null = null;
	private messages: ChatMessage[] = [];
	private thinkingStates: Map<string, ThinkingState> = new Map();
	private readonly disposables = this._register(new DisposableStore());

	private readonly _onDidChangeMessages = this._register(new Emitter<ChatMessage[]>());
	readonly onDidChangeMessages: Event<ChatMessage[]> = this._onDidChangeMessages.event;

	constructor(
		options: IViewPaneOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IOpenNovelService private readonly opennovelService: IOpenNovelService
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);

		this._register(opennovelService.onDidReceiveMessage((message) => {
			this.messages.push(message);
			this.renderMessage(message);
		}));
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		// 创建标签页容器
		const tabContainer = $('.chat-tabs');
		const welcomeTab = $('.chat-tab', { tabindex: '0' }, '欢迎');
		const groupChatTab = $('.chat-tab.active', { tabindex: '0' }, '群聊');
		
		tabContainer.appendChild(welcomeTab);
		tabContainer.appendChild(groupChatTab);
		container.appendChild(tabContainer);

		this.container = $('.chat-panel');
		container.appendChild(this.container);

		this.messagesContainer = $('.chat-messages');
		this.container.appendChild(this.messagesContainer);

		this.inputContainer = $('.chat-input-container');
		this.renderInputArea();
		this.container.appendChild(this.inputContainer);

		this.renderEmptyState();

	// 标签切换事件
		this.disposables.add(addDisposableListener(welcomeTab, EventType.CLICK, () => {
			welcomeTab.classList.add('active');
			groupChatTab.classList.remove('active');
			this.showWelcomePage();
		}));

		this.disposables.add(addDisposableListener(groupChatTab, EventType.CLICK, () => {
			groupChatTab.classList.add('active');
			welcomeTab.classList.remove('active');
			this.showChatPage();
		}));
	}

	private renderEmptyState(): void {
		clearNode(this.messagesContainer);

		if (!this.opennovelService.isConnected) {
			const empty = $('.chat-empty');
			empty.textContent = '请先连接服务器';
			this.messagesContainer.appendChild(empty);
			return;
		}

		if (!this.currentBookId) {
			const empty = $('.chat-empty');
			empty.textContent = '请选择一本书籍开始群聊';
			this.messagesContainer.appendChild(empty);
			return;
		}
	}

	private renderInputArea(): void {
		clearNode(this.inputContainer);

		const inputWrapper = $('.chat-input-wrapper');
		
		const input = $('textarea.chat-input') as HTMLTextAreaElement;
		input.placeholder = '输入消息... (Enter 发送, Shift+Enter 换行)';
		input.rows = 1;
		
		this.disposables.add(addDisposableListener(input, EventType.KEY_DOWN, (e) => {
			const event = e as KeyboardEvent;
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault();
				this.sendMessage(input.value);
				input.value = '';
			}
		}));

		const sendButton = $('button.chat-send-button');
		sendButton.textContent = '发送';
		this.disposables.add(addDisposableListener(sendButton, EventType.CLICK, () => {
			this.sendMessage(input.value);
			input.value = '';
		}));

		inputWrapper.appendChild(input);
		inputWrapper.appendChild(sendButton);
		this.inputContainer.appendChild(inputWrapper);
	}

	private async sendMessage(content: string): Promise<void> {
		if (!content.trim() || !this.currentBookId) return;
		
		await this.opennovelService.sendMessage(this.currentBookId, content);
	}

	setBook(bookId: string): void {
		this.currentBookId = bookId;
		this.messages = [];
		this.thinkingStates.clear();
		clearNode(this.messagesContainer);
		this.renderEmptyState();
	}

	private showWelcomePage(): void {
		clearNode(this.messagesContainer);
		this.inputContainer.style.display = 'none';
		this.renderEmptyState();
	}

	private showChatPage(): void {
		this.inputContainer.style.display = 'flex';
		if (this.currentBookId) {
			this.messages.forEach(msg => this.renderMessage(msg));
		} else {
			this.renderEmptyState();
		}
	}

	private renderMessage(message: ChatMessage): void {
		clearNode(this.messagesContainer);

		const messageEl = $('.chat-message', { 'data-role': 'assistant' });

		const header = $('.chat-message-header');

		const avatar = $('.chat-message-avatar', { 'data-agent': message.agentName });
		avatar.textContent = message.agentName.charAt(0);
		header.appendChild(avatar);

		const name = $('.chat-message-agent-name');
		name.textContent = message.agentName;
		header.appendChild(name);

		const time = $('.chat-message-time');
		time.textContent = new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
		header.appendChild(time);

		messageEl.appendChild(header);

		if (message.thinking) {
			const thinking = this.renderThinking(message.id, message.thinking);
			messageEl.appendChild(thinking);
		}

		const content = $('.chat-message-content');
		content.innerHTML = this.formatMessageContent(message.content);
		messageEl.appendChild(content);

		this.messagesContainer.appendChild(messageEl);
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	private renderThinking(messageId: string, thinking: string): HTMLElement {
		const state = this.thinkingStates.get(messageId) || { isExpanded: false, content: thinking };
		this.thinkingStates.set(messageId, state);

		const thinkingEl = $('.chat-message-thinking');
		if (state.isExpanded) {
			thinkingEl.classList.add('expanded');
		}

		const collapsedText = thinking.length > 50 ? thinking.substring(0, 50) + '...' : thinking;
		thinkingEl.textContent = state.isExpanded ? '💭 思考过程' : `💭 ${collapsedText}`;

		if (state.isExpanded) {
			const contentEl = $('.chat-message-thinking-content');
			contentEl.textContent = thinking;
			thinkingEl.appendChild(contentEl);
		}

		this.disposables.add(addDisposableListener(thinkingEl, EventType.CLICK, () => {
			state.isExpanded = !state.isExpanded;
			this.thinkingStates.set(messageId, state);
			this.refreshMessages();
		}));

		return thinkingEl;
	}

	private formatMessageContent(content: string): string {
		return content
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/\*([^*]+)\*/g, '<em>$1</em>')
			.replace(/\n/g, '<br>');
	}

	private refreshMessages(): void {
		clearNode(this.messagesContainer);
		this.messages.forEach(msg => this.renderMessage(msg));
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
		const inputHeight = 60;
		this.messagesContainer.style.height = `${height - inputHeight}px`;
	}
}