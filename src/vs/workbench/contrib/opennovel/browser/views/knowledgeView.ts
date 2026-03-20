/*---------------------------------------------------------------------------------------------
 *  Copyright (c) OpenNovel IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { ViewPane, IViewPaneOptions } from 'vs/workbench/browser/parts/views/viewPane';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IViewDescriptorService, IViewsService } from 'vs/workbench/common/views';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IStorageService } from 'vs/platform/storage/common/storage';

export class KnowledgeView extends ViewPane {

	static readonly ID = 'opennovel.knowledge';
	static readonly TITLE = localize('knowledge', "Knowledge");

	constructor(
		options: IViewPaneOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, viewDescriptorService, contextKeyService, telemetryService, themeService, storageService);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		const knowledgeContainer = document.createElement('div');
		knowledgeContainer.className = 'opennovel-knowledge-view';
		container.appendChild(knowledgeContainer);

		const placeholder = document.createElement('div');
		placeholder.textContent = 'Knowledge base loading...';
		knowledgeContainer.appendChild(placeholder);
	}
}
