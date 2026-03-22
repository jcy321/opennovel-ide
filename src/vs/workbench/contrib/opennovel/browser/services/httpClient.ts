/*---------------------------------------------------------------------------------------------
 *  Copyright (c) OpenNovel IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { ILogService } from 'vs/platform/log/common/log';

export const IHttpClient = createDecorator<IHttpClient>('opennovelHttpClient');

export interface IHttpClient {
	readonly _serviceBrand: undefined;
	get<T>(url: string): Promise<T>;
	post<T>(url: string, body?: object): Promise<T>;
	put<T>(url: string, body?: object): Promise<T>;
	delete<T>(url: string): Promise<T>;
}

export class HttpClient implements IHttpClient {
	declare readonly _serviceBrand: undefined;

	private readonly timeout = 30000;
	private readonly retries = 2;

	constructor(
		@ILogService private readonly logService: ILogService
	) { }

	async get<T>(url: string): Promise<T> {
		return this.request<T>('GET', url);
	}

	async post<T>(url: string, body?: object): Promise<T> {
		return this.request<T>('POST', url, body);
	}

	async put<T>(url: string, body?: object): Promise<T> {
		return this.request<T>('PUT', url, body);
	}

	async delete<T>(url: string): Promise<T> {
		return this.request<T>('DELETE', url);
	}

	private async request<T>(method: string, url: string, body?: object): Promise<T> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= this.retries; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), this.timeout);

				const response = await fetch(url, {
					method,
					headers: { 'Content-Type': 'application/json' },
					body: body ? JSON.stringify(body) : undefined,
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const text = await response.text();
				if (!text) {
					return {} as T;
				}

				return JSON.parse(text) as T;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				this.logService.warn(`[HttpClient] ${method} ${url} failed (attempt ${attempt + 1}):`, lastError.message);

				if (attempt < this.retries) {
					await this.delay(1000 * (attempt + 1));
				}
			}
		}

		throw lastError || new Error('Request failed');
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}