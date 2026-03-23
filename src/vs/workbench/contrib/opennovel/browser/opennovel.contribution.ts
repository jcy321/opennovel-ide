/*---------------------------------------------------------------------------------------------
 *  Copyright (c) OpenNovel IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { IViewContainersRegistry, IViewsRegistry, ViewContainerLocation, Extensions as ViewExtensions } from 'vs/workbench/common/views';
import { ViewPaneContainer } from 'vs/workbench/browser/parts/views/viewPaneContainer';
import { IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions, IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { LifecyclePhase } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Codicon } from 'vs/base/common/codicons';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { MenuId, registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IOpenNovelService, OPENNOVEL_VIEW_CONTAINER_ID, BOOKS_VIEW_ID, KNOWLEDGE_VIEW_ID, AGENT_VIEW_ID, CHAT_VIEW_ID, CONNECT_SERVER_COMMAND_ID, OPENNOVEL_SERVER_URL } from 'vs/workbench/contrib/opennovel/common/opennovel';
import { OpenNovelService } from 'vs/workbench/contrib/opennovel/browser/services/opennovelService';
import { IHttpClient, HttpClient } from 'vs/workbench/contrib/opennovel/browser/services/httpClient';
import { IOpenNovelMainService, OpenNovelMainService } from 'vs/workbench/contrib/opennovel/browser/services/opennovelMainService';
import { OpenNovelStatus } from 'vs/workbench/contrib/opennovel/browser/statusbar/opennovelStatus';
import { BookExplorerView } from 'vs/workbench/contrib/opennovel/browser/views/bookExplorerView';
import { KnowledgeView } from 'vs/workbench/contrib/opennovel/browser/views/knowledgeView';
import { AgentStatusView } from 'vs/workbench/contrib/opennovel/browser/views/agentStatusView';
import { ChatPanel } from 'vs/workbench/contrib/opennovel/browser/panels/chatPanel';
import { registerSingleton, InstantiationType } from 'vs/platform/instantiation/common/extensions';

registerSingleton(IHttpClient, HttpClient, InstantiationType.Delayed);
registerSingleton(IOpenNovelMainService, OpenNovelMainService, InstantiationType.Delayed);
registerSingleton(IOpenNovelService, OpenNovelService, InstantiationType.Delayed);

const openNovelViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: OPENNOVEL_VIEW_CONTAINER_ID,
	title: { value: localize('opennovel', "OpenNovel"), original: 'OpenNovel' },
	icon: Codicon.book,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [OPENNOVEL_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: false }]),
	storageId: OPENNOVEL_VIEW_CONTAINER_ID,
	hideIfEmpty: false,
	order: 0,
}, ViewContainerLocation.Sidebar, { doNotRegisterOpenCommand: false });

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([
	{
		id: BOOKS_VIEW_ID,
		name: { value: localize('books', "Books"), original: 'Books' },
		containerIcon: Codicon.book,
		ctorDescriptor: new SyncDescriptor(BookExplorerView),
		order: 1
	},
	{
		id: KNOWLEDGE_VIEW_ID,
		name: { value: localize('knowledge', "Knowledge"), original: 'Knowledge' },
		containerIcon: Codicon.database,
		ctorDescriptor: new SyncDescriptor(KnowledgeView),
		order: 2
	},
	{
		id: AGENT_VIEW_ID,
		name: { value: localize('agents', "Agents"), original: 'Agents' },
		containerIcon: Codicon.robot,
		ctorDescriptor: new SyncDescriptor(AgentStatusView),
		order: 3
	},
	{
		id: CHAT_VIEW_ID,
		name: { value: localize('chat', "Chat"), original: 'Chat' },
		containerIcon: Codicon.commentDiscussion,
		ctorDescriptor: new SyncDescriptor(ChatPanel),
		order: 4
	}
], openNovelViewContainer);

registerAction2(class ConnectServerAction extends Action2 {
	constructor() {
		super({
			id: CONNECT_SERVER_COMMAND_ID,
			title: { value: localize('connectServer', "Connect to Server"), original: 'Connect to Server' },
			category: { value: localize('opennovel', "OpenNovel"), original: 'OpenNovel' },
			f1: true,
			icon: Codicon.plug,
			menu: [{
				id: MenuId.ViewTitle,
				group: 'navigation',
				when: ContextKeyExpr.equals('view', BOOKS_VIEW_ID),
				order: 1
			}]
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const opennovelService = accessor.get(IOpenNovelService);
		const dialogService = accessor.get(IDialogService);
		const notificationService = accessor.get(INotificationService);

		const result = await dialogService.input({
			title: localize('connectServerTitle', "Connect to OpenNovel Server"),
			message: localize('connectServerMessage', "Enter the OpenNovel backend server address"),
			inputs: [{
				type: 'text',
				value: OPENNOVEL_SERVER_URL,
				placeholder: 'http://localhost:6688'
			}],
			primaryButton: localize('connectButton', "Connect")
		});

		if (!result.confirmed || !result.values?.[0]) {
			return;
		}

		const serverUrl = result.values[0].trim();

		notificationService.prompt(
			Severity.Info,
			localize('connecting', "Connecting to {0}...", serverUrl),
			[]
		);

		const success = await opennovelService.connect(serverUrl);

		if (success) {
			notificationService.prompt(
				Severity.Info,
				localize('connectSuccess', "Successfully connected to OpenNovel server"),
				[]
			);
		} else {
			notificationService.prompt(
				Severity.Error,
				localize('connectFailed', "Connection failed. Please check the server address or ensure the backend is running."),
				[]
			);
		}
	}
});

class OpenNovelContribution implements IWorkbenchContribution {
	constructor(
		@IOpenNovelService opennovelService: IOpenNovelService
	) {
		console.log('[OpenNovel IDE] Contribution loaded, connected:', opennovelService.isConnected);
	}
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(OpenNovelContribution, LifecyclePhase.Restored);

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(OpenNovelStatus, LifecyclePhase.Restored);